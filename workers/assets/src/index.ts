interface Env {
	ASSETS: R2Bucket;
}

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
	'Access-Control-Allow-Headers': '*'
};

const SAFE_CACHE = 'public, max-age=31536000, immutable';

const notFound = (key: string): Response =>
	new Response(JSON.stringify({ service: 'pwn4ge-assets', error: 'object_not_found', key }), {
		status: 404,
		headers: { 'Content-Type': 'application/json', ...CORS }
	});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

		const url = new URL(request.url);
		const raw = url.pathname.replace(/^\/assets\//, '');
		if (!raw || raw.includes('..') || raw.includes('//')) return notFound(raw);
		const key = decodeURIComponent(raw);

		if (request.method === 'HEAD') {
			const head = await env.ASSETS.head(key);
			if (!head) return notFound(key);
			return new Response(null, {
				headers: {
					...CORS,
					'Content-Type': head.httpMetadata?.contentType ?? 'application/octet-stream',
					'Content-Length': String(head.size),
					ETag: head.httpEtag ?? '',
					'Cache-Control': SAFE_CACHE
				}
			});
		}

		if (request.method !== 'GET') {
			return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
				status: 405,
				headers: { 'Content-Type': 'application/json', ...CORS }
			});
		}

		const object = await env.ASSETS.get(key);
		if (!object) return notFound(key);

		const headers = new Headers({
			...CORS,
			'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
			'Content-Length': String(object.size),
			'Cache-Control': SAFE_CACHE
		});
		if (object.httpEtag) headers.set('ETag', object.httpEtag);

		return new Response(object.body, { headers });
	}
}