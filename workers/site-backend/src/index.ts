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

const analyzeSolidity = (source: string) => {
	const checks = [
		{
			id: 'tx-origin',
			severity: 'high',
			pattern: /\btx\.origin\b/,
			title: 'tx.origin is used for authorization',
			recommendation: 'Use msg.sender for authorization decisions.'
		},
		{
			id: 'unchecked-call',
			severity: 'high',
			pattern: /\.call\s*(?:\{[^}]*\})?\s*\(/,
			title: 'Low-level call requires return-value handling',
			recommendation: 'Check the success value and returned data, or use a typed interface.'
		},
		{
			id: 'delegatecall',
			severity: 'high',
			pattern: /\.delegatecall\s*\(/,
			title: 'delegatecall can execute code in the caller context',
			recommendation: 'Restrict targets and document storage-layout and upgrade assumptions.'
		},
		{
			id: 'selfdestruct',
			severity: 'high',
			pattern: /\bselfdestruct\s*\(/,
			title: 'Contract destruction is present',
			recommendation: 'Review whether destruction is required and protect it with explicit authorization.'
		},
		{
			id: 'block-timestamp',
			severity: 'medium',
			pattern: /\bblock\.timestamp\b/,
			title: 'Block timestamp influences behavior',
			recommendation: 'Do not use timestamps for precise randomness or security-critical deadlines.'
		},
		{
			id: 'reentrancy-surface',
			severity: 'medium',
			pattern: /\b(nonReentrant|ReentrancyGuard)\b/,
			title: 'Reentrancy protection should be verified at external call sites',
			recommendation: 'Confirm checks-effects-interactions ordering and guard every sensitive entry point.'
		}
	];

	return checks
		.filter((check) => check.pattern.test(source))
		.map(({ pattern, ...finding }) => finding);
};

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: json({}).headers });
		if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

		const url = new URL(request.url);
		if (url.pathname === '/health') {
			return json({ service: 'pwn4ge', status: 'ok', storage: 'static' });
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
		if (url.pathname === '/api/viper-web3') {
			return json({
				service: 'viper-web3',
				status: 'available',
				mode: 'read-only-audit',
				network: 'chain-agnostic',
				endpoints: {
					analyze: 'POST /api/viper-web3/analyze',
					health: 'GET /health'
				},
				disclaimer: 'Heuristic triage only; run Foundry, Slither, Mythril, and human review for an audit.'
			});
		}
		if (url.pathname === '/api/viper-web3/analyze') {
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return json({ error: 'invalid_json' }, 400);
			}
			if (!body || typeof body !== 'object' || !('source' in body) || typeof body.source !== 'string') {
				return json({ error: 'source_string_required' }, 400);
			}
			if (body.source.length === 0 || body.source.length > 200_000) {
				return json({ error: 'source_must_be_between_1_and_200000_characters' }, 413);
			}
			const findings = analyzeSolidity(body.source);
			return json({
				service: 'viper-web3',
				mode: 'read-only-audit',
				findings,
				summary: { findingCount: findings.length, analyzedCharacters: body.source.length }
			});
		}
		return json({ error: 'not_found' }, 404);
	}
};
