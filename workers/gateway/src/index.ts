import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

interface Env {
	HEALTH_SERVICE: { fetch(request: Request): Promise<Response> };
	COMPONENTS_SERVICE: { fetch(request: Request): Promise<Response> };
	VIPER_SERVICE: { fetch(request: Request): Promise<Response> };
	ASSETS_SERVICE: { fetch(request: Request): Promise<Response> };
	PWN4G3_ASSETS_URL?: string;
}

const route = (path: string, prefix: string): boolean =>
	path === prefix || path.startsWith(prefix + '/');

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		// Global abuse guard: 120 req/min per client IP across all routes.
		const limited = rateLimitOr429(request, { limit: 120, windowMs: 60_000, prefix: 'gw' }, 'gateway');
		if (limited) return limited;

		const url = new URL(request.url);
		const { pathname } = url;

		if (route(pathname, '/health')) return env.HEALTH_SERVICE.fetch(request);
		if (route(pathname, '/api/components')) return env.COMPONENTS_SERVICE.fetch(request);
		if (route(pathname, '/api/viper-web3')) return env.VIPER_SERVICE.fetch(request);
		if (pathname.startsWith('/assets/')) return env.ASSETS_SERVICE.fetch(request);

		if (pathname === '/') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'root' }, 405);
			return jsonResponse({
				service: 'pwn4ge',
				site: 'https://pwn4g3.pages.dev',
				status: 'available',
				architecture: 'gateway -> service bindings (health, components, viper, assets)',
				assets: env.PWN4G3_ASSETS_URL ?? null,
				endpoints: {
					health: 'GET /health',
					components: 'GET /api/components',
					viper: 'GET /api/viper-web3',
					analysis: 'POST /api/viper-web3/analyze',
					plan: 'POST /api/viper-web3/analyze  { "source": "...", "plan": true }',
					assets: 'GET /assets/*  (R2 bucket pwn4g3-assets)'
				}
			});
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
}