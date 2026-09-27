/**
 * Lead-desk site scoring (#54).
 *
 * Scores a local business website 0–100 for *redesign need* (higher =
 * worse site = better prospect).
 *
 * The measurement engine now lives in `workers/shared/audit.ts` (#63) so
 * the public audit tool and the lead desk run identical checks instead of
 * two drifting copies. This module keeps the lead-desk *view*: same 17
 * checks, same point values, same `pains[]` strings in the same order,
 * because the outreach drafts (#55) quote the first two verbatim. The
 * translation table below is the contract — if you change a pain string
 * here, you change what gets emailed to a real business.
 */

import { auditSite, LEAD_DESK_CHECK_IDS, type AuditCheck } from '../../shared/audit';
import { validatePublicUrl } from '../../shared/http';

export interface SiteScore {
	website: string;
	finalUrl: string;
	https: boolean;
	/** 0–100 redesign need. */
	score: number;
	pains: string[];
	tech: string[];
	email: string | null;
	phone: string | null;
	title: string | null;
	ttfbMs: number;
	bytes: number;
	truncated: boolean;
}

const FETCH_TIMEOUT_MS = 10_000;

export const normalizeWebsite = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed || trimmed.length > 2048) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	if (!/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(trimmed)) return null;
	// Same SSRF containment the public audit tool uses: literal private /
	// loopback / metadata addresses, internal TLDs and non-default ports are
	// rejected even though the console is token-gated. Costs nothing, and
	// a mistyped target in the scanner shouldn't reach 169.254.169.254.
	const validated = validatePublicUrl(trimmed);
	return validated.ok && validated.url ? validated.url : null;
};

/**
 * Legacy pain strings, verbatim. Keyed by check id; a function returns the
 * string to append, or `null` to append nothing (the check passed, or is a
 * new check that isn't part of the redesign-need score).
 */
const LEGACY_PAIN: Record<string, (c: AuditCheck) => string | null> = {
	https: (c) => (c.status === 'fail' ? 'No HTTPS — browsers flag the site insecure' : null),
	viewport: (c) => (c.status === 'fail' ? 'No viewport tag — likely broken on phones' : null),
	responsive: (c) => (c.status === 'fail' ? 'No responsive-design signals' : null),
	page_title: (c) => (c.status === 'fail' ? 'Missing page title (SEO basics absent)' : null),
	meta_description: (c) => (c.status === 'fail' ? 'Missing meta description' : null),
	table_layout: (c) => (c.status === 'fail' ? 'Table-based layout — pre-responsive era build' : null),
	flash: (c) => (c.status === 'fail' ? 'Flash references — dead plugin era' : null),
	marquee: (c) => (c.status === 'fail' ? 'Marquee/blink tags — 90s markup' : null),
	font_tags: (c) => (c.status === 'fail' ? 'Deprecated <font> tags' : null),
	jquery_1x: (c) => (c.status === 'fail' ? 'jQuery 1.x — unsupported, known CVEs' : null),
	ie_compat: (c) => (c.status === 'fail' ? 'IE-compatibility mode forced' : null),
	mixed_content: (c) => (c.status === 'fail' ? 'Mixed content — loads scripts over HTTP' : null),
	ttfb: (c) =>
		c.status === 'fail' ? `Slow server response (${((c.value ?? 0) / 1000).toFixed(1)}s TTFB)` : null,
	html_weight: (c) => (c.status === 'fail' ? 'Heavy homepage (500KB+ of HTML)' : null),
	contact_paths: (c) => (c.status === 'fail' ? 'No click-to-call or click-to-email contact' : null),
	semantic_html: (c) => (c.status === 'fail' ? 'No semantic HTML5 structure' : null),
	freshness: (c) =>
		c.status === 'warn' ? `Stale copyright (${c.value ?? '????'}) — site looks abandoned` : null
};

export async function scoreSite(website: string, fetchTimeoutMs = FETCH_TIMEOUT_MS): Promise<SiteScore> {
	const report = await auditSite(website, { timeoutMs: fetchTimeoutMs });

	// Preserve the original error taxonomy — admin-console routes and the
	// scanner UI branch on these strings.
	if (!report.facts) {
		throw new Error(`fetch_${report.error ?? 'failed'}${report.reason ? `_${report.reason}` : ''}`);
	}
	const facts = report.facts;
	if (facts.status >= 400) throw new Error(`fetch_${facts.status}`);
	if (facts.contentType && !/text\/html|application\/xhtml/i.test(facts.contentType)) {
		throw new Error('not_html');
	}

	const byId = new Map(report.checks.map((c) => [c.id, c]));
	let need = 0;
	const pains: string[] = [];
	for (const id of LEAD_DESK_CHECK_IDS) {
		const c = byId.get(id);
		if (!c) continue;
		const pain = LEGACY_PAIN[id]?.(c) ?? null;
		if (pain === null) continue;
		need += c.points;
		pains.push(pain);
	}

	return {
		website,
		finalUrl: facts.finalUrl,
		https: facts.https,
		score: Math.min(100, need),
		pains,
		tech: [...facts.tech],
		email: facts.email,
		phone: facts.phone,
		title: facts.title,
		ttfbMs: facts.ttfbMs,
		bytes: facts.bytes,
		truncated: facts.truncated
	};
}

// ---------------------------------------------------------------------------
// Overpass discovery (free, no key): business listings with websites in a bbox.
// ---------------------------------------------------------------------------

export interface DiscoveredBusiness {
	name: string;
	website: string | null;
	phone: string | null;
	lat: number;
	lon: number;
}

export interface ScanCategory {
	label: string;
	niche: string;
	/** Overpass QL filter fragment, e.g. `["shop"="hairdresser"]`. */
	filter: string;
}

/** Redesign-bread-and-butter verticals: old sites, clear owners, local money. */
export const SCAN_CATEGORIES: Record<string, ScanCategory> = {
	restaurant: { label: 'Restaurants', niche: 'local-service', filter: '["amenity"="restaurant"]' },
	cafe: { label: 'Cafés', niche: 'local-service', filter: '["amenity"="cafe"]' },
	salon: { label: 'Hair / beauty salons', niche: 'local-service', filter: '["shop"="hairdresser"]' },
	auto: { label: 'Auto repair', niche: 'local-service', filter: '["shop"="car_repair"]' },
	dentist: { label: 'Dental clinics', niche: 'clinic', filter: '["amenity"="dentist"]' },
	retail: { label: 'Local retail shops', niche: 'local-service', filter: '["shop"="convenience"]' }
};

/** St. Louis metro default: south, west, north, east. */
export const STL_BBOX = '38.40,-90.55,38.90,-90.00';

const OVERPASS_MIRRORS = [
	'https://overpass.kumi.systems/api/interpreter',
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];

export async function discoverBusinesses(
	category: string,
	bbox: string,
	limit: number
): Promise<DiscoveredBusiness[]> {
	const cat = SCAN_CATEGORIES[category];
	if (!cat) throw new Error('unknown_category');
	const capped = Math.min(50, Math.max(1, Math.floor(limit)));
	const ql = `[out:json][timeout:25];(node${cat.filter}(${bbox}););out tags ${capped};`;
	let lastError = 'overpass_unreachable';
	for (const mirror of OVERPASS_MIRRORS) {
		try {
			const res = await fetch(mirror, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: 'data=' + encodeURIComponent(ql),
				signal: AbortSignal.timeout(30_000)
			});
			if (res.status === 429 || res.status === 504) {
				lastError = `overpass_${res.status}`;
				continue;
			}
			if (!res.ok) throw new Error(`overpass_${res.status}`);
			const body = (await res.json()) as {
				elements?: { lat?: number; lon?: number; tags?: Record<string, string> }[];
			};
			const out: DiscoveredBusiness[] = [];
			for (const el of body.elements ?? []) {
				const tags = el.tags ?? {};
				const website = tags.website || tags['contact:website'] || null;
				const name = tags.name || 'Unnamed business';
				out.push({
					name: name.slice(0, 200),
					website,
					phone: (tags.phone || tags['contact:phone'] || null)?.slice(0, 64) ?? null,
					lat: el.lat ?? 0,
					lon: el.lon ?? 0
				});
				if (out.length >= capped) break;
			}
			return out;
		} catch (e) {
			lastError = e instanceof Error ? e.message : 'overpass_unreachable';
		}
	}
	throw new Error(lastError);
}

// ---------------------------------------------------------------------------
// Outreach draft: template-based (no AI spend), personalized from signals.
// ---------------------------------------------------------------------------

export function buildDraft(businessName: string, website: string, pains: string[]): string {
	const top = pains.slice(0, 2);
	const painLine =
		top.length > 0
			? `I noticed ${top.join(' and ').charAt(0).toLowerCase() + top.join(' and ').slice(1)} on your site —`
			: 'Your site looks like it could be working harder for you —';
	return (
		`Hi ${businessName} team,\n\n` +
		`${painLine} quick examples: most of your customers will first find you on a phone, ` +
		`and Google buries sites that aren't mobile-friendly and secure.\n\n` +
		`I'm Jake, a St. Louis web developer — I rebuild sites like ${website} into fast, ` +
		`mobile-first pages with online booking/contact built in. Fixed price quoted up front ` +
		`(recent launches from $1,200), and you own the code outright.\n\n` +
		`No pitch, no call needed: I recorded a free 2-minute video audit of your current site — ` +
		`watch it whenever suits you, and reply here if you want the fixes. ` +
		`[attach video link before sending]\n\n` +
		`— Jake Viefhaus (pwn4g3)\ngeekhaus314@proton.me · https://pwn4g3.pages.dev`
	);
}
