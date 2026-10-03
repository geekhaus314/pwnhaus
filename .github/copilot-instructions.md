# Copilot instructions

## Commands

Run from the repository root:

```bash
npm run dev
npm run check
npm test
npm run build
npx tsc --noEmit -p workers/tsconfig.json
```

`npm test` runs Node's built-in test runner over `tools/test/`. Run one test file
with:

```bash
node --test tools/test/themes.test.mjs
node --test tools/test/local-import.test.ts
```

The frontend deployment workflow runs `npm ci`, `npm run check`, and
`npm run build`. `npm run check` covers Svelte diagnostics, TypeScript, and
accessibility checks; there is no root lint script.

## Architecture

The primary site is a SvelteKit 2 / Svelte 5 application. File-based pages and
layouts are in `src/routes/`, reusable UI is in `src/lib/components/`, and
content/configuration is in `src/lib/data/` and `src/lib/config.ts`. Static
assets are served from `static/`; Cloudflare Pages builds to
`.svelte-kit/cloudflare/`.

The root UI and API backend are separate deployables. The public
`workers/gateway/` Worker routes API paths to internal Workers through
Cloudflare Service Bindings. Each service in `workers/` has its own
`wrangler.jsonc`; shared HTTP, CORS, rate-limit, and audit logic lives in
`workers/shared/`. D1 schema changes are tracked as ordered SQL migrations in
`workers/migrations/` (and the isolated payments schema in
`workers/migrations-payments/`). Deploy backend services before the gateway
that binds to them.

`apps/` contains standalone lab/demo projects, not the main SvelteKit
application. `infra/` and `obsidian-platform/` are separate project areas with
their own entry points and documentation.

## Project-specific conventions

- Keep the browser/server boundary SSR-safe: do not read `window` or
  `document` during module initialization or server rendering. Put
  browser-only work in `onMount` or behind an explicit browser guard.
- Theme changes span three synchronized sources: the registry in
  `src/lib/data/themes.ts`, the `[data-theme]` token blocks in `src/app.css`,
  and the pre-paint theme map in `src/app.html`. Keep them aligned; the theme
  drift tests in `tools/test/themes.test.mjs` enforce the contract.
- Theme tokens represent both palette and structural appearance. Consume
  shared tokens in CSS rather than adding one-off hard-coded theme styling.
- Keep interactive delights, including the Konami-code easter egg, isolated
  in focused components and mounted through the shared layout. Avoid coupling
  them to the theme registry or changing theme tokens as a side effect.
- Keep portfolio facts and project metadata in `src/lib/data/`; route
  components should render that shared source rather than maintain conflicting
  copies.
- Add API behavior to the owning service and expose it through the gateway's
  service binding and route map. Preserve existing request/response contracts,
  shared rate limiting, and the service-specific Wrangler configuration.
- `/admin/api/*` routes must retain both the source-IP gate and bearer-token
  gate. The local-outreach integration is a one-record, versioned import into
  the existing D1 lead schema; it does not add bulk sync or message delivery,
  and must refuse records sourced from Google Maps HTML scraping.
- Keep D1 schema changes in numbered migration files and deploy migrations
  before Workers that depend on them.
- The root deploy workflows target Cloudflare Pages and Workers. A push to
  `main` can deploy; frontend changes are checked and built by
  `.github/workflows/deploy.yml`.
