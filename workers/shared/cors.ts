export const corsHeaders = (additionalMethods?: string): Record<string, string> => ({
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': additionalMethods ?? 'GET, OPTIONS, POST',
	'Access-Control-Allow-Headers': 'Content-Type'
});

export const jsonResponse = (payload: unknown, status = 200, additionalMethods?: string): Response =>
	new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...corsHeaders(additionalMethods)
		}
	});

export const handleOptions = (request: Request, additionalMethods?: string): Response | null =>
	request.method === 'OPTIONS'
		? new Response(null, { status: 204, headers: corsHeaders(additionalMethods) })
		: null;

export const methodOr405 = (request: Request, method: string, name: string): Response | null =>
	request.method !== method ? jsonResponse({ error: 'method_not_allowed', route: name }, 405) : null;