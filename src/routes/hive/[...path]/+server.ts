import { GATEWAY_BASE } from '$lib/config';

export const prerender = false;

const passthrough = async (request: Request, path: string, search: string): Promise<Response> => {
	const upstream: string = `${GATEWAY_BASE}/hive/${path}${search}`;
	const headers: Headers = new Headers();
	const ua: string | null = request.headers.get('user-agent');
	if (ua) headers.set('user-agent', ua);
	const accept: string | null = request.headers.get('accept');
	if (accept) headers.set('accept', accept);
	const res: Response = await fetch(upstream, {
		method: request.method,
		headers,
		body: request.method === 'POST' ? await request.clone().text() : undefined,
	});
	const outHeaders: Headers = new Headers(res.headers);
	outHeaders.set('Cache-Control', 'no-store');
	return new Response(res.body, { status: res.status, statusText: res.statusText, headers: outHeaders });
};

export const GET = ({ request, params, url }: { request: Request; params: { path: string }; url: URL }): Promise<Response> =>
	passthrough(request, params.path, url.search);

export const POST = ({ request, params, url }: { request: Request; params: { path: string }; url: URL }): Promise<Response> =>
	passthrough(request, params.path, url.search);
