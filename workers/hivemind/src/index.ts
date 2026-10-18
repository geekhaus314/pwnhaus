import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';
import { handleHiddenEndpoint, getEggHeaders } from './hidden';
import { encodeZeroWidth, encodeBase46, injectHiddenMessage } from './eggs';

/**
 * Hivemind escape-room service (#59, J4K3 H!V3M!ND v0.0.4).
 *
 * Phase 1: the 7-layer escape room chain only — zero-width web, base-46
 * evolution, parabola coefficients, Fibonacci rotation, schism fragments,
 * source-code reflection. No Durable Objects, no queue, no cron, no AI:
 * the neural/dream machinery from the agent session needs those bindings
 * and ships as phase 2.
 *
 * Every response carries invisible layers + hint headers by design.
 * Reached via the pwn4g3 gateway at /hive/*.
 */

const GREETING = [
	'J4K3 H!V3M!ND v0.0.4 // a serverless system that dreams',
	'',
	'Endpoints:',
	'  GET  /hive/status        status with an invisible layer (step 1)',
	'  GET  /hive/462           parabola signal (step 3)',
	'  GET  /hive/schism?i=N    one fragment per request (step 5)',
	'  GET  /hive/reflection    the final message (step 6)',
	'  GET  /hive/spiders       bonus: looks empty, decode it',
	'',
	'Headers are backup clues. The code is the mirror.',
	'',
].join('\n');

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		const url = new URL(request.url);
		const path = url.pathname;

		if (path === '/' || path === '/hive') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'root' }, 405);
			const withEgg = GREETING + encodeZeroWidth('The web is invisible. /hive/spiders');
			return new Response(withEgg, {
				headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Hive-Web': 'Invisible. But not absent.' }
			});
		}

		// Hidden doors first (they set their own hint headers).
		if (path.startsWith('/hive/')) {
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'hive' }, 'hive');
			if (limited) return limited;

			if (path === '/hive/status') {
				if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'hive-status' }, 405);
				const statusData = {
					service: 'pwn4g3-hivemind',
					name: 'J4K3 H!V3M!ND v0.0.4',
					layer: 'L1 - Cognitive (escape room phase)',
					chain: ['zero-width web', 'base-46 evolution', 'parabola', 'fibonacci rotation', 'schism fragments', 'source reflection'],
					hint: 'The web is invisible. Look between the characters.'
				};
				const withEggs = injectHiddenMessage(JSON.stringify(statusData), encodeBase46('/hive/462'));
				const res = new Response(withEggs, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
				const headers = new Headers(res.headers);
				for (const [k, v] of Object.entries(getEggHeaders(path))) headers.set(k, v);
				return new Response(res.body, { headers });
			}

			const hidden = handleHiddenEndpoint(path, request);
			if (hidden) {
				const headers = new Headers(hidden.headers);
				for (const [k, v] of Object.entries(getEggHeaders(path))) headers.set(k, v);
				return new Response(hidden.body, { status: hidden.status, headers });
			}
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
};
