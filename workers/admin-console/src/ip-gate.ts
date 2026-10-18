/**
 * Source-IP allowlist for the admin console (#79).
 *
 * The console is already private by token: every route verifies ADMIN_TOKEN
 * with a constant-time compare. This is a second, independent front door, and
 * it is deliberately in *front* of the token check rather than replacing it:
 *
 *   - a leaked console URL is a dead end from anywhere but one address, so
 *     nobody outside that network even gets to test tokens against it;
 *   - a stolen token is still useless from elsewhere;
 *   - the token still guards the route if this gate is ever bypassed.
 *
 * Fail-closed is the whole point. An unset, empty or typo'd allowlist yields
 * zero entries and `ipAllowed` returns false for everyone — an operator who
 * misconfigured the secret locks themselves out, which is recoverable, rather
 * than leaving the door open, which is not. There is no code path where
 * "no config" means "serve".
 *
 * Trust model: the client address comes from `CF-Connecting-IP` and nothing
 * else. Cloudflare sets and overwrites that header at the edge, so a caller
 * cannot forge it. The `x-forwarded-for` fallback used for rate limiting
 * (see `shared/rate-limit.ts`) is *not* used here — it is client-controllable,
 * and for an allowlist that is the difference between a control and a
 * suggestion. This holds only because the worker is `workers_dev: false` and
 * is reached exclusively through the gateway behind Cloudflare; if it were ever
 * directly addressable without CF in front, a forged header would satisfy the
 * gate. That is the one invariant to preserve on any redeploy.
 */

export interface AllowedEntry {
	/** Family of the *entry* — an IPv4 entry never matches an IPv6 client. */
	family: 4 | 6;
	/** Address bits, left-aligned. IPv4 is held as its 32-bit value. */
	base: bigint;
	/** Prefix length: 0–32 for v4, 0–128 for v6. */
	prefix: number;
}

export interface Allowlist {
	entries: AllowedEntry[];
	/** Verbatim entries that failed to parse, so a typo is visible in logs. */
	invalid: string[];
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Parse a dotted quad to its 32-bit value.
 *
 * Leading zeros are rejected outright. `010` is a legitimate-looking address
 * that some parsers read as octal and others as decimal; for an allowlist the
 * only safe answer to an ambiguous token is "not an address", which lands the
 * entry in `invalid` instead of silently allowing the wrong host.
 */
export const parseIPv4 = (raw: string): bigint | null => {
	const m = IPV4_RE.exec(raw.trim());
	if (!m) return null;
	let out = 0n;
	for (const part of m.slice(1)) {
		if (part.length > 1 && part[0] === '0') return null;
		const n = Number(part);
		if (n > 255) return null;
		out = (out << 8n) | BigInt(n);
	}
	return out;
};

/** Parse an IPv6 literal (with `::` compression, zone id and embedded IPv4). */
export const parseIPv6 = (raw: string): bigint | null => {
	let s = raw.trim().toLowerCase();
	// `fe80::1%eth0` — the zone is a local scope hint, not part of the address.
	const zone = s.indexOf('%');
	if (zone !== -1) s = s.slice(0, zone);
	if (!s || !s.includes(':')) return null;

	// Embedded dotted quad (`::ffff:192.0.2.1`) becomes two extra hex groups.
	const lastColon = s.lastIndexOf(':');
	const tail = s.slice(lastColon + 1);
	if (tail.includes('.')) {
		const v4 = parseIPv4(tail);
		if (v4 === null) return null;
		const hi = ((v4 >> 16n) & 0xffffn).toString(16);
		const lo = (v4 & 0xffffn).toString(16);
		s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
	}

	const split = s.split('::');
	// More than one `::` is ambiguous and therefore invalid.
	if (split.length > 2) return null;

	const groups = (chunk: string): string[] | null => {
		if (chunk === '') return [];
		const parts = chunk.split(':');
		for (const p of parts) if (!/^[0-9a-f]{1,4}$/.test(p)) return null;
		return parts;
	};

	let parts: string[] | null;
	if (split.length === 2) {
		const head = groups(split[0]);
		const rest = groups(split[1]);
		if (head === null || rest === null) return null;
		// `::` must stand for at least one zero group, so 8 already-specified
		// groups around it is a malformed address, not a full one.
		const fill = 8 - head.length - rest.length;
		if (fill < 1) return null;
		parts = [...head, ...new Array<string>(fill).fill('0'), ...rest];
	} else {
		parts = groups(split[0]);
	}
	if (parts === null || parts.length !== 8) return null;

	let out = 0n;
	for (const p of parts) out = (out << 16n) | BigInt(parseInt(p, 16));
	return out;
};

const parseAddr = (raw: string): { family: 4 | 6; value: bigint } | null => {
	const v4 = parseIPv4(raw);
	if (v4 !== null) return { family: 4, value: v4 };
	const v6 = parseIPv6(raw);
	if (v6 !== null) return { family: 6, value: v6 };
	return null;
};

const parseEntry = (raw: string): AllowedEntry | null => {
	const s = raw.trim();
	if (!s) return null;
	const slash = s.indexOf('/');
	const addr = slash === -1 ? s : s.slice(0, slash);
	const cidr = slash === -1 ? null : s.slice(slash + 1).trim();

	const parsed = parseAddr(addr);
	if (!parsed) return null;

	const max = parsed.family === 4 ? 32 : 128;
	let prefix = max;
	if (cidr !== null) {
		if (!/^\d{1,3}$/.test(cidr)) return null;
		const n = Number(cidr);
		if (n > max) return null;
		prefix = n;
	}
	return { family: parsed.family, base: parsed.value, prefix };
};

/** Parse `203.0.113.7,2001:db8:1234:e3d0::/64` into entries plus rejects. */
export const parseAllowlist = (raw: string | undefined | null): Allowlist => {
	if (!raw || !raw.trim()) return { entries: [], invalid: [] };
	const entries: AllowedEntry[] = [];
	const invalid: string[] = [];
	for (const token of raw.split(',')) {
		const t = token.trim();
		if (!t) continue;
		const entry = parseEntry(t);
		if (entry) entries.push(entry);
		else invalid.push(t);
	}
	return { entries, invalid };
};

const mask = (value: bigint, prefix: number, bits: number): bigint => {
	if (prefix <= 0) return 0n;
	if (prefix >= bits) return value;
	const shift = BigInt(bits - prefix);
	return (value >> shift) << shift;
};

/** Canonical form for a *client* address, with IPv4-in-IPv6 unwrapped. */
const normalizeClient = (ip: string): { family: 4 | 6; value: bigint } | null => {
	const parsed = parseAddr(ip);
	if (!parsed) return null;
	// `::ffff:a.b.c.d` is a client that reached us over IPv6 but holds an IPv4
	// address. Unwrap it so an IPv4 allowlist entry still matches — otherwise
	// a v4-only list silently stops matching whenever the browser prefers v6.
	if (parsed.family === 6 && (parsed.value >> 32n) === 0xffffn) {
		return { family: 4, value: parsed.value & 0xffffffffn };
	}
	return parsed;
};

/**
 * True only if the client matches an entry.
 *
 * An empty allowlist returns false regardless of input — the fail-closed
 * contract lives here so a caller cannot forget to check it.
 */
export const ipAllowed = (client: string | null | undefined, allowlist: Allowlist): boolean => {
	if (allowlist.entries.length === 0) return false;
	if (!client) return false;
	const normalized = normalizeClient(client);
	if (!normalized) return false;
	return allowlist.entries.some((e) => {
		if (e.family !== normalized.family) return false;
		const bits = e.family === 4 ? 32 : 128;
		return mask(normalized.value, e.prefix, bits) === mask(e.base, e.prefix, bits);
	});
};

/** Client address for allowlisting. `CF-Connecting-IP` only — see header. */
export const sourceIp = (request: Request): string | null => {
	const raw = request.headers.get('cf-connecting-ip');
	const ip = raw?.trim();
	return ip ? ip : null;
};
