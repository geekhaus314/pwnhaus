import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Broadcast worker (#39).
 *
 * Admin-only fan-out: POST /api/notify records a `notifications` row plus one
 * `notify_deliveries` row per requested channel, attempts each delivery, then
 * flips the parent row to delivered | partial | failed.
 *
 * Channels:
 *   discord — live via DISCORD_WEBHOOK_URL secret (channel webhook);
 *     slash-commands live in the discord bot (#40).
 *   reddit  — recorded as queued; the reddit bot (#41) cron picks it up.
 *   signal  — live via SIGNAL_BRIDGE_URL/TOKEN to the Barnaby bridge (#42);
 *     skipped until the tunnel + secrets land.
 *
 * Auth is fail-closed: no ADMIN_TOKEN secret => 503 on every POST (same
 * posture as booking's Turnstile gate). Secrets never leave the worker —
 * GET info exposes channel names only. KV-backed dynamic targets arrive
 * with #43; v1 reads static secrets/vars so CI stays green with no new
 * namespace.
 */

interface Env {
	DB: D1Database;
	ADMIN_TOKEN?: string;
	DISCORD_WEBHOOK_URL?: string;
	SIGNAL_BRIDGE_URL?: string;
	SIGNAL_BRIDGE_TOKEN?: string;
	TELEMETRY_SERVICE?: { fetch(request: Request): Promise<Response> };
}

const CHANNELS = ['discord', 'reddit', 'signal'] as const;
type Channel = (typeof CHANNELS)[number];

const MAX_BODY_BYTES = 16 * 1024;
const MAX_MESSAGE_LEN = 2000; // Discord webhook content limit
const MAX_URL_LEN = 2048;

const METHODS = 'GET, OPTIONS, POST';

const ok = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

const fail = (error: string, status = 400): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

/**
 * Constant-time bearer comparison: SHA-256 both sides (fixed 32 bytes, so no
 * length leak) then accumulate XOR without short-circuiting.
 * (`crypto.subtle.timingSafeEqual` is not in the installed worker types, so
 * the equivalent loop keeps `tsc` honest instead of casting around it.)
 */
const verifyAdminToken = async (provided: string, expected: string): Promise<boolean> => {
	const encoder = new TextEncoder();
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(provided)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected))
	]);
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
};

const bearerToken = (request: Request): string | null => {
	const header = request.headers.get('authorization');
	if (!header) return null;
	const match = /^Bearer (.+)$/.exec(header.trim());
	return match?.[1]?.trim() ? match[1].trim() : null;
};

const parseChannels = (value: unknown): Channel[] | null => {
	if (value === undefined || value === null) return ['discord'];
	if (!Array.isArray(value) || value.length === 0 || value.length > CHANNELS.length) return null;
	const seen = new Set<string>();
	for (const entry of value) {
		if (typeof entry !== 'string' || !(CHANNELS as readonly string[]).includes(entry) || seen.has(entry)) return null;
		seen.add(entry);
	}
	return [...seen] as Channel[];
};

interface DeliveryOutcome {
	channel: Channel;
	status: 'sent' | 'skipped' | 'failed';
	error: string | null;
}

const sendDiscord = async (webhookUrl: string | undefined, message: string, url: string | null): Promise<DeliveryOutcome> => {
	if (!webhookUrl) return { channel: 'discord', status: 'skipped', error: 'discord_not_configured' };
	const content = url ? `${message}\n${url}` : message;
	let res: Response;
	try {
		res = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content }),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		return { channel: 'discord', status: 'failed', error: 'discord_unreachable' };
	}
	if (res.ok) return { channel: 'discord', status: 'sent', error: null };
	if (res.status === 429 || res.status >= 500) return { channel: 'discord', status: 'failed', error: `discord_http_${res.status}` };
	return { channel: 'discord', status: 'failed', error: `discord_rejected_${res.status}` };
};

const sendSignal = async (
	bridgeUrl: string | undefined,
	bridgeToken: string | undefined,
	message: string,
	url: string | null
): Promise<DeliveryOutcome> => {
	if (!bridgeUrl || !bridgeToken) return { channel: 'signal', status: 'skipped', error: 'signal_bridge_not_configured' };
	const endpoint = bridgeUrl.replace(/\/+$/, '') + '/api/signal/send';
	let res: Response;
	try {
		res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bridgeToken}` },
			body: JSON.stringify(url ? { message, url } : { message }),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		return { channel: 'signal', status: 'failed', error: 'signal_bridge_unreachable' };
	}
	if (res.ok) return { channel: 'signal', status: 'sent', error: null };
	if (res.status === 429 || res.status >= 500) return { channel: 'signal', status: 'failed', error: `signal_http_${res.status}` };
	if (res.status === 503) return { channel: 'signal', status: 'skipped', error: 'signal_bridge_not_configured' };
	return { channel: 'signal', status: 'failed', error: `signal_rejected_${res.status}` };
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/notify') {
			if (request.method === 'GET') {
				const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'notify-info' }, 'notify-info');
				if (limited) return limited;

				const id = url.searchParams.get('id');
				if (id) {
					// Status lookup is admin-gated: rows may contain pre-release copy.
					if (!env.ADMIN_TOKEN) return fail('notify_not_configured', 503);
					const token = bearerToken(request);
					if (!token) return fail('admin_token_required', 401);
					if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);

					const notification = await env.DB.prepare(
						'SELECT id, message, url, channels, status, created_at, updated_at FROM notifications WHERE id = ?'
					)
						.bind(id)
						.first<{ id: string; message: string; url: string | null; channels: string; status: string; created_at: number; updated_at: number }>();
					if (!notification) return fail('unknown_notification', 404);
					const deliveries = await env.DB.prepare(
						'SELECT channel, status, attempts, error FROM notify_deliveries WHERE notification_id = ? ORDER BY channel'
					)
						.bind(id)
						.all<{ channel: string; status: string; attempts: number; error: string | null }>();
					return ok({
						id: notification.id,
						message: notification.message,
						url: notification.url,
						channels: JSON.parse(notification.channels) as string[],
						status: notification.status,
						deliveries: deliveries.results ?? []
					});
				}

				return ok({
					service: 'pwn4g3-notify',
					ingest: 'POST /api/notify',
					envelope: '{ message: string (≤2000), url?: https-string, channels?: ("discord"|"reddit"|"signal")[] }',
					auth: 'Authorization: Bearer <ADMIN_TOKEN>',
					statusLookup: 'GET /api/notify?id=<uuid> (admin-gated)',
					limits: { postPerMinPerIp: 10, maxBodyBytes: MAX_BODY_BYTES },
					channels: {
						discord: env.DISCORD_WEBHOOK_URL ? 'live' : 'not_configured',
						reddit: 'cron_pending_41',
						signal: env.SIGNAL_BRIDGE_URL && env.SIGNAL_BRIDGE_TOKEN ? 'live' : 'not_configured'
					},
					note: 'Internal service, reached via the pwn4g3 gateway.'
				});
			}

			if (request.method !== 'POST') return fail('method_not_allowed', 405);

			// Admin-only broadcast: auth gate first (no oracle for probing),
			// then the per-IP bucket so a leaked token can't be sprayed far.
			if (!env.ADMIN_TOKEN) return fail('notify_not_configured', 503);
			const token = bearerToken(request);
			if (!token) return fail('admin_token_required', 401);
			if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);

			const limited = rateLimitOr429(request, { limit: 10, windowMs: 60_000, prefix: 'notify-ingest' }, 'notify-ingest');
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) return fail('payload_too_large', 413);

			let body: Record<string, unknown>;
			try {
				body = (await request.json()) as Record<string, unknown>;
			} catch {
				return fail('invalid_json', 400);
			}

			const message = typeof body.message === 'string' && body.message.length > 0 && body.message.length <= MAX_MESSAGE_LEN ? body.message : undefined;
			if (!message) return fail('message_string_required', 422);
			let link: string | null = null;
			if (body.url !== undefined && body.url !== null && body.url !== '') {
				if (typeof body.url !== 'string' || body.url.length > MAX_URL_LEN || !body.url.startsWith('https://')) {
					return fail('url_must_be_https_string', 422);
				}
				link = body.url;
			}
			const channels = parseChannels(body.channels);
			if (!channels) return fail('channels_must_be_discord_reddit_signal', 422);

			const id = crypto.randomUUID();
			const now = Date.now();
			const channelsJson = JSON.stringify(channels);
			try {
				await env.DB.prepare(
					"INSERT INTO notifications (id, message, url, channels, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'queued', ?, ?)"
				)
					.bind(id, message, link, channelsJson, now, now)
					.run();
				for (const channel of channels) {
					await env.DB.prepare(
						"INSERT INTO notify_deliveries (id, notification_id, channel, status, attempts, error, created_at, updated_at) VALUES (?, ?, ?, 'queued', 0, NULL, ?, ?)"
					)
						.bind(crypto.randomUUID(), id, channel, now, now)
						.run();
				}
			} catch {
				console.error(JSON.stringify({ msg: 'notify_store_failed', id }));
				return fail('store_unavailable', 500);
			}

			// Fan-out is inline: admin volume is tiny (no queue needed), and
			// the ledger rows above already exist so a crash mid-flight reads
			// as queued-not-sent, never as silently delivered.
			const outcomes: DeliveryOutcome[] = [];
			for (const channel of channels) {
				if (channel === 'discord') {
					outcomes.push(await sendDiscord(env.DISCORD_WEBHOOK_URL, message, link));
				} else if (channel === 'reddit') {
					outcomes.push({ channel, status: 'skipped', error: 'reddit_queued_for_41_cron' });
				} else {
					outcomes.push(await sendSignal(env.SIGNAL_BRIDGE_URL, env.SIGNAL_BRIDGE_TOKEN, message, link));
				}
			}

			const stamp = Date.now();
			for (const outcome of outcomes) {
				await env.DB.prepare('UPDATE notify_deliveries SET status = ?, attempts = attempts + 1, error = ?, updated_at = ? WHERE notification_id = ? AND channel = ?')
					.bind(outcome.status, outcome.error, stamp, id, outcome.channel)
					.run();
			}
			const sent = outcomes.filter((o) => o.status === 'sent').length;
			const parentStatus = sent === outcomes.length ? 'delivered' : sent > 0 ? 'partial' : 'failed';
			await env.DB.prepare('UPDATE notifications SET status = ?, updated_at = ? WHERE id = ?')
				.bind(parentStatus, stamp, id)
				.run();

			console.log(JSON.stringify({ msg: 'notify_accepted', id, channels, status: parentStatus }));
			for (const outcome of outcomes) {
				if (outcome.status !== 'sent') {
					console.error(JSON.stringify({ msg: 'notify_delivery', id, channel: outcome.channel, status: outcome.status, error: outcome.error }));
				}
			}

			if (env.TELEMETRY_SERVICE) {
				ctx.waitUntil(
					(async () => {
						try {
							await env.TELEMETRY_SERVICE!.fetch(
								new Request('https://internal/api/telemetry', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ service: 'pwn4g3-notify', event: 'notify.broadcast', data: { id, status: parentStatus, channels } })
								})
							);
						} catch {
							console.error(JSON.stringify({ msg: 'notify_telemetry_failed', id }));
						}
					})()
				);
			}

			return ok({ id, status: parentStatus, deliveries: outcomes }, 202);
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			return ok({
				service: 'pwn4g3-notify',
				endpoints: { ingest: 'POST /api/notify', info: 'GET /api/notify', status: 'GET /api/notify?id=<uuid>' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		return fail('not_found', 404);
	}
};
