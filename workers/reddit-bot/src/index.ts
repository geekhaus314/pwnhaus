import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Reddit bot worker (#41).
 *
 * Cron (daily) + admin-triggered submit of reddit-channel broadcasts from
 * the notify ledger (#39) to the sub, plus an admin-gated unread/modmail
 * reader. OAuth is script-flow (client id/secret + username/password) and
 * FAILS CLOSED: any missing secret => 503, never a half-authed post.
 *
 * Dedupe: one row per notification in `reddit_posts` (migration 0007);
 * the shared `notify_deliveries` row for that notification+channel is
 * flipped to sent/failed alongside so the ledger stays truthful.
 * Secrets are set via `wrangler secret put` and never logged or echoed.
 */

interface Env {
	DB: D1Database;
	SUBREDDIT?: string;
	REDDIT_USER_AGENT?: string;
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
	REDDIT_USERNAME?: string;
	REDDIT_PASSWORD?: string;
	ADMIN_TOKEN?: string;
}

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

class RedditError extends Error {
	readonly status: number;
	readonly code: string;
	constructor(code: string, status: number, message?: string) {
		super(message ?? code);
		this.code = code;
		this.status = status;
	}
}

interface NotificationRow {
	id: string;
	message: string;
	url: string | null;
	channels: string;
	created_at: number;
}

const redditConfigured = (env: Env): boolean =>
	Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET && env.REDDIT_USERNAME && env.REDDIT_PASSWORD && env.SUBREDDIT);

const userAgent = (env: Env): string => env.REDDIT_USER_AGENT?.trim() || 'pwn4g3-reddit-bot/1.0';

/** Script-flow OAuth: password grant, returns a bearer token. */
const redditAccessToken = async (env: Env): Promise<string> => {
	if (!redditConfigured(env)) throw new RedditError('reddit_not_configured', 503);
	const creds = `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`;
	let basic: string;
	try {
		basic = btoa(unescape(encodeURIComponent(creds)));
	} catch {
		throw new RedditError('reddit_bad_credentials', 503);
	}
	const form = new URLSearchParams({
		grant_type: 'password',
		username: env.REDDIT_USERNAME as string,
		password: env.REDDIT_PASSWORD as string
	});
	let res: Response;
	try {
		res = await fetch('https://www.reddit.com/api/v1/access_token', {
			method: 'POST',
			headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent(env) },
			body: form.toString(),
			signal: AbortSignal.timeout(15_000)
		});
	} catch {
		throw new RedditError('reddit_unreachable', 502);
	}
	if (res.status === 401 || res.status === 403) throw new RedditError('reddit_auth_rejected', 502);
	if (!res.ok) throw new RedditError(`reddit_auth_http_${res.status}`, 502);
	let body: { access_token?: string; error?: string };
	try {
		body = (await res.json()) as { access_token?: string; error?: string };
	} catch {
		throw new RedditError('reddit_bad_auth_response', 502);
	}
	if (!body.access_token) throw new RedditError('reddit_auth_failed', 502);
	return body.access_token;
};

/** Latest reddit-channel notification with no reddit_posts row yet. */
const pickPending = async (env: Env): Promise<NotificationRow | null> => {
	const recent = await env.DB.prepare(
		'SELECT id, message, url, channels, created_at FROM notifications ORDER BY created_at DESC LIMIT 20'
	).all<NotificationRow>();
	const candidates = (recent.results ?? []).filter((n) => {
		try {
			return (JSON.parse(n.channels) as unknown[]).includes('reddit');
		} catch {
			return false;
		}
	});
	if (candidates.length === 0) return null;
	const placeholders = candidates.map(() => '?').join(',');
	const posted = await env.DB.prepare(
		`SELECT notification_id FROM reddit_posts WHERE notification_id IN (${placeholders})`
	)
		.bind(...candidates.map((c) => c.id))
		.all<{ notification_id: string }>();
	const postedIds = new Set((posted.results ?? []).map((r) => r.notification_id));
	return candidates.find((c) => !postedIds.has(c.id)) ?? null;
};

const fetchNotification = async (env: Env, id: string): Promise<NotificationRow | null> => {
	const row = await env.DB.prepare('SELECT id, message, url, channels, created_at FROM notifications WHERE id = ?')
		.bind(id)
		.first<NotificationRow>();
	if (!row) return null;
	try {
		if (!(JSON.parse(row.channels) as unknown[]).includes('reddit')) return null;
	} catch {
		return null;
	}
	return row;
};

interface SubmitResult {
	thingId: string | null;
	permalink: string | null;
}

/** Submit a self-post; throws RedditError on any failure. */
const submitSelfPost = async (env: Env, token: string, note: NotificationRow): Promise<SubmitResult> => {
	const subreddit = (env.SUBREDDIT ?? '').trim();
	if (!subreddit) throw new RedditError('reddit_not_configured', 503);
	const title = note.message.length > 280 ? `${note.message.slice(0, 277)}...` : note.message;
	const text = note.url ? `${note.message}\n\n${note.url}` : note.message;
	const form = new URLSearchParams({ kind: 'self', sr: subreddit, title, text, api_type: 'json' });
	let res: Response;
	try {
		res = await fetch('https://oauth.reddit.com/api/submit', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent(env) },
			body: form.toString(),
			signal: AbortSignal.timeout(15_000)
		});
	} catch {
		throw new RedditError('reddit_unreachable', 502);
	}
	if (res.status === 401 || res.status === 403) throw new RedditError('reddit_auth_rejected', 502);
	if (res.status === 429) throw new RedditError('reddit_rate_limited', 502);
	if (!res.ok) throw new RedditError(`reddit_submit_http_${res.status}`, 502);
	let body: { json?: { errors?: Array<[string, string, string?]>; data?: { things?: Array<{ data?: { id?: string; name?: string; permalink?: string; url?: string } }> } } };
	try {
		body = (await res.json()) as typeof body;
	} catch {
		throw new RedditError('reddit_bad_submit_response', 502);
	}
	const errors = body.json?.errors ?? [];
	if (errors.length > 0) {
		const [code] = errors[0];
		throw new RedditError(`reddit_rejected_${code || 'unknown'}`, 502);
	}
	const thing = body.json?.data?.things?.[0]?.data;
	if (!thing?.id) throw new RedditError('reddit_no_thing_returned', 502);
	const permalink = thing.permalink ? `https://www.reddit.com${thing.permalink}` : thing.url ?? null;
	return { thingId: thing.name ?? thing.id, permalink };
};

const recordPost = async (
	env: Env,
	note: NotificationRow,
	status: 'sent' | 'failed',
	thingId: string | null,
	permalink: string | null,
	error: string | null
): Promise<void> => {
	const now = Date.now();
	const rowId = crypto.randomUUID();
	await env.DB.batch([
		env.DB.prepare(
			"INSERT INTO reddit_posts (id, notification_id, thing_id, url, status, error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(notification_id) DO UPDATE SET thing_id=excluded.thing_id, url=excluded.url, status=excluded.status, error=excluded.error, updated_at=excluded.updated_at"
		).bind(rowId, note.id, thingId, permalink, status, error, now, now),
		env.DB.prepare('UPDATE notify_deliveries SET status = ?, attempts = attempts + 1, error = ?, updated_at = ? WHERE notification_id = ? AND channel = ?').bind(
			status,
			error ?? (status === 'sent' ? null : 'reddit_submit_failed'),
			now,
			note.id,
			'reddit'
		)
	]);
};

const runOnePost = async (env: Env, note: NotificationRow) => {
	const token = await redditAccessToken(env);
	const result = await submitSelfPost(env, token, note);
	await recordPost(env, note, 'sent', result.thingId, result.permalink, null);
	console.log(JSON.stringify({ msg: 'reddit_posted', notification: note.id, thing: result.thingId }));
	return result;
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/reddit' && request.method === 'GET') {
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'reddit-info' }, 'reddit-info');
			if (limited) return limited;
			return ok({
				service: 'pwn4g3-reddit',
				submit: 'POST /api/reddit/submit { id? } (admin bearer)',
				modmail: 'GET /api/reddit/modmail (admin bearer, unread)',
				cron: 'daily 07:31 UTC (4th of 5 account triggers)',
				subreddit: env.SUBREDDIT ?? null,
				configured: redditConfigured(env) ? 'live' : 'not_configured',
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		if (url.pathname === '/api/reddit/submit' && request.method === 'POST') {
			if (!env.ADMIN_TOKEN) return fail('reddit_not_configured', 503);
			const token = bearerToken(request);
			if (!token) return fail('admin_token_required', 401);
			if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);

			const limited = rateLimitOr429(request, { limit: 5, windowMs: 60_000, prefix: 'reddit-submit' }, 'reddit-submit');
			if (limited) return limited;
			if (!redditConfigured(env)) return fail('reddit_not_configured', 503);

			let id: string | undefined;
			try {
				const body = (await request.json()) as { id?: unknown };
				if (body.id !== undefined) {
					if (typeof body.id !== 'string' || body.id.length === 0) return fail('id_must_be_string', 422);
					id = body.id;
				}
			} catch {
				// Empty body = auto-pick latest pending; only malformed JSON fails.
				const text = '';
				if (text) return fail('invalid_json', 400);
			}

			let note: NotificationRow | null;
			try {
				note = id ? await fetchNotification(env, id) : await pickPending(env);
			} catch {
				console.error(JSON.stringify({ msg: 'reddit_pick_failed', id: id ?? null }));
				return fail('store_unavailable', 500);
			}
			if (!note) return fail(id ? 'unknown_or_non_reddit_notification' : 'nothing_to_post', 404);

			try {
				const result = await runOnePost(env, note);
				return ok({ notification: note.id, thing: result.thingId, permalink: result.permalink }, 202);
			} catch (e) {
				const err = e instanceof RedditError ? e : new RedditError('reddit_failed', 502);
				console.error(JSON.stringify({ msg: 'reddit_submit_failed', notification: note.id, error: err.code }));
				try {
					await recordPost(env, note, 'failed', null, null, err.code);
				} catch {
					console.error(JSON.stringify({ msg: 'reddit_ledger_failed', notification: note.id }));
				}
				return fail(err.code, err.status);
			}
		}

		if (url.pathname === '/api/reddit/modmail' && request.method === 'GET') {
			if (!env.ADMIN_TOKEN) return fail('reddit_not_configured', 503);
			const token = bearerToken(request);
			if (!token) return fail('admin_token_required', 401);
			if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);

			const limited = rateLimitOr429(request, { limit: 10, windowMs: 60_000, prefix: 'reddit-modmail' }, 'reddit-modmail');
			if (limited) return limited;
			if (!redditConfigured(env)) return fail('reddit_not_configured', 503);

			let access: string;
			try {
				access = await redditAccessToken(env);
			} catch (e) {
				const err = e instanceof RedditError ? e : new RedditError('reddit_failed', 502);
				return fail(err.code, err.status);
			}
			let res: Response;
			try {
				res = await fetch('https://oauth.reddit.com/message/unread?limit=25', {
					headers: { Authorization: `Bearer ${access}`, 'User-Agent': userAgent(env) },
					signal: AbortSignal.timeout(15_000)
				});
			} catch {
				return fail('reddit_unreachable', 502);
			}
			if (!res.ok) return fail(`reddit_modmail_http_${res.status}`, 502);
			try {
				const body = (await res.json()) as {
					data?: { children?: Array<{ data?: { id?: string; author?: string; subject?: string; subreddit?: string; created_utc?: number } }> };
				};
				const items = (body.data?.children ?? []).map((c) => ({
					id: c.data?.id ?? null,
					author: c.data?.author ?? null,
					subject: c.data?.subject ?? null,
					subreddit: c.data?.subreddit ?? null,
					created_utc: c.data?.created_utc ?? null
				}));
				return ok({ unread: items.length, items });
			} catch {
				return fail('reddit_bad_modmail_response', 502);
			}
		}

		if (url.pathname === '/' && request.method === 'GET') {
			return ok({
				service: 'pwn4g3-reddit',
				endpoints: { info: 'GET /api/reddit', submit: 'POST /api/reddit/submit', modmail: 'GET /api/reddit/modmail' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		if (url.pathname === '/api/reddit/submit' || url.pathname === '/api/reddit/modmail') {
			return fail('method_not_allowed', 405);
		}
		return fail('not_found', 404);
	},

	async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
		if (event.cron !== '31 7 * * *') return;
		try {
			const note = await pickPending(env);
			if (!note) {
				console.log(JSON.stringify({ msg: 'reddit_cron_idle' }));
				return;
			}
			await runOnePost(env, note);
		} catch (e) {
			const code = e instanceof RedditError ? e.code : 'reddit_cron_failed';
			console.error(JSON.stringify({ msg: 'reddit_cron_failed', error: code }));
			if (code === 'reddit_not_configured') return; // fail-closed: no secrets, no spam window
			try {
				const note = await pickPending(env);
				if (note) {
					await recordPost(env, note, 'failed', null, null, code);
				}
			} catch {
				console.error(JSON.stringify({ msg: 'reddit_cron_ledger_failed' }));
			}
		}
	}
};
