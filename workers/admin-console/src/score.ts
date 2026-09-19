/**
 * Lead-desk site scoring (#54).
 *
 * Scores a local business website 0–100 for *redesign need* (higher =
 * worse site = better prospect). Pure static heuristics over one fetched
 * HTML document — no browser, fits the Workers free tier (10s fetch
 * timeout, ~500KB cap, sequential scoring).
 */

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

const MAX_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 10_000;

export const normalizeWebsite = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed || trimmed.length > 2048) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(trimmed)) return `https://${trimmed}`;
	return null;
};

const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;

export async function scoreSite(website: string, fetchTimeoutMs = FETCH_TIMEOUT_MS): Promise<SiteScore> {
	const start = Date.now();
	const res = await fetch(website, {
		redirect: 'follow',
		headers: { 'User-Agent': 'pwn4g3-leadbot/1.0 (+https://pwn4g3.pages.dev)', Accept: 'text/html' },
		signal: AbortSignal.timeout(fetchTimeoutMs)
	});
	const ttfbMs = Date.now() - start;
	if (!res.ok) throw new Error(`fetch_${res.status}`);
	const ctype = res.headers.get('content-type') ?? '';
	if (ctype && !/text\/html|application\/xhtml/i.test(ctype)) throw new Error('not_html');

	const buf = new Uint8Array(await res.arrayBuffer());
	const truncated = buf.length > MAX_BYTES;
	const html = new TextDecoder().decode(buf.slice(0, MAX_BYTES)).toLowerCase();
	const finalUrl = res.url || website;
	const https = finalUrl.startsWith('https://');

	let need = 0;
	const pains: string[] = [];
	const tech: string[] = [];
	const add = (points: number, pain: string) => {
		need += points;
		pains.push(pain);
	};

	if (!https) add(15, 'No HTTPS — browsers flag the site insecure');
	if (!/<meta[^>]+name=["']viewport["']/i.test(html)) add(15, 'No viewport tag — likely broken on phones');
	if (!/media[ -]?quer|bootstrap|tailwind|flex|grid|mobile/i.test(html)) add(10, 'No responsive-design signals');
	if (!/<title>[^<]{3,}<\/title>/i.test(html)) add(8, 'Missing page title (SEO basics absent)');
	if (!/<meta[^>]+name=["']description["']/i.test(html)) add(5, 'Missing meta description');
	if (/<table[^>]*>.*<table/is.test(html) || count(html, /<table/g) >= 3) add(12, 'Table-based layout — pre-responsive era build');
	if (/\.swf|shockwave-flash|x-shockwave/i.test(html)) add(10, 'Flash references — dead plugin era');
	if (/<marquee|<blink/i.test(html)) add(8, 'Marquee/blink tags — 90s markup');
	if (/<font[ >]/i.test(html)) add(5, 'Deprecated <font> tags');
	if (/jquery-1\.|jquery\/1\.|jquery\.min\.js\?ver=1/i.test(html)) add(8, 'jQuery 1.x — unsupported, known CVEs');
	if (/x-ua-compatible["']?\s*content=["']?ie=/i.test(html)) add(7, 'IE-compatibility mode forced');
	if (/src="http:\/\//i.test(html)) add(8, 'Mixed content — loads scripts over HTTP');
	if (ttfbMs > 1500) add(8, `Slow server response (${(ttfbMs / 1000).toFixed(1)}s TTFB)`);
	if (truncated) add(5, 'Heavy homepage (500KB+ of HTML)');
	if (!/mailto:|tel:/i.test(html)) add(5, 'No click-to-call or click-to-email contact');
	if (!/<header|<nav|<main|<footer/i.test(html)) add(5, 'No semantic HTML5 structure');
	const yearMatch = /©|&copy;|copyright[^0-9]{0,10}(19|20)\d{2}/i.exec(html);
	const copyYear = yearMatch ? Number(yearMatch[0].slice(-4)) : null;
	if (copyYear !== null && copyYear < new Date().getFullYear() - 1) {
		add(5, `Stale copyright (${copyYear}) — site looks abandoned`);
	}

	if (/wp-content|wp-includes/i.test(html)) tech.push('wordpress');
	if (/wix\.com|\.wixstatic/i.test(html)) tech.push('wix');
	if (/squarespace/i.test(html)) tech.push('squarespace');
	if (/godaddy/i.test(html)) tech.push('godaddy');
	if (/shopify/i.test(html)) tech.push('shopify');
	if (/react|next\/|__next/i.test(html)) tech.push('react');
	if (/jquery/i.test(html)) tech.push('jquery');
	if (/bootstrap/i.test(html)) tech.push('bootstrap');
	if (/tailwind/i.test(html)) tech.push('tailwind');

	const emailMatch = /mailto:([^\s"'<>]+@[^\s"'<>]+)/i.exec(html);
	const phoneMatch = /tel:([+\d][\d\s().-]{6,})/i.exec(html);

	const titleMatch = /<title>([^<]{1,140})<\/title>/i.exec(html);

	return {
		website,
		finalUrl,
		https,
		score: Math.min(100, need),
		pains,
		tech,
		email: emailMatch ? emailMatch[1].slice(0, 254) : null,
		phone: phoneMatch ? phoneMatch[1].slice(0, 64) : null,
		title: titleMatch ? titleMatch[1].trim() : null,
		ttfbMs,
		bytes: buf.length,
		truncated
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
		`Worth a free 20-minute look? I can record a 2-minute video audit of your current site, no strings attached.\n\n` +
		`— Jake Viefhaus (pwn4g3)\ngeekhaus314@proton.me · https://pwn4g3.pages.dev`
	);
}
