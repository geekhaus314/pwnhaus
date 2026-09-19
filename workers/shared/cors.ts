/**
 * Shared CORS helpers.
 *
 * Public GET/info routes intentionally stay `Access-Control-Allow-Origin: *`
 * (portfolio CDN + health probes). State-changing POST routes (booking,
 * telemetry) must pass their `request` in so the response echoes the site
 * origin instead of `*` — see `getCorsOrigin`. Telemetry additionally
 * enforces the allowlist server-side (Origin present => must match;
 * absent => internal `pwn4g3-*` services only).
 */

export const ALLOWED_ORIGINS: readonly string[] = [
	'https://pwn4g3.pages.dev',
	'https://pwn4g3.geekhaus314.workers.dev'
];

const isLocalDevOrigin = (origin: string): boolean =>
	origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

export const isAllowedOrigin = (origin: string | null): boolean => {
	if (!origin) return false;
	if (isLocalDevOrigin(origin)) return true;
	return (ALLOWED_ORIGINS as readonly string[]).includes(origin);
};

/**
 * Resolve the value for `Access-Control-Allow-Origin`.
 * Allowed site origins are echoed back (with `Vary: Origin`); everything
 * else falls back to `*` so public GETs keep working and POST gates
 * (Turnstile / admin bearer / telemetry origin check) stay authoritative.
 */
export const getCorsOrigin = (request?: Request): string => {
	if (!request) return '*';
	const origin = request.headers.get('origin');
	if (origin && isAllowedOrigin(origin)) return origin;
	return '*';
};

export const corsHeaders = (additionalMethods?: string, request?: Request): Record<string, string> => ({
	'Access-Control-Allow-Origin': getCorsOrigin(request),
	'Access-Control-Allow-Methods': additionalMethods ?? 'GET, OPTIONS, POST',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Vary': 'Origin'
});

export const jsonResponse = (
	payload: unknown,
	status = 200,
	additionalMethods?: string,
	request?: Request
): Response =>
	new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(additionalMethods, request)
		}
	});

export const handleOptions = (request: Request, additionalMethods?: string): Response | null =>
	request.method === 'OPTIONS'
		? new Response(null, { status: 204, headers: corsHeaders(additionalMethods, request) })
		: null;

export const methodOr405 = (request: Request, method: string, name: string): Response | null =>
	request.method !== method ? jsonResponse({ error: 'method_not_allowed', route: name }, 405) : null;