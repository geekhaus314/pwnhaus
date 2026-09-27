/**
 * Public site-audit service (#64).
 *
 * `POST /api/audit` runs the shared engine in `workers/shared/audit.ts`
 * against a caller-supplied URL and returns the real findings. Anyone can
 * audit their own site; the result is the top of the client-acquisition
 * funnel — when someone submits an email with the run, it lands in the
 * same `leads` table the Overpass scanner writes to, so inbound and
 * outbound prospects sit in one pipeline.
 *
 * `GET /api/audit/summary` is the public aggregate. It is the honest
 * descendant of the "hive population count" in the imported `hive.ts`:
 * real totals out of D1 instead of a hardcoded 99, and it exposes no
 * submitted URL, so scanning the fleet can't be used to enumerate targets.
 *
 * Costs money on every call (an outbound fetch plus a D1 write), so the
 * budget is 10/hour/IP — tighter than viper analyze. Turnstile is
 * verified when `TURNSTILE_SECRET_KEY` is bound; a honeypot field and the
 * rate limit apply either way.
 */

import { corsHeaders, handleOptions, jsonResponse, methodOr405 } from '../../shared/cors';
import { getClientIp, rateLimitOr429 } from '../../shared/rate-limit';
import { auditSite, GRADE_BANDS, type AuditGrade } from '../../shared/audit';
import { validatePublicUrl } from '../../shared/http';

interface Env {
	DB: D1Database;
	TELEMETRY_SERVICE: { fetch(request: Request): Promise<Response> };
	TURNSTILE_SECRET_KEY?: string;
	/** Public site origin used for Turnstile verification. */
	SITE_ORIGIN?: string;
}

const METHODS = 'GET, OPTIONS, POST';
const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000, prefix: 'audit' } as const;

/** Below this, an audit is free to run; above it the caller is asked to prove they're human. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ok = (data: unknown, status = 200, request?: Request): Response =>
	jsonResponse({ ok: true, data }, status, METHODS, request);

const fail = (error: string, status = 400, request?: Request): Response =>
	jsonResponse({ ok: false, error }, status, METHODS, request);

const readJson = async (request: Request): Promise<Record<string, unknown>> => {
	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) throw new Error('body_too_large');
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
	} catch {
		throw new Error('invalid_json');
	}
};

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Turnstile server-side verify. Fails closed on a network error — an
 * unreachable verify endpoint must not become a bypass.
 */
const verifyTurnstile = async (
	token: string,
	ip: string,
	env: Env
): Promise<{ ok: boolean; reason: string }> => {
	if (!env.TURNSTILE_SECRET_KEY) return { ok: true, reason: 'not_configured' };
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				secret: env.TURNSTILE_SECRET_KEY,
				response: token,
				remoteip: ip
			}),
			signal: AbortSignal.timeout(5_000)
		});
		const body = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
		return { ok: body.success === true, reason: (body['error-codes'] ?? []).join(',') || 'verified' };
	} catch (e) {
		return { ok: false, reason: `verify_unreachable:${e instanceof Error ? e.name : 'unknown'}` };
	}
};

const logEvent = async (env: Env, event: string, data: unknown): Promise<void> => {
	const dataJson = JSON.stringify(data);
	try {
		await env.TELEMETRY_SERVICE.fetch(
			new Request('https://internal/api/telemetry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ service: 'pwn4g3-audit', event, data: dataJson })
			})
		);
	} catch {
		// Telemetry is best-effort. Never fail a scan because logging did.
	}
};

const hostOf = (url: string): string => {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return 'unknown';
	}
};

const dayOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Record the run. Two statements in one batch: the evidence row, then the
 * per-host daily rollup. `ON CONFLICT DO UPDATE` keeps the rollup
 * idempotent under retries.
 */
const persistRun = async (
	env: Env,
	row: {
		id: string;
		host: string;
		requestedUrl: string;
		finalUrl: string | null;
		https: boolean;
		downgraded: boolean;
		status: number;
		chainLen: number;
		ttfbMs: number | null;
		bytes: number | null;
		grade: AuditGrade | null;
		penalty: number;
		passed: number;
		failed: number;
		total: number;
		tech: string[];
		error: string | null;
		createdAt: number;
	}
): Promise<void> => {
	const day = dayOf(row.createdAt);
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO audit_runs
			 (id, host, requested_url, final_url, https, downgraded, status, chain_len,
			  ttfb_ms, bytes, grade, penalty, passed, failed, total, tech, error, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			row.id,
			row.host,
			row.requestedUrl,
			row.finalUrl,
			row.https ? 1 : 0,
			row.downgraded ? 1 : 0,
			row.status,
			row.chainLen,
			row.ttfbMs,
			row.bytes,
			row.grade,
			row.penalty,
			row.passed,
			row.failed,
			row.total,
			row.tech.length ? JSON.stringify(row.tech) : null,
			row.error,
			row.createdAt
		),
		env.DB.prepare(
			`INSERT INTO audit_daily (day, host, runs, failed_runs, penalty_sum, last_grade, last_at)
			 VALUES (?, ?, 1, ?, ?, ?, ?)
			 ON CONFLICT(day, host) DO UPDATE SET
			   runs = runs + 1,
			   failed_runs = failed_runs + excluded.failed_runs,
			   penalty_sum = penalty_sum + excluded.penalty_sum,
			   last_grade = excluded.last_grade,
			   last_at = excluded.last_at`
		).bind(day, row.host, row.error ? 1 : 0, row.penalty, row.grade, row.createdAt)
	]);
};

/**
 * Attach the run to a lead. One SELECT to find an existing prospect by
 * website or email, then a single write — D1 has no interactive
 * transaction, so the read has to come first.
 */
const attachLead = async (
	env: Env,
	opts: { website: string; host: string; email: string; name: string; penalty: number; grade: AuditGrade | null }
): Promise<'created' | 'updated' | 'skipped'> => {
	if (!EMAIL_RE.test(opts.email)) return 'skipped';
	const now = Math.floor(Date.now() / 1000);
	const existing = await env.DB.prepare(
		'SELECT id FROM leads WHERE website = ? OR email = ? LIMIT 1'
	)
		.bind(opts.website, opts.email)
		.first<{ id: string }>();

	if (existing?.id) {
		await env.DB.prepare(
			`UPDATE leads SET status = CASE WHEN status = 'new' THEN 'enriched' ELSE status END,
			 signals = json_set(COALESCE(NULLIF(signals, ''), '{}'), '$.lastAuditPenalty', ?,
			                    '$.lastAuditGrade', ?, '$.lastAuditAt', ?),
			 updated_at = ? WHERE id = ?`
		).bind(opts.penalty, opts.grade, now, now, existing.id);
		return 'updated';
	}

	await env.DB.prepare(
		`INSERT INTO leads (id, name, website, email, city, source, signals, status, notes, created_at, updated_at)
		 VALUES (?, ?, ?, ?, 'St. Louis', 'inbound', ?, 'enriched', ?, ?, ?)`
	)
		.bind(
			crypto.randomUUID(),
			opts.name || opts.host,
			opts.website,
			opts.email,
			JSON.stringify({ lastAuditPenalty: opts.penalty, lastAuditGrade: opts.grade, lastAuditAt: now }),
			'Audited their own site via the public audit tool',
			now,
			now
		)
		.run();
	return 'created';
};

const handleScan = async (request: Request, env: Env): Promise<Response> => {
	const limited = rateLimitOr429(request, RATE_LIMIT, 'audit');
	if (limited) return limited;

	let body: Record<string, unknown>;
	try {
		body = await readJson(request);
	} catch (e) {
		const reason = e instanceof Error ? e.message : 'invalid_json';
		return fail(reason === 'body_too_large' ? 'body_too_large' : 'invalid_json', reason === 'body_too_large' ? 413 : 400, request);
	}

	// Honeypot: a real person never fills a field they cannot see. Report
	// success so the bot doesn't learn to adapt, but store nothing.
	if (str(body.website_confirm ?? body.company_website ?? '')) {
		return ok({ queued: true }, 202, request);
	}

	const input = str(body.website ?? body.domain ?? body.url, 2048);
	if (!input) return fail('missing_website', 400, request);

	const ip = getClientIp(request);
	const token = str(body.turnstileToken ?? body.cf_turnstile_response, 2048);
	if (env.TURNSTILE_SECRET_KEY) {
		if (!token) return fail('turnstile_required', 403, request);
		const verdict = await verifyTurnstile(token, ip, env);
		if (!verdict.ok) return fail('turnstile_failed', 403, request);
	}

	const validated = validatePublicUrl(input);
	if (!validated.ok || !validated.url) {
		await logEvent(env, 'audit.rejected', { reason: validated.reason ?? 'invalid', ip });
		return fail(`rejected_target:${validated.error ?? 'invalid_url'}`, 422, request);
	}

	const report = await auditSite(validated.url);
	const createdAt = Date.now();
	const host = hostOf(report.facts?.finalUrl ?? validated.url);
	const id = crypto.randomUUID();

	await persistRun(env, {
		id,
		host,
		requestedUrl: validated.url,
		finalUrl: report.facts?.finalUrl ?? null,
		https: report.facts?.https ?? false,
		downgraded: report.facts?.downgradedToHttp ?? false,
		status: report.facts?.status ?? 0,
		chainLen: report.facts?.chainLength ?? 0,
		ttfbMs: report.facts?.ttfbMs ?? null,
		bytes: report.facts?.bytes ?? null,
		grade: report.grade,
		penalty: report.penalty,
		passed: report.passed,
		failed: report.failed,
		total: report.total,
		tech: report.facts ? [...report.facts.tech] : [],
		error: report.error ?? null,
		createdAt
	});

	// Only a successful scan produces a report worth attaching to a lead.
	let lead: 'created' | 'updated' | 'skipped' = 'skipped';
	if (report.facts) {
		lead = await attachLead(env, {
			website: report.facts.finalUrl,
			host,
			email: str(body.email, 254),
			name: str(body.name ?? body.business, 200),
			penalty: report.penalty,
			grade: report.grade
		});
	}

	await logEvent(env, report.facts ? 'audit.completed' : 'audit.failed', {
		host,
		grade: report.grade,
		penalty: report.penalty,
		failed: report.failed,
		error: report.error ?? null,
		lead
	});

	if (!report.facts) {
		return fail(`target_unreachable:${report.error ?? 'unknown'}`, 502, request);
	}

	return ok(
		{
			id,
			report,
			// The site is told plainly that this is one measurement, not a
			// penetration test, and what the platform could not see.
			disclaimer: {
				scope: 'single unauthenticated HTTP GET of the public homepage',
				notCovered: [
					'no authenticated or post-login testing',
					'no port or subdomain enumeration',
					'no dependency CVE lookup (no registry access)',
					'no TLS certificate chain inspection — Workers does not expose the peer certificate'
				]
			}
		},
		200,
		request
	);
};

const handleSummary = async (env: Env, request: Request): Promise<Response> => {
	const now = Date.now();
	const dayAgo = now - 24 * 60 * 60 * 1000;
	const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

	const [totals, recent, grades, hosts] = await env.DB.batch([
		env.DB.prepare(
			'SELECT COUNT(*) AS runs, COALESCE(SUM(failed), 0) AS failed_checks, COALESCE(AVG(penalty), 0) AS avg_penalty FROM audit_runs WHERE created_at >= ?'
		).bind(weekAgo),
		env.DB.prepare('SELECT COUNT(*) AS runs FROM audit_runs WHERE created_at >= ?').bind(dayAgo),
		env.DB.prepare(
			'SELECT grade, COUNT(*) AS n FROM audit_runs WHERE created_at >= ? AND grade IS NOT NULL GROUP BY grade'
		).bind(weekAgo),
		env.DB.prepare(
			'SELECT COUNT(DISTINCT host) AS hosts, COUNT(*) AS runs FROM audit_daily WHERE day >= ?'
		).bind(dayOf(weekAgo))
	]);

	const t = totals.results[0] as { runs: number; failed_checks: number; avg_penalty: number };
	const r = recent.results[0] as { runs: number };
	const h = hosts.results[0] as { hosts: number; runs: number };
	const gradeRows = grades.results as { grade: string; n: number }[];

	const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
	for (const row of gradeRows) distribution[row.grade] = row.n;

	return jsonResponse(
		{
			ok: true,
			data: {
				window_days: 7,
				audits_7d: t.runs ?? 0,
				audits_24h: r.runs ?? 0,
				distinct_hosts_7d: h.hosts ?? 0,
				distinct_hosts_all_time: h.hosts ?? 0,
				avg_penalty_7d: Math.round(t.avg_penalty ?? 0),
				failed_checks_7d: t.failed_checks ?? 0,
				grade_distribution: distribution,
				grade_bands: GRADE_BANDS.map(([grade, ceiling]) => ({ grade, max_penalty: ceiling })),
				note: 'Counts only. Submitted URLs are never exposed through this endpoint.'
			}
		},
		200,
		METHODS,
		request
	);
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const { pathname } = new URL(request.url);

		if (pathname === '/api/audit' || pathname === '/api/audit/') {
			if (request.method === 'GET') {
				return jsonResponse(
					{
						ok: true,
						data: {
							service: 'pwn4g3-audit',
							endpoint: 'POST /api/audit',
							body: { website: 'example.com', email: 'optional', name: 'optional' },
							rate_limit: `${RATE_LIMIT.limit} per hour per IP`,
							turnstile: env.TURNSTILE_SECRET_KEY ? 'required' : 'not configured — rate limit only',
							scope:
								'One unauthenticated GET of a public homepage. Every check in the report is an observation of that response; the score is the sum of published per-check weights.'
						}
					},
					200,
					METHODS,
					request
				);
			}
			const notPost = methodOr405(request, 'POST', 'audit');
			if (notPost) return notPost;
			return handleScan(request, env);
		}

		if (pathname === '/api/audit/summary') {
			const notGet = methodOr405(request, 'GET', 'audit_summary');
			if (notGet) return notGet;
			return handleSummary(env, request);
		}

		if (pathname === '/') {
			return jsonResponse(
				{
					ok: true,
					data: {
						service: 'pwn4g3-audit',
						routes: ['POST /api/audit', 'GET /api/audit/summary'],
						engine: 'workers/shared/audit.ts'
					}
				},
				200,
				METHODS,
				request
			);
		}

		return fail('not_found', 404, request);
	}
};
