import { jsonResponse } from './cors';

/**
 * Best-effort in-memory sliding-window rate limiter for Cloudflare Workers.
 *
 * Workers isolates don't share memory, so this is per-isolate protection
 * against casual abuse / accidental loops — not a replacement for
 * Cloudflare Rate Limiting rules or Durable Object counters for
 * production-grade enforcement. Gateways + expensive routes (viper
 * analyze, booking email) get the strictest buckets.
 */

export interface RateLimitOptions {
	/** Max requests allowed inside the window. */
	readonly limit: number;
	/** Window length in milliseconds. */
	readonly windowMs: number;
	/** Bucket namespace — use one prefix per route (e.g. 'gw', 'viper-analyze'). */
	readonly prefix: string;
}

const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000;

export const getClientIp = (request: Request): string => {
	const cfIp = request.headers.get('cf-connecting-ip');
	if (cfIp) return cfIp.trim();
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
	return 'unknown';
};

const prune = (timestamps: number[], now: number, windowMs: number): number[] => {
	const cutoff = now - windowMs;
	let start = 0;
	while (start < timestamps.length && timestamps[start] <= cutoff) start++;
	return start === 0 ? timestamps : timestamps.slice(start);
};

/**
 * Record a hit and report whether the caller is over budget.
 * Returns `retryAfterSec` (0 when allowed) so callers can set `Retry-After`.
 */
export const hitRateLimit = (
	request: Request,
	{ limit, windowMs, prefix }: RateLimitOptions
): { allowed: boolean; retryAfterSec: number; remaining: number } => {
	const now = Date.now();
	const key = `${prefix}:${getClientIp(request)}`;
	const existing = prune(buckets.get(key) ?? [], now, windowMs);

	if (existing.length >= limit) {
		const oldest = existing[0] ?? now;
		const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
		buckets.set(key, existing);
		return { allowed: false, retryAfterSec, remaining: 0 };
	}

	existing.push(now);
	buckets.set(key, existing);

	if (buckets.size > MAX_BUCKETS) {
		// Prevent unbounded growth on high-cardinality IPs; drop the oldest bucket.
		const oldestKey = buckets.keys().next().value;
		if (oldestKey) buckets.delete(oldestKey);
	}

	return { allowed: true, retryAfterSec: 0, remaining: limit - existing.length };
};

/**
 * Convenience wrapper: returns a 429 JSON response when over budget,
 * otherwise `null` so the handler continues.
 */
export const rateLimitOr429 = (
	request: Request,
	options: RateLimitOptions,
	route = 'rate_limited'
): Response | null => {
	const result = hitRateLimit(request, options);
	if (result.allowed) return null;
	const res = jsonResponse(
		{ error: 'rate_limited', route, retry_after_seconds: result.retryAfterSec },
		429
	);
	// `jsonResponse` builds immutable headers — clone to add Retry-After.
	const headers = new Headers(res.headers);
	headers.set('Retry-After', String(result.retryAfterSec));
	return new Response(res.body, { status: 429, headers });
};
