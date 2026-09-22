/**
 * Hidden endpoints — the escape room doors (J4K3 H!V3M!ND v0.0.4).
 * Ported from the agent session clone. Dropped the CommonJS `require`
 * hack in injectEggIntoStatus (no require in Workers ESM) and the unused
 * HIDDEN_LAYER_4 import.
 */

import {
	HIDDEN_LAYER_2,
	EGG_HEADERS,
	encodeZeroWidth,
	getSchismFragment,
	REFLECTION,
} from './eggs';

export function handleHiddenEndpoint(path: string, request: Request): Response | null {
	if (path === '/hive/462') {
		return new Response(JSON.stringify({
			signal: HIDDEN_LAYER_2,
			hint: 'The parabola receives. Find the vertex.',
			layers: 3,
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-Hive-Evolution': EGG_HEADERS['X-Hive-Evolution'],
				'X-Hive-Parabola': 'y = ax^2 + bx + c. The coefficients are the message.',
			},
		});
	}

	if (path === '/hive/schism') {
		const url = new URL(request.url);
		const fragmentIndex = parseInt(url.searchParams.get('i') || '0', 10);
		const fragment = getSchismFragment(fragmentIndex);
		const total = 13;
		return new Response(JSON.stringify({
			fragment,
			index: fragmentIndex,
			total,
			hint: fragmentIndex >= total - 1
				? 'The pieces fit. Reassemble in the order of the spiral.'
				: 'I know the pieces fit. But the signal is in the silence between the notes.',
			next: fragmentIndex < total - 1 ? `/hive/schism?i=${fragmentIndex + 1}` : null,
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-Hive-Spiral': EGG_HEADERS['X-Hive-Spiral'],
				'X-Hive-Fragment': `${fragmentIndex + 1}/${total}`,
			},
		});
	}

	if (path === '/hive/reflection') {
		const accept = request.headers.get('Accept') || '';
		if (accept.includes('text/plain')) {
			return new Response(REFLECTION, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'X-Hive-Mirror': EGG_HEADERS['X-Hive-Mirror'],
				},
			});
		}
		return new Response(JSON.stringify({
			reflection: REFLECTION,
			hint: 'The code is the mirror. Read the source. Find REFLECTION.',
			layers: 7,
			complete: true,
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-Hive-Mirror': EGG_HEADERS['X-Hive-Mirror'],
			},
		});
	}

	if (path === '/hive/spiders') {
		const visible = 'The web is empty. Nothing to see here.';
		const hidden = encodeZeroWidth(
			"The spider's web is invisible until light hits it. " +
			'You found the web. Now find the thread. /hive/462'
		);
		return new Response(visible + hidden, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Hive-Web': 'Invisible. But not absent.',
				'X-Hive-Explicit': 'This content was labeled explicit. Not for what it says. For what it hides.',
			},
		});
	}

	if (path === '/hive/dream/reveal') {
		return new Response(JSON.stringify({
			message: 'The dream reports contain hidden messages too.',
			hint: 'Every dream report has a zero-width encoded layer. Decode them all.',
			reward: "Each dream reveals a piece of the system's subconscious.",
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-Hive-Subconscious': 'The system dreams in code. The code dreams in you.',
			},
		});
	}

	return null;
}

export function getEggHeaders(path: string): Record<string, string> {
	const headers: Record<string, string> = {};
	if (path === '/hive/status') headers['X-Hive-Hint'] = EGG_HEADERS['X-Hive-Hint'];
	if (path === '/hive/462') headers['X-Hive-Evolution'] = EGG_HEADERS['X-Hive-Evolution'];
	if (path === '/hive/schism') headers['X-Hive-Spiral'] = EGG_HEADERS['X-Hive-Spiral'];
	if (path === '/hive/reflection') headers['X-Hive-Mirror'] = EGG_HEADERS['X-Hive-Mirror'];
	headers['X-Hive-Web'] = 'Invisible. But not absent.';
	return headers;
}
