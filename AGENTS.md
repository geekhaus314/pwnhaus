## Project

SvelteKit 5 + Svelte 5 portfolio (`pwn4g3`). Static+SSR frontend deployed to Cloudflare Pages (`pwn4g3.pages.dev`) via `@sveltejs/adapter-cloudflare`; backend is a Cloudflare Worker (`pwn4ge` at `pwn4ge.geekhaus314.workers.dev`).

## Development

```sh
npm run dev        # start dev server (vite)
npm run preview    # preview the production build
```

## Verification

Always run before finishing a task:

```sh
npm run check      # svelte-kit sync + svelte-check (type + a11y + diagnostics)
```

## Documentation

- [SvelteKit docs](https://svelte.dev/docs/kit)
- [Svelte docs](https://svelte.dev/docs/svelte)
- [adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## Structure

- `src/routes/` — pages (SvelteKit file-based routing)
- `src/lib/components/` — shared components
- `src/lib/data/` — profile + project data; project screenshot paths reference `/shots/*.png`
- `static/` — static assets served at root (`shots/`, hero photos, favicon, `sw.js`, `manifest.webmanifest`). Does NOT include `_headers` (that lives at the repo root — adapter-cloudflare fails the build if placed in `static/`)
- `_headers` (repo root) — Cloudflare Pages security headers, merged into the build output
- `src/app.html` — document shell (canonical/OG/JSON-LD metadata lives here)
- `workers/site-backend/` — Cloudflare Worker (TypeScript) with `wrangler.jsonc` config

SSR gotcha: no `window`/`document` access during SSR. Guard browser-only code in `onMount` (see `src/lib/components/HeroCanvas.svelte`).

## Deployment

Frontend (build outputs to `.svelte-kit/cloudflare`):

```sh
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name pwn4g3 --branch main
```

Backend worker:

```sh
npx wrangler deploy --config workers/site-backend/wrangler.jsonc --env production
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` env vars. GitHub Actions runs both jobs automatically on push to `main`.