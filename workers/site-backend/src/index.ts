interface Env {
	ASSETS: R2Bucket;
}

const json = (payload: unknown, status = 200): Response =>
	new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: json({}).headers });
		if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

		const url = new URL(request.url);
		if (url.pathname === '/health') {
			return json({ service: 'pwn4g3-site-backend', status: 'ok', storage: 'r2' });
		}
		if (url.pathname === '/api/components') {
			return json({
				components: [
					{ name: 'rust', contract: '/health', port: 4101 },
					{ name: 'go', contract: '/health', port: 4102 },
					{ name: 'ruby', contract: '/health', port: 4103 }
				]
			});
		}
		if (url.pathname.startsWith('/assets/')) {
			const object = await env.ASSETS.get(url.pathname.slice('/assets/'.length));
			if (!object) return json({ error: 'asset_not_found' }, 404);
			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set('Cache-Control', 'public, max-age=31536000, immutable');
			return new Response(object.body, { headers });
		}

		return json({ error: 'not_found' }, 404);
	}
};
