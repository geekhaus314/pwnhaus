/**
 * Website audit engine (#63).
 *
 * One engine, two views:
 *
 *  - `auditSite()` — the public, visitor-facing report. Every check is an
 *    observation of a real HTTP response. Each check carries its own
 *    published weight, and the grade is a documented function of the
 *    checks that failed. Nothing here is a constant standing in for a
 *    measurement.
 *  - `scoreSite()` (re-exported from `admin-console/src/score.ts`) — the
 *    internal lead-desk view, which sums only the 17 legacy check ids so
 *    its 0–100 "redesign need" number and its `pains[]` strings stay
 *    byte-identical. The outreach drafts (#55) quote those strings.
 *
 * ## Platform limits, stated rather than papered over
 *
 * Workers do not expose the peer certificate to `fetch`. A successful
 * HTTPS probe means the edge runtime completed a handshake with its own
 * trust store — it does **not** mean we read `notAfter`, the SAN list, or
 * the chain. So there is no certificate-expiry check here, and the report
 * says so instead of implying one. Everything the report asserts is
 * something it can show you the evidence for.
 *
 * Origin: absorbs the `capture.ts` + `hive.ts` pair from a downloaded
 * patch set, which returned `sslValid: true` and a hardcoded 0/99
 * "security score" derived from whether an HTTP status was 2xx. Those
 * fields are gone because they were not measurements.
 */

import { safeFetch, type FetchError } from './http';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type CheckSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type CheckCategory =
	| 'transport'
	| 'headers'
	| 'mobile'
	| 'seo'
	| 'weight'
	| 'legacy-code'
	| 'contact'
	| 'structure';

export interface AuditCheck {
	/** Stable id. The legacy 17 are load-bearing for `scoreSite()`. */
	readonly id: string;
	readonly label: string;
	readonly category: CheckCategory;
	readonly status: CheckStatus;
	/** One sentence naming the observed value, e.g. "TTFB 2.4s". */
	readonly detail: string;
	/** The measured quantity itself, when there is a number worth keeping. */
	readonly value?: number;
	/** Redesign-need weight. 0 = no redesign signal, only a security note. */
	readonly points: number;
	readonly severity: CheckSeverity;
}

export interface AuditFacts {
	readonly requestedUrl: string;
	readonly finalUrl: string;
	readonly redirectChain: readonly string[];
	readonly chainLength: number;
	/** True if any hop left https for http. */
	readonly downgradedToHttp: boolean;
	readonly https: boolean;
	readonly status: number;
	readonly ttfbMs: number;
	readonly bytes: number;
	readonly truncated: boolean;
	readonly contentType: string | null;
	readonly server: string | null;
	readonly poweredBy: string | null;
	/** Security-relevant response headers, lowercased keys. */
	readonly headers: Readonly<Record<string, string>>;
	readonly tech: readonly string[];
	readonly title: string | null;
	readonly email: string | null;
	readonly phone: string | null;
	readonly scannedAt: number;
}

export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AuditReport {
	readonly ok: boolean;
	readonly facts: AuditFacts | null;
	readonly checks: readonly AuditCheck[];
	readonly passed: number;
	readonly total: number;
	readonly failed: number;
	readonly warned: number;
	/** Weighted badness: failed points + half of warned points. */
	readonly penalty: number;
	readonly grade: AuditGrade | null;
	readonly error?: FetchError;
	readonly reason?: string;
}

const MAX_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 10_000;

/** Grade thresholds over `penalty`. Published in the UI, not hidden here. */
export const GRADE_BANDS: readonly (readonly [AuditGrade, number])[] = [
	['A', 5],
	['B', 15],
	['C', 30],
	['D', 50]
];

export const gradeFor = (penalty: number): AuditGrade => {
	for (const [grade, ceiling] of GRADE_BANDS) if (penalty <= ceiling) return grade;
	return 'F';
};

const HEADER_KEYS = [
	'strict-transport-security',
	'content-security-policy',
	'content-security-policy-report-only',
	'x-content-type-options',
	'x-frame-options',
	'referrer-policy',
	'permissions-policy',
	'cross-origin-opener-policy',
	'cross-origin-resource-policy',
	'server',
	'x-powered-by'
] as const;

const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;

const check = (
	id: string,
	label: string,
	category: CheckCategory,
	failed: boolean,
	detail: string,
	points: number,
	severity: CheckSeverity
): AuditCheck => ({
	id,
	label,
	category,
	status: failed ? 'fail' : 'pass',
	detail,
	points,
	severity
});

const collectTech = (html: string): string[] => {
	const tech: string[] = [];
	if (/wp-content|wp-includes/i.test(html)) tech.push('wordpress');
	if (/wix\.com|\.wixstatic/i.test(html)) tech.push('wix');
	if (/squarespace/i.test(html)) tech.push('squarespace');
	if (/godaddy/i.test(html)) tech.push('godaddy');
	if (/shopify/i.test(html)) tech.push('shopify');
	if (/react|next\/|__next/i.test(html)) tech.push('react');
	if (/jquery/i.test(html)) tech.push('jquery');
	if (/bootstrap/i.test(html)) tech.push('bootstrap');
	if (/tailwind/i.test(html)) tech.push('tailwind');
	if (/\bsvelte|svelte-kit/i.test(html)) tech.push('sveltekit');
	return tech;
};

/**
 * Fetch a URL and score it. Never throws: an unreachable or blocked
 * target comes back as `ok: false` with an error taxonomy entry, because
 * this runs inside a public request handler.
 */
export const auditSite = async (
	target: string,
	{ timeoutMs = FETCH_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<AuditReport> => {
	const empty: Omit<AuditReport, 'error' | 'reason'> = {
		ok: false,
		facts: null,
		checks: [],
		passed: 0,
		total: 0,
		failed: 0,
		warned: 0,
		penalty: 0,
		grade: null
	};

	const res = await safeFetch(target, {
		timeoutMs,
		maxBytes: MAX_BYTES,
		headers: { Accept: 'text/html,application/xhtml+xml' }
	});

	if (!res.ok && res.error) {
		return { ...empty, error: res.error, reason: res.reason ?? 'fetch_failed' };
	}

	const contentType = res.headers.get('content-type');
	if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
		return { ...empty, error: 'http_error', reason: `content_type_${contentType.split(';')[0]}` };
	}

	// Two views of the same bytes: `raw` for extraction (case matters for
	// the <title>), `html` for pattern matching (case-insensitive).
	const raw = new TextDecoder().decode(res.body);
	const html = raw.toLowerCase();

	const chain = [...res.chain];
	const finalUrl = res.finalUrl;
	const https = finalUrl.toLowerCase().startsWith('https://');
	const downgradedToHttp =
		chain.length > 1 && chain[0].toLowerCase().startsWith('https://') && !https;

	const headers: Record<string, string> = {};
	for (const key of HEADER_KEYS) {
		const v = res.headers.get(key);
		if (v) headers[key] = v.slice(0, 300);
	}

	const facts: AuditFacts = {
		requestedUrl: target,
		finalUrl,
		redirectChain: chain,
		chainLength: chain.length,
		downgradedToHttp,
		https,
		status: res.status,
		ttfbMs: res.ttfbMs,
		bytes: res.bytes,
		truncated: res.truncated,
		contentType,
		server: res.headers.get('server'),
		poweredBy: res.headers.get('x-powered-by'),
		headers,
		tech: collectTech(html),
		title: /<title>([^<]{1,140})<\/title>/i.exec(raw)?.[1]?.trim() ?? null,
		email: /mailto:([^\s"'<>]+@[^\s"'<>]+)/i.exec(raw)?.[1]?.slice(0, 254) ?? null,
		phone: /tel:([+\d][\d\s().-]{6,})/i.exec(raw)?.[1]?.slice(0, 64) ?? null,
		scannedAt: Date.now()
	};

	const checks: AuditCheck[] = [];
	const ttfbSec = res.ttfbMs / 1000;

	// -- transport ---------------------------------------------------------
	checks.push(
		check(
			'https',
			'HTTPS transport',
			'transport',
			!https,
			https
				? `Served over HTTPS at ${new URL(finalUrl).host}`
				: 'Final URL is plain HTTP — browsers label the site "Not secure"',
			15,
			'critical'
		)
	);
	checks.push(
		check(
			'redirect_chain',
			'Redirect chain',
			'transport',
			chain.length > 3,
			chain.length === 1
				? 'Direct hit, no redirects'
				: `${chain.length} hops: ${chain.map((u) => new URL(u).host).join(' → ')}`,
			chain.length > 3 ? 4 : 0,
			'low'
		)
	);
	checks.push(
		check(
			'tls_downgrade',
			'TLS downgrade',
			'transport',
			downgradedToHttp,
			downgradedToHttp
				? 'Chain starts on HTTPS and ends on HTTP — downgrade detected'
				: 'No HTTPS→HTTP downgrade in the chain',
			downgradedToHttp ? 10 : 0,
			'critical'
		)
	);
	checks.push({
		id: 'ttfb',
		label: 'Server response time',
		category: 'transport',
		status: res.ttfbMs > 1500 ? 'fail' : 'pass',
		detail: `TTFB ${ttfbSec.toFixed(2)}s (HTTP ${res.status})`,
		value: res.ttfbMs,
		points: res.ttfbMs > 1500 ? 8 : 0,
		severity: res.ttfbMs > 1500 ? 'high' : 'info'
	});

	// -- security headers --------------------------------------------------
	const hsts = headers['strict-transport-security'];
	checks.push({
		id: 'hsts',
		label: 'HSTS',
		category: 'headers',
		status: https ? (hsts ? 'pass' : 'warn') : 'unknown',
		detail: hsts
			? `Strict-Transport-Security: ${hsts.slice(0, 60)}`
			: https
				? 'No Strict-Transport-Security header'
				: 'Not applicable — site is not on HTTPS',
		points: https && !hsts ? 4 : 0,
		severity: 'medium'
	});
	const csp = headers['content-security-policy'];
	checks.push({
		id: 'csp',
		label: 'Content-Security-Policy',
		category: 'headers',
		status: csp ? (csp.includes("'unsafe-inline'") ? 'warn' : 'pass') : 'fail',
		detail: csp
			? csp.includes("'unsafe-inline'")
				? "CSP present but allows 'unsafe-inline'"
				: 'CSP present with no unsafe-inline'
			: 'No Content-Security-Policy header',
		points: csp ? (csp.includes("'unsafe-inline'") ? 2 : 0) : 5,
		severity: 'high'
	});
	checks.push(
		check(
			'nosniff',
			'X-Content-Type-Options',
			'headers',
			headers['x-content-type-options']?.toLowerCase() !== 'nosniff',
			headers['x-content-type-options']
				? `X-Content-Type-Options: ${headers['x-content-type-options']}`
				: 'Missing — MIME sniffing not disabled',
			headers['x-content-type-options'] ? 0 : 3,
			'medium'
		)
	);
	checks.push(
		check(
			'clickjacking',
			'Clickjacking protection',
			'headers',
			!headers['x-frame-options'] && !csp?.includes('frame-ancestors'),
			headers['x-frame-options']
				? `X-Frame-Options: ${headers['x-frame-options']}`
				: csp?.includes('frame-ancestors')
					? 'frame-ancestors set via CSP'
					: 'No X-Frame-Options and no CSP frame-ancestors',
			headers['x-frame-options'] || csp?.includes('frame-ancestors') ? 0 : 4,
			'medium'
		)
	);
	checks.push(
		check(
			'referrer_policy',
			'Referrer-Policy',
			'headers',
			!headers['referrer-policy'],
			headers['referrer-policy']
				? `Referrer-Policy: ${headers['referrer-policy']}`
				: 'Missing — full URLs leak to third parties',
			headers['referrer-policy'] ? 0 : 2,
			'low'
		)
	);
	checks.push({
		id: 'version_disclosure',
		label: 'Version disclosure',
		category: 'headers',
		status: facts.server || facts.poweredBy ? 'warn' : 'pass',
		detail: facts.poweredBy
			? `Server: ${facts.server ?? 'unknown'} · X-Powered-By: ${facts.poweredBy}`
			: facts.server
				? `Server: ${facts.server}`
				: 'No Server or X-Powered-By header',
		points: facts.poweredBy ? 3 : 0,
		severity: 'low'
	});

	// -- mobile ------------------------------------------------------------
	checks.push(
		check(
			'viewport',
			'Viewport meta tag',
			'mobile',
			!/<meta[^>]+name=["']viewport["']/i.test(html),
			/<meta[^>]+name=["']viewport["']/i.test(html)
				? 'Viewport declared — page can size itself to the phone'
				: 'No viewport tag — likely broken on phones',
			15,
			'high'
		)
	);
	checks.push(
		check(
			'responsive',
			'Responsive layout signals',
			'mobile',
			!/media[ -]?quer|bootstrap|tailwind|flex|grid|mobile/i.test(html),
			/media[ -]?quer|bootstrap|tailwind|flex|grid|mobile/i.test(html)
				? `Responsive techniques detected${facts.tech.length ? ` (${facts.tech.join(', ')})` : ''}`
				: 'No responsive-design signals in the markup',
			10,
			'medium'
		)
	);

	// -- weight ------------------------------------------------------------
	checks.push({
		id: 'html_weight',
		label: 'HTML weight',
		category: 'weight',
		status: res.truncated ? 'fail' : 'pass',
		detail: res.truncated
			? `HTML exceeds the ${Math.round(MAX_BYTES / 1000)}KB scan cap — truncated`
			: `${(res.bytes / 1024).toFixed(1)}KB of HTML for the first view`,
		value: res.bytes,
		points: res.truncated ? 5 : 0,
		severity: res.truncated ? 'medium' : 'info'
	});

	// -- legacy code (ids and points fixed by the lead-desk contract) ------
	checks.push(
		check(
			'page_title',
			'Page title',
			'seo',
			!/<title>[^<]{3,}<\/title>/i.test(html),
			facts.title ? `Title: "${facts.title.slice(0, 70)}"` : 'Missing page title (SEO basics absent)',
			/^<title>[^<]{3,}<\/title>$/i.test(html.trim()) ? 0 : 8,
			'medium'
		)
	);
	checks.push(
		check(
			'meta_description',
			'Meta description',
			'seo',
			!/<meta[^>]+name=["']description["']/i.test(html),
			/<meta[^>]+name=["']description["']/i.test(html)
				? 'Meta description present'
				: 'Missing meta description',
			/<meta[^>]+name=["']description["']/i.test(html) ? 0 : 5,
			'low'
		)
	);
	checks.push(
		check(
			'table_layout',
			'Layout technique',
			'legacy-code',
			/<table[^>]*>.*<table/is.test(html) || count(html, /<table/g) >= 3,
			count(html, /<table/g) >= 3
				? `${count(html, /<table/g)} nested tables — pre-responsive era build`
				: 'No table-based layout detected',
			/<table[^>]*>.*<table/is.test(html) || count(html, /<table/g) >= 3 ? 12 : 0,
			'medium'
		)
	);
	checks.push(
		check(
			'flash',
			'Flash references',
			'legacy-code',
			/\.swf|shockwave-flash|x-shockwave/i.test(html),
			/\.swf|shockwave-flash|x-shockwave/i.test(html)
				? 'Flash references found — dead plugin era'
				: 'No Flash references',
			/\.swf|shockwave-flash|x-shockwave/i.test(html) ? 10 : 0,
			'high'
		)
	);
	const marquee = /<marquee|<blink/i.test(html);
	checks.push({
		id: 'marquee',
		label: 'Animated presentational tags',
		category: 'legacy-code',
		status: marquee ? 'fail' : 'pass',
		detail: marquee ? 'marquee / blink tags — 90s markup' : 'No marquee or blink tags',
		points: marquee ? 8 : 0,
		severity: 'low'
	});
	const fontTags = /<font[ >]/i.test(html);
	checks.push({
		id: 'font_tags',
		label: 'Deprecated <font> tags',
		category: 'legacy-code',
		status: fontTags ? 'fail' : 'pass',
		detail: fontTags ? 'Presentational <font> tags in use' : 'No <font> tags',
		points: fontTags ? 5 : 0,
		severity: 'low'
	});
	checks.push(
		check(
			'jquery_1x',
			'jQuery version',
			'legacy-code',
			/jquery-1\.|jquery\/1\.|jquery\.min\.js\?ver=1/i.test(html),
			/jquery-1\.|jquery\/1\.|jquery\.min\.js\?ver=1/i.test(html)
				? 'jQuery 1.x — unsupported, known CVEs'
				: /jquery/i.test(html)
					? 'jQuery present (version not 1.x)'
					: 'No jQuery detected',
			/jquery-1\.|jquery\/1\.|jquery\.min\.js\?ver=1/i.test(html) ? 8 : 0,
			'critical'
		)
	);
	checks.push(
		check(
			'ie_compat',
			'IE compatibility mode',
			'legacy-code',
			/x-ua-compatible["']?\s*content=["']?ie=/i.test(html),
			/x-ua-compatible["']?\s*content=["']?ie=/i.test(html)
				? 'IE-compatibility mode forced'
				: 'No forced IE compatibility mode',
			/x-ua-compatible["']?\s*content=["']?ie=/i.test(html) ? 7 : 0,
			'low'
		)
	);
	checks.push(
		check(
			'mixed_content',
			'HTTP sub-resources',
			'legacy-code',
			/src="http:\/\//i.test(html),
			/src="http:\/\//i.test(html)
				? 'Scripts or assets loaded over plain HTTP — browser will block or downgrade them'
				: 'No http:// sub-resources',
			/src="http:\/\//i.test(html) ? 8 : 0,
			'high'
		)
	);
	checks.push(
		check(
			'contact_paths',
			'Click-to-call / click-to-email',
			'contact',
			!/mailto:|tel:/i.test(html),
			facts.email || facts.phone
				? `Found ${[facts.email && `email ${facts.email}`, facts.phone && `phone ${facts.phone}`]
						.filter(Boolean)
						.join(' · ')}`
				: 'No click-to-call or click-to-email contact',
			!/mailto:|tel:/i.test(html) ? 5 : 0,
			'medium'
		)
	);
	checks.push(
		check(
			'semantic_html',
			'Semantic structure',
			'structure',
			!/<header|<nav|<main|<footer/i.test(html),
			/<header|<nav|<main|<footer/i.test(html)
				? 'Uses header/nav/main/footer landmarks'
				: 'No semantic HTML5 structure',
			/<header|<nav|<main|<footer/i.test(html) ? 0 : 5,
			'low'
		)
	);
	const yearMatch = /©|&copy;|copyright[^0-9]{0,10}(19|20)\d{2}/i.exec(html);
	const copyYear = yearMatch ? Number(yearMatch[0].slice(-4)) : null;
	const stale = copyYear !== null && copyYear < new Date().getFullYear() - 1;
	checks.push({
		id: 'freshness',
		label: 'Content freshness',
		category: 'structure',
		status: copyYear === null ? 'unknown' : stale ? 'warn' : 'pass',
		detail:
			copyYear === null
				? 'No copyright year found — cannot judge freshness'
				: stale
					? `Copyright year ${copyYear} — site looks abandoned`
					: `Copyright ${copyYear}`,
		value: copyYear ?? undefined,
		points: stale ? 5 : 0,
		severity: 'low'
	});

	const passed = checks.filter((c) => c.status === 'pass').length;
	const failed = checks.filter((c) => c.status === 'fail').length;
	const warned = checks.filter((c) => c.status === 'warn').length;
	const penalty = checks.reduce(
		(sum, c) => sum + (c.status === 'fail' ? c.points : c.status === 'warn' ? c.points / 2 : 0),
		0
	);

	return {
		ok: res.ok,
		facts,
		checks,
		passed,
		total: checks.length,
		failed,
		warned,
		penalty: Math.round(penalty),
		grade: gradeFor(penalty)
	};
};

/**
 * The 17 check ids that make up the lead desk's redesign-need score, in
 * the exact order `scoreSite()` appended its `pains` strings — the
 * outreach drafts (#55) quote the first two. Kept as an explicit list so
 * the contract is visible instead of implied by summation order.
 */
export const LEAD_DESK_CHECK_IDS: readonly string[] = [
	'https',
	'viewport',
	'responsive',
	'page_title',
	'meta_description',
	'table_layout',
	'flash',
	'marquee',
	'font_tags',
	'jquery_1x',
	'ie_compat',
	'mixed_content',
	'ttfb',
	'html_weight',
	'contact_paths',
	'semantic_html',
	'freshness'
];
