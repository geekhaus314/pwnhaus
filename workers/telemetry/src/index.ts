import { corsHeaders, handleOptions, isAllowedOrigin } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Telemetry ingestion service (#22 v1, #26 v2).
 *
 * Internal service, reached via the pwn4g3 gateway at POST /api/telemetry.
 * v2 persists every accepted event to D1 table `telemetry_events` and speaks
 * the standard `{ok, data, error}` envelope (v1's `{received, id}` is gone).
 *
 * Abuse posture (fix 1): open world-writable ingest would let anyone fill
 * D1, so POST is origin-gated — browsers must send an allowlisted Origin
 * (the portfolio site + local dev); non-browser callers (service bindings,
 * curl) send no Origin and are accepted only for internal `pwn4g3-*`
 * service names (booking DLQ, notify fan-out). Everything else => 403
 * `origin_forbidden` before any D1 write. Per-IP 30/min bucket stays as the
 * second layer.
 *
 * No durable store beyond D1 yet — rollups/materialized views arrive with
 * the scheduler (#28); retention policy still to decide.
 */

interface Env {
	DB: D1Database;
}

const MAX_BODY_BYTES = 64 * 1024;
const MAX_DATA_BYTES = 32 * 1024;
const MAX_SERVICE_LEN = 64;
const MAX_EVENT_LEN = 128;

const LEVELS = new Set(['debug', 'info', 'warn', 'error']);

const SERVICE_RE = /^[a-z0-9][a-z0-9\-_:.]*$/i;

const METHODS = 'GET, OPTIONS, POST';

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

/** Browser callers must prove site origin; internal bindings send no Origin. */
const originOf = (request: Request): string | null => {
	const origin = request.headers.get('origin');
	if (origin) return origin;
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		return new URL(referer).origin;
	} catch {
		return null;
	}
};

const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

interface TelemetryBody {
	service?: unknown;
	event?: unknown;
	level?: unknown;
	data?: unknown;
	ts?: unknown;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/telemetry') {
			if (request.method === 'GET') {
				const limited = rateLimitOr429(
					request,
					{ limit: 60, windowMs: 60_000, prefix: 'telemetry-info' },
					'telemetry-info'
				);
				if (limited) return limited;
			return ok({
				service: 'pwn4g3-telemetry',
				ingest: 'POST /api/telemetry',
				envelope: '{ service: string, event: string, level?: debug|info|warn|error, data?: json, ts?: string }',
				limits: { bodyBytes: MAX_BODY_BYTES, dataBytes: MAX_DATA_BYTES, postPerMinPerIp: 30 },
				originPolicy: 'browsers: Origin must be https://pwn4g3.pages.dev (local dev allowed); non-browser: service must start with pwn4g3-',
				store: 'D1 pwn4g3-db.telemetry_events',
				note: 'Internal service, reached via the pwn4g3 gateway.'
			}, 200, request);
			}

			if (request.method !== 'POST') {
				return fail('method_not_allowed', 405, request);
			}

			// Fix 1, layer 1: browsers must prove site origin before we spend
			// rate-limit buckets or D1 writes on them.
			const callerOrigin = originOf(request);
			if (callerOrigin !== null && !isAllowedOrigin(callerOrigin)) {
				return fail('origin_forbidden', 403, request);
			}

			const limited = rateLimitOr429(
				request,
				{ limit: 30, windowMs: 60_000, prefix: 'telemetry-ingest' },
				'telemetry-ingest'
			);
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) {
				return fail('payload_too_large', 413, request);
			}

			let body: TelemetryBody;
			try {
				body = (await request.json()) as TelemetryBody;
			} catch {
				return fail('invalid_json', 400, request);
			}

			if (!body || typeof body !== 'object') {
				return fail('envelope_object_required', 400, request);
			}

			const { service, event, level = 'info', data = null, ts = null } = body;

			if (typeof service !== 'string' || service.length === 0 || service.length > MAX_SERVICE_LEN || !SERVICE_RE.test(service)) {
				return fail('service_string_required', 400, request);
			}
			// Fix 1, layer 2: non-browser callers send no Origin (service
			// bindings, curl). Accept those only for internal pwn4g3-*
			// services — open sender names would re-open the D1-fill hole.
			if (callerOrigin === null && !service.startsWith('pwn4g3-')) {
				return fail('origin_forbidden', 403, request);
			}
			if (typeof event !== 'string' || event.length === 0 || event.length > MAX_EVENT_LEN) {
				return fail('event_string_required', 400, request);
			}
			if (typeof level !== 'string' || !LEVELS.has(level)) {
				return fail('level_must_be_debug_info_warn_error', 400, request);
			}
			if (ts !== null && (typeof ts !== 'string' || ts.length > 32)) {
				return fail('ts_must_be_short_string', 400, request);
			}

			let dataJson: string | null = null;
			let dataBytes = 0;
			if (data !== null && data !== undefined) {
				try {
					dataJson = JSON.stringify(data);
				} catch {
					return fail('data_must_be_json_serializable', 400, request);
				}
				dataBytes = utf8Bytes(dataJson);
				if (dataBytes > MAX_DATA_BYTES) {
					return fail('data_too_large', 413, request);
				}
			}

			const id = crypto.randomUUID();
			const now = Date.now();
			try {
				await env.DB.prepare(
					'INSERT INTO telemetry_events (id, service, event, level, ts, data, data_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
				)
					.bind(id, service, event, level, ts, dataJson, dataBytes, now)
					.run();
			} catch (e) {
				console.error(JSON.stringify({ msg: 'telemetry_store_failed', id, service, event }));
				return fail('store_unavailable', 500, request);
			}

			console.log(JSON.stringify({ msg: 'telemetry', id, service, event, level, ts, dataBytes }));

			return ok({ id, service, event, level }, 202, request);
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			return ok({
				service: 'pwn4g3-telemetry',
				endpoints: { ingest: 'POST /api/telemetry', info: 'GET /api/telemetry' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		return fail('not_found', 404);
	}
};
