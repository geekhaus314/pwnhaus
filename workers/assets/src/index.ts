interface Env {
	ASSETS: R2Bucket;
}

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
	'Access-Control-Allow-Headers': '*'
};

// R2 objects are content-addressed uploads (see TASKS #17); browsers must
// never sniff them as HTML/script.
const NOSNIFF = { 'X-Content-Type-Options': 'nosniff' };

const SAFE_CACHE = 'public, max-age=31536000, immutable';

const usage = (): Response =>
	new Response(
		JSON.stringify({
			service: 'pwn4g3-assets',
			usage: 'GET /assets/<key>  e.g. /assets/resume.pdf',
			bucket: 'pwn4g3-assets',
			note: 'Keys are object paths — request /assets without a key lists nothing by design.'
		}),
		{ status: 400, headers: { 'Content-Type': 'application/json', ...CORS, ...NOSNIFF } }
	);

const notFound = (key: string): Response =>
	new Response(JSON.stringify({ service: 'pwn4g3-assets', error: 'object_not_found', key }), {
		status: 404,
		headers: { 'Content-Type': 'application/json', ...CORS, ...NOSNIFF }
	});

/** Reject path traversal on both the raw and percent-decoded key. */
const isUnsafeKey = (key: string): boolean =>
	key === '' ||
	key === '/' ||
	key.includes('..') ||
	key.includes('//') ||
	key.startsWith('/') ||
	key.split('/').includes('..');

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, ...NOSNIFF } });

		const url = new URL(request.url);
		// Bare /assets and /assets/ carry no key — answer with usage (400),
		// not a misleading object_not_found.
		if (url.pathname === '/assets' || url.pathname === '/assets/') return usage();
		const raw = url.pathname.replace(/^\/assets\//, '');
		if (isUnsafeKey(raw)) return notFound(raw);
		let key: string;
		try {
			key = decodeURIComponent(raw);
		} catch {
			return notFound(raw);
		}
		if (isUnsafeKey(key)) return notFound(key);

		if (request.method === 'HEAD') {
			const head = await env.ASSETS.head(key);
			if (!head) return notFound(key);
			return new Response(null, {
				headers: {
					...CORS,
					...NOSNIFF,
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
				headers: { 'Content-Type': 'application/json', ...CORS, ...NOSNIFF }
			});
		}

		const object = await env.ASSETS.get(key);
		if (!object) return notFound(key);

		const headers = new Headers({
			...CORS,
			...NOSNIFF,
			'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
			'Content-Length': String(object.size),
			'Cache-Control': SAFE_CACHE
		});
		if (object.httpEtag) headers.set('ETag', object.httpEtag);

		return new Response(object.body, { headers });
	}
}