/**
 * Shared media/CDN contract (#17).
 *
 * All production media (screenshots, hero photos, og.png, resume.pdf) is
 * served from the `pwn4g3-assets` R2 bucket via the assets Worker, routed
 * through the gateway:
 *
 *   https://pwn4g3.geekhaus314.workers.dev/assets/*
 *
 * Local `static/` files remain as dev fallbacks, but every `<img>`,
 * `<source>`, og:image, and resume link in production must go through
 * `assetUrl()` so the R2 origin + CSP stay in sync. If the origin ever
 * moves, change `ASSET_BASE` here only.
 */

export const ASSET_BASE = 'https://pwn4g3.geekhaus314.workers.dev/assets';

/** Prefix a root-relative media path (`/shots/x.png`) with the CDN origin. Absolute URLs pass through untouched. */
export const assetUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) return path;
	if (!path.startsWith('/')) return `${ASSET_BASE}/${path}`;
	return `${ASSET_BASE}${path}`;
};

/** Shorthand for project screenshots stored under `/shots/`. */
export const shotUrl = (filename: string): string =>
	assetUrl(`/shots/${filename.replace(/^\/+/, '')}`);

export const OG_IMAGE_URL = assetUrl('/og.png');
export const RESUME_URL = assetUrl('/resume.pdf');

/**
 * Public gateway origin (booking ingest, health, telemetry…).
 * Booking posts here (#31) so the queue + Turnstile + D1 ledger
 * pipeline handles mail — the SvelteKit /api/booking endpoint stays
 * deployed as a fallback but the form no longer uses it.
 */
export const GATEWAY_BASE = 'https://pwn4g3.geekhaus314.workers.dev';
export const BOOKING_API_URL = `${GATEWAY_BASE}/api/booking`;
