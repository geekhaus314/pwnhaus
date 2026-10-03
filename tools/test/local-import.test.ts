import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalOutreachImport } from '../../workers/admin-console/src/local-import.ts';

const valid = {
	schema_version: 1,
	name: 'Example Plumbing',
	website: 'https://example.com',
	phone: '314-555-0100',
	address: '1 Main St',
	city: 'Florissant',
	industry: 'Plumbing',
	classification: 'NEEDS_REHAB',
	opportunity_score: 87,
	need_score: 92,
	value_score: 79,
	site_health: 22,
	rating: 4.8,
	review_count: 120,
	audit_summary: 'Missing viewport and contact paths.',
	pitch_facts: ['No viewport tag — likely broken on phones'],
	sources: ['google_places'],
	low_confidence: false,
	last_audited: '2026-10-02'
};

test('parses a local-outreach record and canonicalizes its website', () => {
	const result = parseLocalOutreachImport(valid);
	assert.equal(result.ok, true);
	if (!result.ok) return;
	assert.equal(result.value.website, 'https://example.com/');
	assert.equal(result.value.opportunityScore, 87);
	assert.equal(result.value.pitchFacts[0], 'No viewport tag — likely broken on phones');
});

test('permits a no-website lead and applies the St. Louis default', () => {
	const result = parseLocalOutreachImport({
		...valid,
		website: '',
		phone: '',
		address: '',
		city: undefined,
		site_health: null,
		rating: null,
		review_count: null,
		last_audited: null
	});
	assert.equal(result.ok, true);
	if (!result.ok) return;
	assert.equal(result.value.website, null);
	assert.equal(result.value.city, 'St. Louis');
	assert.equal(result.value.phone, null);
});

test('rejects wrong schema versions and non-HTTP business URLs', () => {
	assert.deepEqual(parseLocalOutreachImport({ ...valid, schema_version: 2 }), {
		ok: false,
		error: 'unsupported_schema_version'
	});
	assert.deepEqual(parseLocalOutreachImport({ ...valid, website: 'javascript:alert(1)' }), {
		ok: false,
		error: 'invalid_website'
	});
});

test('rejects malformed or out-of-range scoring and facts', () => {
	for (const patch of [
		{ opportunity_score: 101 },
		{ rating: 5.1 },
		{ low_confidence: 'no' },
		{ classification: 'MADE_UP' },
		{ pitch_facts: ['x'.repeat(501)] }
	]) {
		assert.equal(parseLocalOutreachImport({ ...valid, ...patch }).ok, false);
	}
});

test('rejects records sourced from Google Maps scraping', () => {
	assert.deepEqual(parseLocalOutreachImport({ ...valid, sources: ['gmaps'] }), {
		ok: false,
		error: 'unsupported_source'
	});
});
