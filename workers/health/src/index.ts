import { jsonResponse, handleOptions, methodOr405 } from '../../shared/cors';

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/health') {
			const denied = methodOr405(request, 'GET', 'health');
			if (denied) return denied;
			return jsonResponse({ service: 'pwn4ge-health', status: 'ok', storage: 'static' });
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'root' }, 405);
			return jsonResponse({
				service: 'pwn4ge-health',
				endpoint: 'GET /health',
				note: 'Internal service, reached via the pwn4ge gateway.'
			});
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
}