import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';
import { viperAuditPlan } from '../../shared/commands';

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

const analyzeSolidity = (source: string) =>
	checks
		.filter((check) => check.pattern.test(source))
		.map(({ pattern, ...finding }) => finding);

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/viper-web3') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'viper-info' }, 405);
			const limited = rateLimitOr429(
				request,
				{ limit: 60, windowMs: 60_000, prefix: 'viper-info' },
				'viper-info'
			);
			if (limited) return limited;
			return jsonResponse({
				service: 'viper-web3',
				status: 'available',
				mode: 'read-only-audit',
				network: 'chain-agnostic',
				endpoints: { analyze: 'POST /api/viper-web3/analyze', plan: 'POST /api/viper-web3/analyze?plan=1' },
				disclaimer: 'Heuristic triage only; run Foundry, Slither, Mythril, and human review for an audit.',
				note: 'Internal service, reached via the pwn4ge gateway.'
			});
		}

		if (url.pathname === '/api/viper-web3/analyze') {
			if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed', route: 'viper-analyze' }, 405);

			// Expensive route: 10 analyses/min per client IP.
			const limited = rateLimitOr429(
				request,
				{ limit: 10, windowMs: 60_000, prefix: 'viper-analyze' },
				'viper-analyze'
			);
			if (limited) return limited;

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return jsonResponse({ error: 'invalid_json' }, 400);
			}
			if (!body || typeof body !== 'object' || !('source' in body) || typeof body.source !== 'string') {
				return jsonResponse({ error: 'source_string_required' }, 400);
			}
			const source = body.source;
			if (source.length === 0 || source.length > 200_000) {
				return jsonResponse({ error: 'source_must_be_between_1_and_200000_characters' }, 413);
			}
			const wantPlan = 'plan' in body && body.plan === true;

			const findings = analyzeSolidity(source);
			return jsonResponse({
				service: 'viper-web3',
				mode: 'read-only-audit',
				findings,
				summary: { findingCount: findings.length, analyzedCharacters: source.length },
				...(wantPlan
					? {
							pipeline: viperAuditPlan(source, '0.8.20')
						}
					: {})
			});
		}

		if (url.pathname === '/health') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'health' }, 405);
			return jsonResponse({ service: 'viper-web3', status: 'ok' });
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
}