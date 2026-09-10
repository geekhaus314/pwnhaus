import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Telemetry ingestion service (#22).
 *
 * Internal service, reached via the pwn4g3 gateway at POST /api/telemetry.
 * Stateless accept-and-log: validates a small JSON envelope, emits a
 * structured log line (visible in Workers Logs / Tail), returns 202.
 * No durable store yet — wire Analytics Engine or R2 when retention is needed.
 */

const MAX_BODY_BYTES = 64 * 1024;
const MAX_DATA_BYTES = 32 * 1024;
const MAX_SERVICE_LEN = 64;
const MAX_EVENT_LEN = 128;

const LEVELS = new Set(['debug', 'info', 'warn', 'error']);

const SERVICE_RE = /^[a-z0-9][a-z0-9\-_:.]*$/i;

interface TelemetryBody {
	service?: unknown;
	event?: unknown;
	level?: unknown;
	data?: unknown;
	ts?: unknown;
}

const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request, 'GET, OPTIONS, POST');
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
				return jsonResponse(
					{
						service: 'pwn4g3-telemetry',
						ingest: 'POST /api/telemetry',
						envelope: '{ service: string, event: string, level?: debug|info|warn|error, data?: json, ts?: string }',
						limits: { bodyBytes: MAX_BODY_BYTES, dataBytes: MAX_DATA_BYTES, postPerMinPerIp: 30 },
						note: 'Internal service, reached via the pwn4g3 gateway.'
					},
					200,
					'GET, OPTIONS, POST'
				);
			}

			if (request.method !== 'POST') {
				return jsonResponse({ error: 'method_not_allowed', route: 'telemetry-ingest' }, 405, 'GET, OPTIONS, POST');
			}

			const limited = rateLimitOr429(
				request,
				{ limit: 30, windowMs: 60_000, prefix: 'telemetry-ingest' },
				'telemetry-ingest'
			);
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) {
				return jsonResponse({ error: 'payload_too_large' }, 413, 'GET, OPTIONS, POST');
			}

			let body: TelemetryBody;
			try {
				body = (await request.json()) as TelemetryBody;
			} catch {
				return jsonResponse({ error: 'invalid_json' }, 400, 'GET, OPTIONS, POST');
			}

			if (!body || typeof body !== 'object') {
				return jsonResponse({ error: 'envelope_object_required' }, 400, 'GET, OPTIONS, POST');
			}

			const { service, event, level = 'info', data = null, ts = null } = body;

			if (typeof service !== 'string' || service.length === 0 || service.length > MAX_SERVICE_LEN || !SERVICE_RE.test(service)) {
				return jsonResponse({ error: 'service_string_required' }, 400, 'GET, OPTIONS, POST');
			}
			if (typeof event !== 'string' || event.length === 0 || event.length > MAX_EVENT_LEN) {
				return jsonResponse({ error: 'event_string_required' }, 400, 'GET, OPTIONS, POST');
			}
			if (typeof level !== 'string' || !LEVELS.has(level)) {
				return jsonResponse({ error: 'level_must_be_debug_info_warn_error' }, 400, 'GET, OPTIONS, POST');
			}
			if (ts !== null && (typeof ts !== 'string' || ts.length > 32)) {
				return jsonResponse({ error: 'ts_must_be_short_string' }, 400, 'GET, OPTIONS, POST');
			}

			let dataBytes = 0;
			if (data !== null && data !== undefined) {
				try {
					dataBytes = utf8Bytes(JSON.stringify(data));
				} catch {
					return jsonResponse({ error: 'data_must_be_json_serializable' }, 400, 'GET, OPTIONS, POST');
				}
				if (dataBytes > MAX_DATA_BYTES) {
					return jsonResponse({ error: 'data_too_large' }, 413, 'GET, OPTIONS, POST');
				}
			}

			const id = crypto.randomUUID();
			console.log(
				JSON.stringify({ msg: 'telemetry', id, service, event, level, ts, dataBytes })
			);

			return jsonResponse(
				{ received: true, id, service, event, level },
				202,
				'GET, OPTIONS, POST'
			);
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'root' }, 405);
			return jsonResponse({
				service: 'pwn4g3-telemetry',
				endpoints: { ingest: 'POST /api/telemetry', info: 'GET /api/telemetry' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
};
