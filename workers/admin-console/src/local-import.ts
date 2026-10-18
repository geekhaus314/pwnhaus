export interface LocalOutreachImport {
	name: string;
	website: string | null;
	phone: string | null;
	address: string;
	city: string;
	industry: string;
	classification: string;
	opportunityScore: number;
	needScore: number;
	valueScore: number;
	siteHealth: number | null;
	rating: number | null;
	reviewCount: number | null;
	auditSummary: string;
	pitchFacts: string[];
	sources: string[];
	lowConfidence: boolean;
	lastAudited: string | null;
}

type ParseResult = { ok: true; value: LocalOutreachImport } | { ok: false; error: string };

const CLASSIFICATIONS = new Set([
	'NO_PRESENCE',
	'DEAD_SITE',
	'SOCIAL_ONLY',
	'MARKETPLACE_ONLY',
	'NEEDS_REHAB',
	'HAS_DECENT_SITE'
]);

const text = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
		? value.trim()
		: null;

const boundedInteger = (value: unknown, min: number, max: number): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
		? value
		: null;

const optionalInteger = (value: unknown, min: number, max: number): number | null | undefined =>
	value === null ? null : boundedInteger(value, min, max) ?? undefined;

const optionalRating = (value: unknown): number | null | undefined =>
	value === null
		? null
		: typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5
			? value
			: undefined;

const stringList = (value: unknown, maxItems: number, maxLength: number): string[] | null => {
	if (!Array.isArray(value) || value.length > maxItems) return null;
	const items = value.map((item) => text(item, maxLength));
	return items.every((item): item is string => item !== null) ? items : null;
};

export function parseLocalOutreachImport(input: unknown): ParseResult {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return { ok: false, error: 'invalid_body' };
	}

	const body = input as Record<string, unknown>;
	if (body.schema_version !== 1) return { ok: false, error: 'unsupported_schema_version' };

	const name = text(body.name, 200);
	const industry = text(body.industry, 80);
	const classification =
		typeof body.classification === 'string' && CLASSIFICATIONS.has(body.classification)
			? body.classification
			: null;
	const opportunityScore = boundedInteger(body.opportunity_score, 0, 100);
	const needScore = boundedInteger(body.need_score, 0, 100);
	const valueScore = boundedInteger(body.value_score, 0, 100);
	const address = body.address === '' ? '' : text(body.address, 300);
	const city = body.city === undefined ? 'St. Louis' : text(body.city, 100);
	const phone = body.phone === '' || body.phone === null ? null : text(body.phone, 64);
	const websiteInput = body.website === '' || body.website === null ? null : text(body.website, 2048);
	const siteHealth = optionalInteger(body.site_health, 0, 100);
	const rating = optionalRating(body.rating);
	const reviewCount = optionalInteger(body.review_count, 0, 100_000_000);
	const auditSummary = body.audit_summary === '' ? '' : text(body.audit_summary, 500);
	const pitchFacts = stringList(body.pitch_facts, 16, 500);
	const sources = stringList(body.sources, 8, 80);
	if (sources?.includes('gmaps')) return { ok: false, error: 'unsupported_source' };
	const lastAudited =
		body.last_audited === '' || body.last_audited === null
			? null
			: typeof body.last_audited === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.last_audited)
				? body.last_audited
				: undefined;

	if (
		!name ||
		!industry ||
		!classification ||
		opportunityScore === null ||
		needScore === null ||
		valueScore === null ||
		address === null ||
		city === null ||
		phone === undefined ||
		websiteInput === undefined ||
		siteHealth === undefined ||
		rating === undefined ||
		reviewCount === undefined ||
		auditSummary === null ||
		pitchFacts === null ||
		sources === null ||
		typeof body.low_confidence !== 'boolean' ||
		lastAudited === undefined
	) {
		return { ok: false, error: 'invalid_lead_fields' };
	}

	let website: string | null = null;
	if (websiteInput !== null) {
		try {
			const url = new URL(websiteInput);
			if (
				(url.protocol !== 'http:' && url.protocol !== 'https:') ||
				!url.hostname ||
				url.username ||
				url.password
			) {
				return { ok: false, error: 'invalid_website' };
			}
			website = url.toString();
		} catch {
			return { ok: false, error: 'invalid_website' };
		}
	}

	return {
		ok: true,
		value: {
			name,
			website,
			phone,
			address,
			city,
			industry,
			classification,
			opportunityScore,
			needScore,
			valueScore,
			siteHealth,
			rating,
			reviewCount,
			auditSummary,
			pitchFacts,
			sources,
			lowConfidence: body.low_confidence,
			lastAudited
		}
	};
}
