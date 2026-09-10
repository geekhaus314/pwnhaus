import { corsHeaders, handleOptions } from '../../shared/cors';
import { getClientIp, rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Booking ingestion service (#30).
 *
 * Pipeline: POST /api/booking
 *   1. strict rate limit (5/10min/IP — Resend costs money)
 *   2. input validation (mirrors the SvelteKit endpoint contract so #31
 *      can point the form here without changing field shapes)
 *   3. Turnstile server-side verify — FAIL CLOSED (unconfigured => 503;
 *      a bad token => 403). Set TURNSTILE_SECRET_KEY via `wrangler secret put`.
 *   4. D1 row `bookings_log` (status='queued') for the ledger
 *   5. message onto the `pwn4g3-booking` queue; 202 back to the client
 *
 * Queue consumer sends via Resend with retry semantics:
 *   2xx            -> row status='sent'
 *   429 / 5xx      -> throw (queue redelivers, max_retries 3 -> DLQ)
 *   other 4xx      -> row status='failed', message acked (retry would be pointless)
 *   missing secret -> row status='failed', acked
 *
 * Client privacy: client_ip is stored once in D1 for abuse forensics and
 * is NOT propagated through the queue message or the email.
 */

interface Env {
	DB: D1Database;
	BOOKING_QUEUE: Queue<BookingMessage>;
	TURNSTILE_SECRET_KEY?: string;
	TURNSTILE_SITE_KEY?: string;
	TURNSTILE_HOSTNAMES?: string;
	RESEND_API_KEY?: string;
	BOOKING_EMAIL: string;
	BOOKING_FROM: string;
}

interface BookingMessage {
	id: string;
	name: string;
	email: string;
	service: string | null;
	timeline: string | null;
	details: string;
	createdAt: number;
}

interface TurnstileResult {
	success: boolean;
	hostname?: string;
	action?: string;
	challenge_ts?: string;
	'error-codes'?: string[];
}

const MAX_BODY_BYTES = 16 * 1024;
const MAX_SERVICE_LEN = 120;
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254;
const MAX_DETAILS_LEN = 5_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const METHODS = 'GET, OPTIONS, POST';

interface BookingFields {
	name: string;
	email: string;
	service: string | null;
	timeline: string | null;
	details: string;
	turnstileToken: string | null;
}

const ok = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

const fail = (error: string, status = 400, extra: Record<string, string> = {}): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS), ...extra }
	});

const utf8ByteLen = (s: string): number => new TextEncoder().encode(s).length;

const bounded = (value: unknown, max: number, fallback: string | null | undefined = null): string | null | undefined => {
	if (value === undefined || value === null || value === '') return fallback;
	if (typeof value !== 'string') return undefined;
	return value.length > max ? undefined : value;
};

const EXPECTED_ACTION = 'booking';

const turnstileHostnames = (env: Env): Set<string> =>
	new Set(
		(env.TURNSTILE_HOSTNAMES ?? '')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean)
	);

const verifyTurnstile = async (secret: string, token: string, ip: string): Promise<TurnstileResult> => {
	const form = new FormData();
	form.set('secret', secret);
	form.set('response', token);
	if (ip !== 'unknown') form.set('remoteip', ip);
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body: form,
		signal: AbortSignal.timeout(10_000)
	});
	if (!res.ok) return { success: false, 'error-codes': [`siteverify_http_${res.status}`] };
	return (await res.json()) as TurnstileResult;
};

const buildEmailBody = (b: Pick<BookingFields, 'name' | 'email' | 'service' | 'timeline' | 'details'>): string =>
	[
		`Name: ${b.name}`,
		`Email: ${b.email}`,
		`Service: ${b.service ?? 'Not specified'}`,
		`Timeline: ${b.timeline ?? 'Not specified'}`,
		'',
		'Details:',
		b.details
	].join('\n');

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/booking') {
			// Form helper endpoint: capability probe + post-submit status lookup.
			if (request.method === 'GET') {
				const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'booking-info' }, 'booking-info');
				if (limited) return limited;

				const id = url.searchParams.get('id');
				if (id) {
					// 128-bit UUID — only the submitter ever receives it; response
					// carries no PII beyond pipeline state.
					const row = await env.DB.prepare('SELECT status, attempts FROM bookings_log WHERE id = ?')
						.bind(id)
						.first<{ status: string; attempts: number }>();
					if (!row) return fail('unknown_booking', 404);
					return ok({ id, status: row.status, attempts: row.attempts });
				}

				return ok({
					service: 'pwn4g3-booking',
					ingest: 'POST /api/booking',
					envelope: '{ name: string, email: string, details: string, service?: string, timeline?: string, turnstileToken?: string }',
					statusLookup: 'GET /api/booking?id=<uuid>',
					limits: { postPer10MinPerIp: 5, maxBodyBytes: MAX_BODY_BYTES },
					turnstile: {
						required: Boolean(env.TURNSTILE_SECRET_KEY),
						siteKey: env.TURNSTILE_SITE_KEY ?? null,
						action: EXPECTED_ACTION,
						hostnames: env.TURNSTILE_HOSTNAMES?.split(',').map((h) => h.trim()).filter(Boolean) ?? []
					},
					note: 'Internal service, reached via the pwn4g3 gateway.'
				});
			}

			if (request.method !== 'POST') return fail('method_not_allowed', 405);

			// Money route: tightest bucket in the fleet (5 / 10 min / IP).
			const limited = rateLimitOr429(request, { limit: 5, windowMs: 600_000, prefix: 'booking-ingest' }, 'booking-ingest');
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) return fail('payload_too_large', 413);

			let body: Record<string, unknown>;
			try {
				body = (await request.json()) as Record<string, unknown>;
			} catch {
				return fail('invalid_json', 400);
			}

			const name = typeof body.name === 'string' && body.name.length > 0 && body.name.length <= MAX_NAME_LEN ? body.name : undefined;
			const email = typeof body.email === 'string' && body.email.length <= MAX_EMAIL_LEN && EMAIL_RE.test(body.email) ? body.email : undefined;
			const details = typeof body.details === 'string' && body.details.length > 0 && body.details.length <= MAX_DETAILS_LEN ? body.details : undefined;
			const service = bounded(body.service, MAX_SERVICE_LEN);
			const timeline = bounded(body.timeline, MAX_SERVICE_LEN);
			const turnstileToken = bounded(body.turnstileToken, 2_048, '') ?? null;

			if (!name || !email || !details) {
				return fail('name_email_details_required', 422);
			}
			if (service === undefined || timeline === undefined) return fail('input_too_long', 422);

			// Fail closed: without a server-side secret the pipeline must not accept
			// mail submissions — otherwise the queue becomes a spam amplifier.
			if (!env.TURNSTILE_SECRET_KEY) return fail('turnstile_not_configured', 503);
			if (turnstileHostnames(env).size === 0) return fail('turnstile_not_configured', 503);
			if (!turnstileToken) return fail('turnstile_token_required', 403);
			let turnstile: TurnstileResult;
			try {
				turnstile = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, getClientIp(request));
			} catch {
				return fail('turnstile_unavailable', 502);
			}
			// invalid-input-secret = the deployed secret is wrong (config gap,
			// page ops); everything else is a caller-side reject. Fail closed either way.
			const codes = turnstile['error-codes'] ?? [];
			if (!turnstile.success && codes.includes('invalid-input-secret')) {
				return fail('turnstile_not_configured', 503);
			}
			if (!turnstile.success) return fail('turnstile_failed', 403);
			// Canonical checks: expected action + the frontend hostname actually
			// returned by siteverify must both match. Widget embeds must set
			// data-action="booking" (see TASKS handoff for #31).
			const hostnameOk = turnstile.hostname !== undefined && turnstileHostnames(env).has(turnstile.hostname);
			if (turnstile.action !== EXPECTED_ACTION || !hostnameOk) {
				return fail('turnstile_failed', 403);
			}

			const id = crypto.randomUUID();
			const now = Date.now();
			const clientIp = getClientIp(request);

			try {
				await env.DB.prepare(
					'INSERT INTO bookings_log (id, name, email, service, timeline, details, metadata, status, attempts, error, client_ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, NULL, ?, ?, ?)'
				)
					.bind(id, name, email, service, timeline, details, 'queued', clientIp, now, now)
					.run();
			} catch (e) {
				console.error(JSON.stringify({ msg: 'booking_store_failed', id }));
				return fail('store_unavailable', 500);
			}

			try {
				await env.BOOKING_QUEUE.send({
					id,
					name,
					email,
					service,
					timeline,
					details,
					createdAt: now
				});
			} catch (e) {
				console.error(JSON.stringify({ msg: 'booking_enqueue_failed', id }));
				await env.DB.prepare("UPDATE bookings_log SET status = 'failed', error = 'enqueue_failed', updated_at = ? WHERE id = ?")
					.bind(Date.now(), id)
					.run();
				return fail('enqueue_failed', 502);
			}

			console.log(JSON.stringify({ msg: 'booking_accepted', id }));
			return ok({ id, status: 'queued' }, 202);
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			return ok({
				service: 'pwn4g3-booking',
				endpoints: { ingest: 'POST /api/booking', info: 'GET /api/booking', status: 'GET /api/booking?id=<uuid>' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		return fail('not_found', 404);
	},

	async queue(batch: MessageBatch<BookingMessage>, env: Env): Promise<void> {
		for (const message of batch.messages) {
			const booking = message.body;
			const now = Date.now();

			// Attempt accounting happens before the send so retries are visible
			// in the ledger even if the handler crashes mid-flight.
			await env.DB.prepare('UPDATE bookings_log SET attempts = attempts + 1, updated_at = ? WHERE id = ?')
				.bind(now, booking.id)
				.run();

			if (!env.RESEND_API_KEY || !env.BOOKING_EMAIL) {
				// Configuration problem, not transient — retries cannot fix it.
				await env.DB.prepare("UPDATE bookings_log SET status = 'failed', error = 'resend_not_configured', updated_at = ? WHERE id = ?")
					.bind(now, booking.id)
					.run();
				console.error(JSON.stringify({ msg: 'booking_send_failed', id: booking.id, reason: 'resend_not_configured' }));
				message.ack();
				continue;
			}

			try {
				const send = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.RESEND_API_KEY}`
					},
					body: JSON.stringify({
						from: env.BOOKING_FROM,
						to: [env.BOOKING_EMAIL],
						subject: `Booking request from ${booking.name}`,
						text: buildEmailBody(booking)
					}),
					signal: AbortSignal.timeout(15_000)
				});

				if (send.ok) {
					await env.DB.prepare("UPDATE bookings_log SET status = 'sent', error = NULL, updated_at = ? WHERE id = ?")
						.bind(Date.now(), booking.id)
						.run();
					console.log(JSON.stringify({ msg: 'booking_sent', id: booking.id }));
					message.ack();
					continue;
				}

				// 429/pay-providers flaking = transient; caller's other 4xx = terminal.
				if (send.status === 429 || send.status >= 500) {
					await env.DB.prepare('UPDATE bookings_log SET error = ?, updated_at = ? WHERE id = ?')
						.bind(`resend_${send.status}`, Date.now(), booking.id)
						.run();
					console.error(JSON.stringify({ msg: 'booking_retry', id: booking.id, status: send.status }));
					message.retry({ delaySeconds: 30 });
					continue;
				}

				const detail = `resend_${send.status}`;
				await env.DB.prepare("UPDATE bookings_log SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
					.bind(detail, Date.now(), booking.id)
					.run();
				console.error(JSON.stringify({ msg: 'booking_send_failed', id: booking.id, status: send.status }));
				message.ack();
			} catch (e) {
				// Network/timeout — let the queue redelivery machinery take over.
				await env.DB.prepare('UPDATE bookings_log SET error = ?, updated_at = ? WHERE id = ?')
					.bind(`exception:${String(e).slice(0, 120)}`, Date.now(), booking.id)
					.run();
				console.error(JSON.stringify({ msg: 'booking_exception', id: booking.id }));
				message.retry({ delaySeconds: 30 });
			}
		}
	}
};
