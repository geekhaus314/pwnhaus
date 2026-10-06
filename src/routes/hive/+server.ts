import { GATEWAY_BASE } from '$lib/config';

export const prerender = false;

export const GET = async ({ url }: { url: URL }): Promise<Response> => {
	const res: Response = await fetch(`${GATEWAY_BASE}/hive${url.search}`, { headers: { 'user-agent': 'pwn4g3-pages' } });
	return new Response(res.body, { status: res.status, headers: res.headers });
};
