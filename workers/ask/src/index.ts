import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Ask-pwn4g3 (#32, jake Otis-cover).
 *
 * D1 FTS5 retrieval over a small curated corpus + Workers AI answer,
 * D1-backed answer cache keyed by question hash (7-day TTL) so repeats
 * never spend neurons. KV would be the fleet-blessed cache layer, but no
 * KV namespace exists yet — D1 cache meets the same cache-first intent
 * with zero new infra, and migrates 1:1 to KV when credentials land.
 *
 * Budgets: 5 questions/day/IP (in-memory bucket, same caveat as the rest
 * of the fleet — per-isolate, not durable), 500-char questions, 256
 * max_tokens answers. No IPs or raw questions stored beyond the hashed
 * cache key; answers cite retrieved doc titles.
 */

interface Env {
	DB: D1Database;
	AI: Ai;
}

const METHODS = 'GET, OPTIONS, POST';
const DAY_MS = 86_400_000;
const CACHE_TTL_MS = 7 * DAY_MS;
const MAX_Q = 500;
const MIN_Q = 3;

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

interface Doc {
	title: string;
	body: string;
	tag: string;
}

/** Build a safe FTS5 query from free text: alnum tokens OR-ed, quoted. */
const ftsQuery = (q: string): string | null => {
	const tokens = q
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length >= 2)
		.slice(0, 8);
	if (tokens.length === 0) return null;
	return tokens.map((t) => `"${t}"`).join(' OR ');
};

const hashQ = async (q: string): Promise<string> => {
	const digest = await crypto.subtle.digest('UTF-8', new TextEncoder().encode(q.trim().toLowerCase()));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const retrieve = async (db: D1Database, q: string): Promise<Doc[]> => {
	const match = ftsQuery(q);
	try {
		if (match) {
			const res = await db
				.prepare('SELECT title, body, tag FROM ask_docs_fts WHERE ask_docs_fts MATCH ? LIMIT 3')
				.bind(match)
				.all<Doc>();
			if ((res.results ?? []).length > 0) return res.results ?? [];
		}
		// Fallback: broad LIKE on the first meaningful token.
		const token = q.toLowerCase().split(/[^a-z0-9]+/).find((t) => t.length >= 3) ?? '';
		if (!token) return [];
		const like = await db
			.prepare('SELECT title, body, tag FROM ask_docs_fts WHERE title LIKE ? OR body LIKE ? LIMIT 3')
			.bind(`%${token}%`, `%${token}%`)
			.all<Doc>();
		return like.results ?? [];
	} catch {
		return [];
	}
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/ask') {
			if (request.method === 'GET') {
				return ok(
					{
						service: 'pwn4g3-ask',
						ask: 'POST /api/ask { question: string (3..500 chars) }',
						envelope: '{ ok, data: { answer, sources, cached } }',
						limits: { questionsPerDayPerIp: 5, maxChars: MAX_Q, cacheTtlDays: 7 },
						note: 'Internal service, reached via the pwn4g3 gateway.'
					},
					200,
					request
				);
			}
			if (request.method !== 'POST') return fail('method_not_allowed', 405, request);

			// Expensive route: 5/day per client IP to protect the neuron cap.
			const limited = rateLimitOr429(request, { limit: 5, windowMs: DAY_MS, prefix: 'ask' }, 'ask');
			if (limited) {
				const headers = new Headers(limited.headers);
				return new Response(JSON.stringify({ ok: false, error: 'rate_limited', retry_hint: '5 questions per day per IP' }), {
					status: 429,
					headers
				});
			}

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return fail('invalid_json', 400, request);
			}
			const question =
				body && typeof body === 'object' && 'question' in body && typeof body.question === 'string'
					? body.question.trim()
					: '';
			if (question.length < MIN_Q || question.length > MAX_Q) {
				return fail('question_must_be_3_to_500_characters', 422, request);
			}

			// 1. Cache first — never spend neurons twice on one question.
			const key = await hashQ(question);
			const now = Date.now();
			try {
				const hit = await env.DB.prepare('SELECT answer, sources FROM ask_cache WHERE question_hash = ? AND expires_at > ?')
					.bind(key, now)
					.first<{ answer: string; sources: string }>();
				if (hit) {
					return ok({ answer: hit.answer, sources: JSON.parse(hit.sources), cached: true }, 200, request);
				}
			} catch {
				/* cache miss path continues */
			}

			// 2. Retrieve.
			const docs = await retrieve(env.DB, question);

			// 3. Answer. Fail closed with retrieval-only response when AI is unbound.
			let answer: string;
			if (!env.AI) {
				if (docs.length === 0) return fail('ask_unavailable', 503, request);
				answer = docs.map((d) => `${d.title}: ${d.body}`).join('\n\n');
			} else {
				const context = docs.length > 0 ? docs.map((d) => `[${d.tag}] ${d.title}: ${d.body}`).join('\n') : 'No corpus match.';
				try {
					const out = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
						messages: [
							{
								role: 'system',
								content:
									'You answer questions about Jake Viefhaus (pwn4g3) portfolio: services, prices, booking, shop, live lab. Use ONLY the context below. If the context lacks the answer, say so and point to the Book page. Max 120 words.'
							},
							{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
						],
						max_tokens: 256
					})) as { response?: string };
					answer = (out.response ?? '').trim() || 'I could not draft an answer — ask over email via the Book page.';
				} catch {
					return fail('ask_unavailable', 503, request);
				}
			}

			const sources = docs.map((d) => ({ title: d.title, tag: d.tag }));

			// 4. Cache (best effort).
			try {
				await env.DB.prepare(
					'INSERT OR REPLACE INTO ask_cache (question_hash, answer, sources, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
				)
					.bind(key, answer, JSON.stringify(sources), now, now + CACHE_TTL_MS)
					.run();
			} catch {
				/* answer still valid without cache write */
			}

			return ok({ answer, sources, cached: false }, 200, request);
		}

		if (url.pathname === '/health') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405, request);
			return ok({ service: 'pwn4g3-ask', status: 'ok' }, 200, request);
		}

		return fail('not_found', 404, request);
	}
};
