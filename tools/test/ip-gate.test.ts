/**
 * Admin console source-IP allowlist guard (#79).
 *
 * Two properties are worth more than the rest here, so they are probed
 * deliberately rather than covered incidentally:
 *
 *   1. Fail closed. Every path to "no entries" must deny, not serve. An unset
 *      secret, a typo'd secret, an unparsable client address and a missing
 *      header each have to produce `false`, because each of those is a state
 *      the operator will actually hit while setting this up.
 *   2. The /64 must match inside its range and stop exactly at the boundary.
 *      An off-by-one that accepts e3d1 would admit a whole adjacent subnet
 *      that belongs to nobody.
 *
 * Run: node --test tools/test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	parseAllowlist,
	ipAllowed,
	sourceIp,
	parseIPv4,
	parseIPv6
} from '../../workers/admin-console/src/ip-gate.ts';

// RFC 5737 / RFC 3849 documentation ranges stand in for the operator's
// real address: this repo is public, and publishing the allowlist tells an
// attacker exactly which network to attack from. Shape is identical to the
// deployed config — one exact v4 host plus one v6 /64.
const REAL = '203.0.113.7,2001:db8:1234:e3d0::/64';
const allow = (raw: string | undefined) => parseAllowlist(raw);

test('operator address and everything inside its /64 are allowed', () => {
	const list = allow(REAL);
	assert.equal(ipAllowed('203.0.113.7', list), true, 'bare v4 host');
	assert.equal(ipAllowed('2001:db8:1234:e3d0::17', list), true, 'the actual v6 host id');
	assert.equal(ipAllowed('2001:db8:1234:e3d0::', list), true, 'subnet router anycast');
	assert.equal(ipAllowed('2001:db8:1234:e3d0:ffff:ffff:ffff:ffff', list), true, 'last address in /64');
	// Bits below the /64 boundary are host bits, so varying them stays inside
	// the prefix. Confirms the mask stops at 64 and nowhere earlier.
	assert.equal(ipAllowed('2001:db8:1234:e3d0:1::1', list), true, 'host bits may vary freely');
	assert.equal(ipAllowed('2001:db8:1234:e3d0:0:0:0:1', list), true, 'uncompressed equivalent');
});

test('the address immediately outside the /64 is rejected', () => {
	const list = allow(REAL);
	assert.equal(ipAllowed('2001:db8:1234:e3d1::1', list), false, 'next /64');
	assert.equal(ipAllowed('2001:db8:1234:e3cf::1', list), false, 'previous /64');
	assert.equal(ipAllowed('2001:db9:1234:e3d0::1', list), false, 'different /32');
});

test('unrelated clients are rejected', () => {
	const list = allow(REAL);
	assert.equal(ipAllowed('198.51.100.9', list), false);
	assert.equal(ipAllowed('8.8.8.8', list), false);
	assert.equal(ipAllowed('2001:db9:1234:e3d0::1', list), false, 'different /32 entirely');
	assert.equal(ipAllowed('2001:db8:1234:e3d1:ffff::1', list), false, 'adjacent /64, every host bit set');
});

test('FAIL CLOSED: no allowlist denies everyone, including the operator', () => {
	const operator = '203.0.113.7';
	assert.equal(ipAllowed(operator, allow(undefined)), false, 'secret unset');
	assert.equal(ipAllowed(operator, allow(null)), false, 'secret null');
	assert.equal(ipAllowed(operator, allow('')), false, 'secret empty');
	assert.equal(ipAllowed(operator, allow('   ')), false, 'secret whitespace');
});

test('FAIL CLOSED: entries that do not parse grant nobody access', () => {
	const operator = '203.0.113.7';
	for (const bad of ['not-an-ip', '999.1.1.1', '203.0.113.7/33', '::/129', '1:2:3:4:5:6:7:8:9']) {
		const list = allow(bad);
		assert.equal(list.entries.length, 0, `${bad} should parse to nothing`);
		assert.equal(ipAllowed(operator, list), false, `${bad} must deny`);
	}
	// A partial typo must not silently widen anything either.
	const partial = allow('203.0.113.7,garbage');
	assert.equal(ipAllowed('203.0.113.7', partial), true, 'valid entry survives');
	assert.equal(ipAllowed('198.51.100.9', partial), false, 'invalid entry grants nothing');
	assert.deepEqual(partial.invalid, ['garbage'], 'the typo is reported, not dropped');
});

test('FAIL CLOSED: missing or unparsable client address denies', () => {
	const list = allow(REAL);
	assert.equal(ipAllowed(null, list), false, 'no address');
	assert.equal(ipAllowed('', list), false, 'empty address');
	assert.equal(ipAllowed('unknown', list), false, 'rate-limit fallback value');
	assert.equal(ipAllowed('::', list), false, 'parsable but not ours');
});

test('IPv4-in-IPv6 is unwrapped so a v4 entry still matches over v6', () => {
	// Without this, a v4-only allowlist stops working the moment the browser
	// prefers IPv6 — a lockout that looks like the gateway is broken.
	const v4Only = allow('203.0.113.7');
	assert.equal(ipAllowed('::ffff:203.0.113.7', v4Only), true, 'dotted-quad tail');
	assert.equal(ipAllowed('::ffff:cb00:7107', v4Only), true, 'hex tail, same address');
	assert.equal(ipAllowed('::ffff:203.0.113.8', v4Only), false, 'nearby host still denied');
});

test('families never cross: v4 entry does not match a native v6 client', () => {
	// A v4 entry held as a 32-bit bigint compared against a 128-bit client
	// without a family check would compare the wrong widths entirely.
	const v4Only = allow('0.0.0.0/0');
	assert.equal(ipAllowed('2001:db8:1234:e3d0::17', v4Only), false, 'even an allow-all v4 must not match v6');
	const v6Only = allow('::/0');
	assert.equal(ipAllowed('203.0.113.7', v6Only), false, 'and the reverse');
});

test('leading zeros in IPv4 are rejected as ambiguous', () => {
	// `010` is octal to some parsers and decimal to others. For an allowlist
	// the only safe reading of an ambiguous token is "not an address".
	assert.equal(parseIPv4('010.1.1.1'), null);
	assert.equal(parseIPv4('1.1.1.01'), null);
	assert.equal(parseIPv4('1.1.1.1'), 0x01010101n, 'no leading zero parses fine');
	assert.equal(parseIPv4('0.0.0.0'), 0n, 'a lone zero is not a leading zero');
});

test('IPv6 compression and embedded IPv4 parse as expected', () => {
	assert.equal(parseIPv6('::'), 0n);
	assert.equal(parseIPv6('::1'), 1n);
	assert.equal(parseIPv6('2001:db8:1234:e3d0::'), 0x20010db81234e3d00000000000000000n);
	assert.equal(parseIPv6('1:2:3:4:5:6:7:8'), 0x00010002000300040005000600070008n);
	assert.equal(parseIPv6('::ffff:192.0.2.1'), 0xffffc0000201n, 'dotted quad tail');
	assert.equal(parseIPv6('fe80::1%eth0'), parseIPv6('fe80::1'), 'zone id stripped');
	// Ambiguous or malformed forms.
	assert.equal(parseIPv6('1:2::3::4'), null, 'two ::');
	assert.equal(parseIPv6('1:2:3:4:5:6:7:8:9'), null, 'too many groups');
	assert.equal(parseIPv6('1:2:3:4:5:6:7'), null, 'too few groups');
	assert.equal(parseIPv6('1:2:3:4:5:6:7::8'), null, ':: must cover >= 1 group');
	assert.equal(parseIPv6('gggg::1'), null, 'non-hex');
	assert.equal(parseIPv6('12345::1'), null, 'group wider than 4 digits');
});

test('malformed prefix lengths are rejected, not clamped', () => {
	assert.equal(allow('10.0.0.0/33').entries.length, 0, 'v4 beyond /32');
	assert.equal(allow('::/129').entries.length, 0, 'v6 beyond /128');
	assert.equal(allow('10.0.0.0/-1').entries.length, 0, 'negative');
	assert.equal(allow('10.0.0.0/abc').entries.length, 0, 'non-numeric');
	assert.equal(allow('10.0.0.0/').entries.length, 0, 'empty prefix');
});

test('prefix length is honoured for exact-host and broad entries', () => {
	assert.equal(ipAllowed('10.1.2.3', allow('10.1.2.3/32')), true, 'exact /32');
	assert.equal(ipAllowed('10.1.2.4', allow('10.1.2.3/32')), false, 'next host in a /32');
	assert.equal(ipAllowed('10.1.2.9', allow('10.1.2.0/24')), true, 'within /24');
	// /24 fixes the first three octets: 10.1.2.* — so 10.1.9.* is outside it.
	assert.equal(ipAllowed('10.1.9.9', allow('10.1.2.0/24')), false, 'third octet differs');
	assert.equal(ipAllowed('10.2.0.1', allow('10.1.2.0/24')), false, 'outside /24');
	// /0 is an explicit allow-all, not a parsing accident.
	assert.equal(ipAllowed('198.51.100.9', allow('0.0.0.0/0')), true);
});

test('a comma list tolerates whitespace and empty segments', () => {
	const list = allow('  203.0.113.7 , , 2001:db8:1234:e3d0::/64  ');
	assert.equal(list.entries.length, 2);
	assert.equal(ipAllowed('203.0.113.7', list), true);
	assert.equal(list.invalid.length, 0);
});

test('sourceIp reads CF-Connecting-IP and ignores X-Forwarded-For', () => {
	// XFF is client-controlled. Reusing it here would let a caller nominate
	// their own way past an allowlist, so it must not be consulted at all.
	const req = (h: Record<string, string>) => new Request('https://x/admin', { headers: h });

	assert.equal(sourceIp(req({ 'cf-connecting-ip': '203.0.113.7' })), '203.0.113.7');
	assert.equal(sourceIp(req({ 'cf-connecting-ip': ' 203.0.113.7  ' })), '203.0.113.7', 'trimmed');
	assert.equal(sourceIp(req({ 'x-forwarded-for': '203.0.113.7' })), null, 'XFF alone must not pass');
	assert.equal(
		sourceIp(req({ 'cf-connecting-ip': '198.51.100.9', 'x-forwarded-for': '203.0.113.7' })),
		'198.51.100.9',
		'CF wins over XFF'
	);
	assert.equal(sourceIp(req({})), null, 'no header, no address, no access');
});

test('end to end: forged XFF from a hostile network still 403s', () => {
	// The attack this control exists to stop, exercised the way the worker
	// would see it: a stranger claiming the operator's address in XFF.
	const list = allow(REAL);
	const forged = sourceIp(
		new Request('https://x/admin', {
			headers: { 'x-forwarded-for': '203.0.113.7', 'cf-connecting-ip': '198.51.100.7' }
		})
	);
	assert.equal(forged, '198.51.100.7', 'forged header is never the source of truth');
	assert.equal(ipAllowed(forged, list), false, 'and does not match');
});
