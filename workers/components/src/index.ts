import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

const components = [
	{ name: 'rust', contract: '/health', port: 4101 },
	{ name: 'go', contract: '/health', port: 4102 },
	{ name: 'ruby', contract: '/health', port: 4103 }
];

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		const limited = rateLimitOr429(
			request,
			{ limit: 60, windowMs: 60_000, prefix: 'components' },
			'components'
		);
		if (limited) return limited;

		const url = new URL(request.url);

		if (url.pathname === '/api/components') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'components' }, 405);
			return jsonResponse({ service: 'pwn4g3-components', components });
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'root' }, 405);
			return jsonResponse({
				service: 'pwn4g3-components',
				endpoints: { components: 'GET /api/components' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
}