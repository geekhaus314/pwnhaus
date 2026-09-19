import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Fleet inventory (fix 4): this used to return a fictional
 * rust/go/ruby + localhost-port stub. It now describes the real
 * gateway-routed fleet so the portfolio's "runs on real infra" panel
 * and any status consumer read truth, not placeholders.
 *
 * No service bindings here on purpose — liveness stays with each
 * service's own `/health`-style probe (and the scheduler's uptime
 * checks). This endpoint is the static contract map; keep `name` +
 * `contract` keys stable for consumers.
 */
const components = [
	{ name: 'pwn4g3', contract: 'GET /', route: '/', via: 'gateway' },
	{ name: 'pwn4g3-health', contract: 'GET /health', route: '/health', via: 'gateway' },
	{ name: 'pwn4g3-components', contract: 'GET /api/components', route: '/api/components', via: 'gateway' },
	{ name: 'pwn4g3-viper', contract: 'GET /api/viper-web3', route: '/api/viper-web3', via: 'gateway' },
	{ name: 'pwn4g3-assets', contract: 'GET /assets/*', route: '/assets/<key>', via: 'gateway' },
	{ name: 'pwn4g3-booking', contract: 'GET /api/booking', route: '/api/booking', via: 'gateway' },
	{ name: 'pwn4g3-telemetry', contract: 'GET /api/telemetry', route: '/api/telemetry', via: 'gateway' },
	{ name: 'pwn4g3-notify', contract: 'GET /api/notify', route: '/api/notify', via: 'gateway' },
	{ name: 'pwn4g3-discord', contract: 'POST /api/discord/interactions', route: '/api/discord', via: 'gateway' },
	{ name: 'pwn4g3-reddit', contract: 'GET /api/reddit/modmail', route: '/api/reddit', via: 'gateway' },
	{ name: 'pwn4g3-admin', contract: 'GET /admin', route: '/admin', via: 'gateway' },
	{ name: 'pwn4g3-scheduler', contract: 'cron', route: 'internal', via: 'cron' }
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