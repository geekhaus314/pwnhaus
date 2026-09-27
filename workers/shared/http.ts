/**
 * Outbound HTTP safety + discipline for Workers.
 *
 * Two jobs, both of which every fetch in this repo was hand-rolling:
 *
 *  1. **SSRF containment.** `validatePublicUrl()` is a hostname-level
 *     allowlist/denylist. Workers cannot resolve DNS before connecting, so
 *     this is *not* a defence against DNS rebinding — a public name that
 *     resolves to 127.0.0.1 would still get through. It does stop the
 *     things that actually show up in a public endpoint's logs: literal
 *     private/loopback/metadata addresses, non-HTTP schemes, credentialed
 *     URLs, and internal-only TLDs. Documented as a limit, not sold as
 *     a guarantee.
 *
 *  2. **Request discipline.** Real timeouts (`AbortSignal.timeout` — a
 *     `timeout` key in `RequestInit` is silently ignored), a bounded
 *     redirect chain that is *re-validated at every hop* so a public URL
 *     can't bounce a request into a private one, a streaming byte cap so
 *     one response can't blow the isolate's memory, and a closed error
 *     taxonomy instead of `catch (e) { console.log(e) }`.
 *
 * Origin: the retry/timeout discipline from a downloaded `proxy_rotation.ts`,
 * minus its actual purpose (cycling IPs to stay off blocklists). If you
 * need to fetch a lot of third-party sites, the answer is a real User-Agent,
 * a contact URL, and a rate budget — not a proxy pool.
 */

/** Probe identity. Contactable, honest, and specific per caller. */
export const PROBE_UA = 'pwn4g3-audit/1.0 (+https://pwn4g3.pages.dev)';

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_BYTES = 500_000;

export type SchemeError = 'invalid_url' | 'blocked_scheme' | 'blocked_host' | 'blocked_port' | 'credentials_in_url';

export type FetchError =
	| SchemeError
	| 'timeout'
	| 'too_many_redirects'
	| 'too_large'
	| 'network_error'
	| 'http_error';

/** Blocked IPv4 ranges. Prefixes are matched as octets so 10.0.0.0/8 and
 *  10.255.255.255 both hit without an integer conversion. */
const BLOCKED_V4: readonly (readonly [number, number, number, number])[] = [
	[0, 0, 0, 0], //      0.0.0.0/8      "this network"
	[10, 0, 0, 0], //     10.0.0.0/8      private
	[100, 64, 0, 0], //   100.64.0.0/10   CGNAT
	[127, 0, 0, 0], //    127.0.0.0/8     loopback
	[169, 254, 0, 0], //  169.254.0.0/16  link-local + cloud metadata (AWS/GCP/Azure)
	[172, 16, 0, 0], //   172.16.0.0/12   private
	[192, 0, 0, 0], //    192.0.0.0/24    IETF protocol assignments
	[192, 0, 2, 0], //    192.0.2.0/24    TEST-NET-1
	[192, 88, 99, 0], //  192.88.99.0/24  6to4 relay anycast
	[192, 168, 0, 0], //  192.168.0.0/16  private
	[198, 18, 0, 0], //   198.18.0.0/15   benchmarking
	[198, 51, 100, 0], // 198.51.100.0/24 TEST-NET-2
	[203, 0, 113, 0], //  203.0.113.0/24  TEST-NET-3
	[224, 0, 0, 0], //    224.0.0.0/4     multicast
	[240, 0, 0, 0] //     240.0.0.0/4     reserved + broadcast
];

const isBlockedIPv4 = (host: string): boolean => {
	const parts = host.split('.');
	if (parts.length !== 4) return false;
	const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
	if (octets.some((n) => Number.isNaN(n) || n > 255)) return false;
	const [a, b] = octets as [number, number, number, number];
	return BLOCKED_V4.some((p) => a === p[0] && b === p[1]);
};

const isBlockedIPv6 = (host: string): boolean => {
	const h = host.replace(/^\[|\]$/g, '').toLowerCase();
	if (h === '::1' || h === '::') return true;
	// Unique-local (fc00::/7) and link-local (fe80::/10).
	if (/^f[cd]/.test(h)) return true;
	if (/^fe[89ab]/.test(h)) return true;
	// IPv4-mapped / -compatible: re-check the embedded v4 address.
	const mapped = /^(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h);
	if (mapped?.[1]) return isBlockedIPv4(mapped[1]);
	return false;
};

/** Internal-only suffixes that never appear on the public internet. */
const BLOCKED_SUFFIXES: readonly string[] = [
	'.local',
	'.localhost',
	'.internal',
	'.intranet',
	'.home.arpa',
	'.arpa',
	'.onion',
	'.test',
	'.example',
	'.invalid'
];

/**
 * Wildcard-DNS rebinding services (recon-verified 2026-09-27).
 *
 * These resolve *any* embedded IP literally, so `localtest.me` and
 * `127.0.0.1.nip.io` are public hostnames that pass every check above and
 * still land on loopback. Confirmed with a live probe: a POST of
 * `localtest.me` returned `status=200 bytes=10703`, i.e. the worker
 * fetched a loopback-only service.
 *
 * Workers has no DNS resolution API, so the hostname can't be resolved and
 * checked before connecting — this list is a mitigation, not a fix. The
 * residual risk is bounded by three things, all verified:
 *   1. Cloudflare's edge refuses egress to link-local/metadata space even
 *      when the hostname is clean (`169.254.169.254.nip.io` failed with a
 *      network error, not a validation error).
 *   2. The audit response never returns the fetched body — only derived
 *      scalars (title, contact, tech, timings). So a successful rebind
 *      yields a fingerprint, not a dump.
 *   3. `rateLimitOr429` caps a caller at 10 probes/hour/IP.
 *
 * Treat this list as a denylist to keep current, not a security boundary.
 */
const REBIND_SERVICES: readonly string[] = [
	'nip.io',
	'sslip.io',
	'xip.io',
	'localtest.me',
	'lvh.me',
	'vcap.me',
	'local.gd',
	'127.0.0.1.nip.io'
];

/** True when the hostname embeds a literal IP, e.g. `10.0.0.1.nip.io`. */
const EMBEDS_IPV4 = /(\d{1,3}\.){3}\d{1,3}/;

export interface UrlValidation {
	readonly ok: boolean;
	/** Canonical URL string when `ok`. */
	readonly url?: string;
	readonly error?: SchemeError;
	readonly reason?: string;
}

/**
 * Accept only absolute public http(s) URLs. Returns a normalized URL
 * string so callers never re-parse untrusted input.
 */
export const validatePublicUrl = (input: string): UrlValidation => {
	const raw = input.trim();
	if (!raw || raw.length > 2048) {
		return { ok: false, error: 'invalid_url', reason: 'empty_or_too_long' };
	}

	// Bare hostnames are a convenience for humans typing into a form.
	// Only accept an unambiguous shape, then re-validate as a full URL.
	const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

	let url: URL;
	try {
		url = new URL(candidate);
	} catch {
		return { ok: false, error: 'invalid_url', reason: 'unparseable' };
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { ok: false, error: 'blocked_scheme', reason: url.protocol };
	}
	if (url.username || url.password) {
		return { ok: false, error: 'credentials_in_url', reason: 'userinfo_present' };
	}

	// Non-default ports are how internal services and admin panels hide.
	if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) {
		return { ok: false, error: 'blocked_port', reason: url.port };
	}

	const host = url.hostname.toLowerCase().replace(/\.$/, '');

	if (host.startsWith('[') || host.includes(':')) {
		if (isBlockedIPv6(host)) return { ok: false, error: 'blocked_host', reason: 'ipv6_reserved' };
	} else if (isBlockedIPv4(host)) {
		return { ok: false, error: 'blocked_host', reason: 'ipv4_reserved' };
	} else if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
		return { ok: false, error: 'blocked_host', reason: 'internal_tld' };
	} else if (REBIND_SERVICES.includes(host) || REBIND_SERVICES.some((s) => host.endsWith(`.${s}`))) {
		return { ok: false, error: 'blocked_host', reason: 'rebind_service' };
	} else if (EMBEDS_IPV4.test(host) && /\d/.test(host.split('.').slice(-1)[0] ?? '')) {
		// `10.0.0.1.nip.io` style: an IP glued onto a wildcard-DNS name.
		return { ok: false, error: 'blocked_host', reason: 'embedded_ip_hostname' };
	} else if (!host.includes('.')) {
		// Single-label names resolve through a local search domain.
		return { ok: false, error: 'blocked_host', reason: 'no_public_tld' };
	} else if (!/^[a-z0-9.-]+$/.test(host)) {
		return { ok: false, error: 'blocked_host', reason: 'illegal_charset' };
	}

	// Drop the fragment; keep the path and query (some sites 404 without them).
	url.hash = '';
	return { ok: true, url: url.toString() };
};

export interface SafeFetchOptions {
	readonly method?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: BodyInit;
	readonly timeoutMs?: number;
	readonly maxRedirects?: number;
	readonly maxBytes?: number;
	readonly userAgent?: string;
	/** Set false to read status/headers without consuming the body. */
	readonly readBody?: boolean;
}

export interface SafeFetchResult {
	readonly ok: boolean;
	readonly status: number;
	/** URL after the redirect chain. */
	readonly finalUrl: string;
	/** Every URL visited, including the first. */
	readonly chain: readonly string[];
	readonly headers: Headers;
	readonly body: Uint8Array;
	readonly bytes: number;
	/** True when the body hit `maxBytes` and was cut short. */
	readonly truncated: boolean;
	/** Wall time to the final response headers. */
	readonly ttfbMs: number;
	readonly error?: FetchError;
	readonly reason?: string;
}

const failure = (
	error: FetchError,
	reason: string,
	partial: Partial<SafeFetchResult> = {}
): SafeFetchResult => ({
	ok: false,
	status: 0,
	finalUrl: '',
	chain: [],
	headers: new Headers(),
	body: new Uint8Array(0),
	bytes: 0,
	truncated: false,
	ttfbMs: 0,
	error,
	reason,
	...partial
});

/**
 * Read at most `maxBytes` from a response body. Streaming rather than
 * `arrayBuffer()` so a hostile 2GB response can't allocate 2GB.
 */
const readCapped = async (
	res: Response,
	maxBytes: number
): Promise<{ bytes: Uint8Array; truncated: boolean }> => {
	const declared = Number(res.headers.get('content-length') ?? '');
	if (Number.isFinite(declared) && declared > maxBytes) {
		// Trust the header enough to skip a body we already know is too big.
		return { bytes: new Uint8Array(0), truncated: true };
	}
	if (!res.body) return { bytes: new Uint8Array(0), truncated: false };

	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			const remaining = maxBytes - total;
			if (value.byteLength >= remaining) {
				chunks.push(value.subarray(0, remaining));
				total = maxBytes;
				await reader.cancel();
				return { bytes: concat(chunks, total), truncated: true };
			}
			chunks.push(value);
			total += value.byteLength;
		}
	} finally {
		reader.releaseLock();
	}
	return { bytes: concat(chunks, total), truncated: false };
};

const concat = (chunks: Uint8Array[], total: number): Uint8Array => {
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.byteLength;
	}
	return out;
};

const classifyNetworkError = (e: unknown): FetchError =>
	e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'network_error';

/**
 * Fetch a validated public URL with bounded redirects, a real timeout,
 * and a byte cap. Never throws — failures come back as `ok: false` with a
 * taxonomy callers can branch on, so a bad target domain never turns into
 * an unhandled rejection inside a request handler.
 */
export const safeFetch = async (
	target: string,
	opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> => {
	const {
		method = 'GET',
		headers = {},
		body,
		timeoutMs = DEFAULT_TIMEOUT_MS,
		maxRedirects = DEFAULT_MAX_REDIRECTS,
		maxBytes = DEFAULT_MAX_BYTES,
		userAgent = PROBE_UA,
		readBody = true
	} = opts;

	const validated = validatePublicUrl(target);
	if (!validated.ok || !validated.url) {
		return failure((validated.error ?? 'invalid_url') as FetchError, validated.reason ?? 'rejected');
	}

	const chain: string[] = [];
	let current = validated.url;
	const started = Date.now();

	for (let hop = 0; hop <= maxRedirects; hop++) {
		chain.push(current);
		let res: Response;
		try {
			res = await fetch(current, {
				method,
				headers: { 'User-Agent': userAgent, ...headers },
				body,
				redirect: 'manual',
				signal: AbortSignal.timeout(timeoutMs)
			});
		} catch (e) {
			const error = classifyNetworkError(e);
			return failure(error, error === 'timeout' ? `${timeoutMs}ms` : 'fetch_failed', {
				finalUrl: current,
				chain,
				ttfbMs: Date.now() - started
			});
		}

		const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get('location');
		if (isRedirect) {
			// Re-validate the *next* hop. A public URL that 302s to
			// http://169.254.169.254/ must not be followed.
			const location = res.headers.get('location') as string;
			let next: string;
			try {
				next = new URL(location, current).toString();
			} catch {
				return failure('network_error', 'bad_redirect_location', { finalUrl: current, chain });
			}
			const hopCheck = validatePublicUrl(next);
			if (!hopCheck.ok) {
				return failure((hopCheck.error ?? 'blocked_host') as FetchError, `redirect_${hopCheck.reason}`, {
					status: res.status,
					finalUrl: current,
					chain,
					ttfbMs: Date.now() - started
				});
			}
			current = hopCheck.url as string;
			continue;
		}

		const ttfbMs = Date.now() - started;
		if (!readBody) {
			return {
				ok: res.ok,
				status: res.status,
				finalUrl: current,
				chain,
				headers: res.headers,
				body: new Uint8Array(0),
				bytes: 0,
				truncated: false,
				ttfbMs
			};
		}

		let capped: { bytes: Uint8Array; truncated: boolean };
		try {
			capped = await readCapped(res, maxBytes);
		} catch (e) {
			return failure(classifyNetworkError(e), 'body_read_failed', {
				status: res.status,
				finalUrl: current,
				chain,
				ttfbMs
			});
		}

		return {
			ok: res.ok,
			status: res.status,
			finalUrl: current,
			chain,
			headers: res.headers,
			body: capped.bytes,
			bytes: capped.bytes.byteLength,
			truncated: capped.truncated,
			ttfbMs,
			...(res.ok ? {} : { error: 'http_error' as const, reason: `status_${res.status}` })
		};
	}

	return failure('too_many_redirects', `>${maxRedirects}`, {
		finalUrl: current,
		chain,
		ttfbMs: Date.now() - started
	});
};
