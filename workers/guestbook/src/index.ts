import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Guestbook API (#34, jake Otis-cover).
 *
 * Spam posture: entries land as `pending` and only `approved` rows are
 * ever listed. Submit is rate-limited (3/hour/IP), length-capped, with a
 * `website` honeypot that fake-accepts bots without storing anything.
 * Approval happens out-of-band: `wrangler d1 execute` on pwn4g3-db, or
 * the admin-console moderation follow-up (Otis). Rendering is XSS-safe
 * by construction — Svelte escapes `{message}` as text, never {@html}.
 */

interface Env {
	DB: D1Database;
}

const METHODS = 'GET, OPTIONS, POST';
const HOUR_MS = 3_600_000;

const ok = (data: unknown, status = 200, request?: Request): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(METHODS, request)
		}
	});

const fail = (error: string, status = 400, request?: Request): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(METHODS, request)
		}
	});

interface Entry {
	id: string;
	name: string;
	message: string;
	created_at: number;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/guestbook') {
			if (request.method === 'GET') {
				const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'guestbook-list' }, 'guestbook-list');
				if (limited) return limited;
				const rawLimit = Number(url.searchParams.get('limit') ?? '20');
				const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.floor(rawLimit))) : 20;
				try {
					const res = await env.DB.prepare(
						"SELECT id, name, message, created_at FROM guestbook WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?"
					)
						.bind(limit)
						.all<Entry>();
					return ok({ entries: res.results ?? [], count: (res.results ?? []).length }, 200, request);
				} catch {
					return fail('store_unavailable', 500, request);
				}
			}

			if (request.method !== 'POST') return fail('method_not_allowed', 405, request);

			const limited = rateLimitOr429(request, { limit: 3, windowMs: HOUR_MS, prefix: 'guestbook-submit' }, 'guestbook-submit');
			if (limited) return limited;

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return fail('invalid_json', 400, request);
			}
			const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
			const name = typeof rec.name === 'string' ? rec.name.trim() : '';
			const message = typeof rec.message === 'string' ? rec.message.trim() : '';
			const honeypot = typeof rec.website === 'string' ? rec.website.trim() : '';

			// Honeypot: bots fill `website` — fake-accept, store nothing, reveal nothing.
			if (honeypot.length > 0) {
				return ok({ id: crypto.randomUUID(), status: 'pending' }, 202, request);
			}
			if (name.length < 2 || name.length > 40) return fail('name_must_be_2_to_40_characters', 422, request);
			if (message.length < 3 || message.length > 500) return fail('message_must_be_3_to_500_characters', 422, request);

			const id = crypto.randomUUID();
			try {
				await env.DB.prepare('INSERT INTO guestbook (id, name, message, status, created_at) VALUES (?, ?, ?, ?, ?)')
					.bind(id, name, message, 'pending', Date.now())
					.run();
			} catch {
				return fail('store_unavailable', 500, request);
			}
			return ok({ id, status: 'pending' }, 201, request);
		}

		if (url.pathname === '/health') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405, request);
			return ok({ service: 'pwn4g3-guestbook', status: 'ok' }, 200, request);
		}

		return fail('not_found', 404, request);
	}
};
