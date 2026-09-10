import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Telemetry ingestion service (#22 v1, #26 v2).
 *
 * Internal service, reached via the pwn4g3 gateway at POST /api/telemetry.
 * v2 persists every accepted event to D1 table `telemetry_events` and speaks
 * the standard `{ok, data, error}` envelope (v1's `{received, id}` is gone).
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

const ok = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(METHODS)
		}
	});

const fail = (error: string, status = 400): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(METHODS)
		}
	});

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
					store: 'D1 pwn4g3-db.telemetry_events',
					note: 'Internal service, reached via the pwn4g3 gateway.'
				});
			}

			if (request.method !== 'POST') {
				return fail('method_not_allowed', 405);
			}

			const limited = rateLimitOr429(
				request,
				{ limit: 30, windowMs: 60_000, prefix: 'telemetry-ingest' },
				'telemetry-ingest'
			);
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) {
				return fail('payload_too_large', 413);
			}

			let body: TelemetryBody;
			try {
				body = (await request.json()) as TelemetryBody;
			} catch {
				return fail('invalid_json', 400);
			}

			if (!body || typeof body !== 'object') {
				return fail('envelope_object_required', 400);
			}

			const { service, event, level = 'info', data = null, ts = null } = body;

			if (typeof service !== 'string' || service.length === 0 || service.length > MAX_SERVICE_LEN || !SERVICE_RE.test(service)) {
				return fail('service_string_required', 400);
			}
			if (typeof event !== 'string' || event.length === 0 || event.length > MAX_EVENT_LEN) {
				return fail('event_string_required', 400);
			}
			if (typeof level !== 'string' || !LEVELS.has(level)) {
				return fail('level_must_be_debug_info_warn_error', 400);
			}
			if (ts !== null && (typeof ts !== 'string' || ts.length > 32)) {
				return fail('ts_must_be_short_string', 400);
			}

			let dataJson: string | null = null;
			let dataBytes = 0;
			if (data !== null && data !== undefined) {
				try {
					dataJson = JSON.stringify(data);
				} catch {
					return fail('data_must_be_json_serializable', 400);
				}
				dataBytes = utf8Bytes(dataJson);
				if (dataBytes > MAX_DATA_BYTES) {
					return fail('data_too_large', 413);
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
				return fail('store_unavailable', 500);
			}

			console.log(JSON.stringify({ msg: 'telemetry', id, service, event, level, ts, dataBytes }));

			return ok({ id, service, event, level }, 202);
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
