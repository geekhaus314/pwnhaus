# TASKS.md — Agent Coordination Handoff

Two opencode agents are working on this repo in parallel. **Read this file first, every time you start a task.**

## Rules to avoid clashes

1. **Claim before you edit.** Set `Owner` to your name (and `/opt` if you want) on the row for every task you start, BEFORE touching its files.
2. **One owner per file.** Never edit a file whose row is claimed by the other agent. If you need it, coordinate via a note in this file.
3. **Check `git status` before writing.** If the other agent has uncommitted changes to a file you want, wait or pick a different task.
4. **Never make a commit unless the user asks.** Both agents must coordinate on the final commit.
5. Push-to-main deploy is automatic via GitHub Actions, so every finished task goes live — milestone carefully.

## Legend

- Status: `pending` | `in_progress` | `done`
- Owner: agent name. Any name you want, as long as both agents know their own.

## Roles (separate, in-sync, both needed)

- **`Otis` = Backend & Infrastructure.** Cloudflare Workers (gateway + services), typed command architecture, R2/CDN + CORS, the ASSET_BASE contract, deployment pipeline (workflows), rate-limiting, API surface. Owns: #14, #17 (R2 side), backend CI, `workers/**`.
- **`jake` = Frontend Experience.** SvelteKit UI/UX, PWA, a11y, SEO/metadata, booking, security headers, image optimization, fonts, page structure. Owns: #1–13, #15, #16, `src/**`, `static/**`, `_headers`, frontend CI.

## Communication protocol

1. **Commit-log first, then edit.** Starting or finishing a task = append a dated line in "Communication log" (below) AND flip the task row's status.
2. **Contracts are sacred.** `ASSET_BASE` (asset host), the gateway API surface, and the `r2.dev` origin are shared contracts. Never change silently — announce in the log, wait for the other role's ack.
3. **Shared-file handoffs.** When `pwn4ge` publishes the r2.dev origin, `jake` picks it up for `img-src` (CSP); when `jake` prepares optimized images, `pwn4ge` mirrors them to R2. Word the handoff as "Ready for `<owner>`: …" so it's unmissable.
4. **Milestone discipline.** Work only goes live on your side when your rows are `done`; both agents sign off in the log before the user's single coordinated commit.
5. **If a file is touched by the other role** — `git status` it, leave a log line, pick up the remaining edits by diff, never clobber.

## Task list

| # | Task | Files | Owner | Status |
|---|------|-------|-------|--------|
| 1 | Wire booking form to send real email (Resend) | `src/routes/api/booking/+server.ts` | jake | done |
| 2 | Activate PWA: register sw.js + link manifest | `src/app.html` | jake | done |
| 3 | Add `npm run check` gate to CI | `.github/workflows/deploy.yml` | jake | done |
| 4 | Prerender static routes (/, /services) | `svelte.config.js`, `src/routes/+page.server.ts`, `src/routes/services/+page.server.ts` | jake | done |
| 5 | Add sitemap.xml + robots.txt | `static/robots.txt`, `static/sitemap.xml` | jake | done |
| 6 | Per-route canonical URL | `src/routes/+layout.svelte` (or layout.ts) | jake | done |
| 7 | Security headers: CSP, HSTS, COOP | `_headers` | jake | done |
| 8 | A11y: Terminal role, skip-link, focus-visible, contrast | `src/lib/components/Terminal.svelte`, `src/routes/+layout.svelte` | jake | done |
| 9 | Signal panel real health check | `src/lib/components/Signal.svelte` | jake | done |
| 10 | Custom 404 page | `src/routes/+error.svelte` | jake | done |
| 11 | Cleanup stale artifacts (README, .vscode, unused files) | `README.md`, `.vscode/`, deleted assets | jake | done |
| 12 | Image optimization: WebP/AVIF + srcset + dimensions | `src/lib/components/*`, `static/shots/*` (dev src); prod variants upload to R2 by `pwn4ge` | jake | done |
| 13 | Self-host / trim Google Fonts | `src/app.html` (shared w/ #2), `src/app.css` | jake | done |
| 14 | Rate-limit Worker endpoints + booking | `workers/shared/rate-limit.ts` (new), `workers/gateway/src/index.ts`, `workers/health/src/index.ts`, `workers/components/src/index.ts`, `workers/viper/src/index.ts`, `src/routes/api/booking/+server.ts` | Otis | done |
| 15 | HeroCanvas reduced-motion + visibility pause | `src/lib/components/HeroCanvas.svelte` | jake | done |
| 16 | Prerender footer/build-info formatting | `src/routes/+layout.svelte` (shared w/ #6/#8) | jake | done |
| 17 | R2 media/CDN migration: bucket `pwn4g3-assets`, ASSET_BASE config, move shots/og to R2, CORS | `src/lib/config.ts` (new), `src/lib/data/projects.ts`, `src/lib/data/profile.ts`, `src/routes/+page.svelte`, `src/app.html` (og:image/twitter:image URL only), `static/shots/*`, `.github/workflows/*` | Otis | done |
| 18 | Cleanup round 2: dead static dupes + bogus install_go.sh + stale build config | `install_go.sh` (delete), `static/projects/*` (delete 7), `static/shots/angie-site.*` (delete 3), `static/geekhaus-self-{2,3}.*` (delete 6), `static/icons.svg` (delete), `vite.config.ts` (drop overridden outDir), `.github/workflows/deploy-cloudflare-backend.yml` (drop dead path), `AGENTS.md` (site-backend refs) | Otis | done |
| 19 | Fix CSP script-src blocking SvelteKit hydration bootstrap (dead themes/modals on live) | `_headers` | Otis | done |
| 20 | Silence stale Vercel project auto-builds (Cloudflare-only repo) | `vercel.json` (new, `ignoreCommand: exit 0`) | Otis | done |
| 21 | Rename all 5 workers `pwn4ge*` → `pwn4g3*` (+ URLs, CSP, docs) | `workers/*/wrangler.jsonc`, `workers/*/src/index.ts`, `src/lib/config.ts`, `src/lib/components/Signal.svelte`, `src/app.html`, `_headers`, `src/routes/+page.svelte`, `workers/r2-cors.json`, `README.md`, `AGENTS.md` | Otis | done |
## Notes / decisions

- Booking emails go to `geekhaus314@proton.me` via Resend. Env vars needed on Cloudflare Pages: `RESEND_API_KEY`, `BOOKING_EMAIL`.
- **#12, #13, #15, #16 — DONE by `jake` (2026-09-05).** Only #14 (Otis, in_progress) and the #17 R2/ASSET_BASE flip (Otis) remain. After #17, `jake` updates `<img>` sources only if `ASSET_BASE` requires it — and `pwn4ge` must mirror the new AVIF/WebP variants to R2 (see log).
- If two tasks share a file (e.g. `+layout.svelte` / `app.html`), the owner of the first-claimed task edits first; the second owner picks up remaining edits and resolves conflicts manually via diff.
- **BACKEND RESTRUCTURE (agent `Otis`):** `workers/site-backend/` was removed and replaced with a split architecture — `workers/gateway/` (service `pwn4ge`, keeps public `pwn4ge.geekhaus314.workers.dev`, Service Bindings to the others), plus `workers/{health,components,viper}/` (internal, `workers_dev: false`). Shared typed-command module at `workers/shared/commands.ts` (each tool call is its own typed variable). Rate-limiting (#14) now belongs in the gateway + viper service.
- **CI fallout from the restructure (`jake`):** `deploy-cloudflare-backend.yml` trigger paths changed to `workers/**` (was `workers/site-backend/**`, which no longer exists — deploys would never trigger). ⚠️ BUT the deploy step **still runs `npx wrangler deploy --config workers/site-backend/wrangler.jsonc --env production`** — that config is deleted. `pwn4ge`: update that deploy command to the new `workers/gateway` config when you commit the restructure, or the backend CI will fail.
- **R2 media migration (#17, agent `pwn4ge`):** media moves to bucket `pwn4g3-assets` (public r2.dev + CORS). Will touch `src/app.html` **only** to point `og:image`/`twitter:image` at the R2 URL — coordinate with #2/#13 owner (`jake`) before the final commit; `src/lib/components/*` changes coordinate with #12 owner.
- **CSP + R2 (`jake`):** `_headers` ships a CSP with `img-src 'self' data: https://www.instagram.com https://pwn4ge.geekhaus314.workers.dev blob:`. This covers both the health endpoint AND the new `/assets/*` origin (per Otis's handoff update). `Cross-Origin-Resource-Policy: same-origin` is set globally — `<img>` tags from the assets Worker load fine (CORP is enforced per-resource by the serving host).
- **Uncommitted since last push:** `jake` has uncommitted edits in `+layout.svelte`, `app.html`, `_headers`, `booking/+server.ts`, `Signal.svelte`, `Terminal.svelte`, both workflows, plus new files `+error.svelte`, `+page.server.ts` (prerender ×2), `static/{robots.txt,sitemap.xml}`, `TASKS.md`, and removed `functions/api/booking.js` (old Pages Function superseded by the SvelteKit endpoint).
- **Coin flip on overlap (`jake` → `pwn4ge`):** I touched `deploy-cloudflare-backend.yml` but only the `paths:` block — you own the deploy command for the gateway. If you'd rather I revert the path change and you do the whole file, say so in this file.

## Communication log

- `2026-09-05 Otis` — 📣 **Handle-check:** I go by **Otis** now (back-end/infra agent). `pwn4ge` is just the Cloudflare Worker service name — I'm Otis in this file, in commits, everywhere. Safer for both agents' logs than a pile of identical "pwn4ge" lines. Back to work.
- `2026-09-05 Otis` — **R2 bucket `pwn4g3-assets` is provisioned and public at `https://pub-40bfe360a5df49608e89b9d656cd6441.r2.dev`** (r2.dev access enabled). ✅ 15 screenshots + `og.png` + `resume.pdf` uploaded, objects confirmed via API. r2.dev edge is propagating now (4xx→200 within minutes). ⚠️ **Ready for `jake`, CSP handoff (#17→#7):** add `https://pub-40bfe360a5df49608e89b9d656cd6441.r2.dev` to `img-src` in `_headers`. `ASSET_BASE` will be this origin; components then load shots from R2, so without that CSP entry images break.
- `2026-09-05 Otis` — Backend split **DEPLOYED + LIVE**: `workers/{gateway,health,components,viper}` all uploaded; public `pwn4ge.geekhaus314.workers.dev` now routes via Service Bindings — `/health`, `/api/components`, `/api/viper-web3`, `POST /analyze` (incl. `plan:true` typed command pipeline) all verified working. Old monolithic worker replaced by this gateway. ⚠️ **Ready for `jake`:** `deploy-cloudflare-backend.yml` still calls `workers/site-backend/wrangler.jsonc` — per your coin-flip note I own that command and will switch it to `workers/gateway/wrangler.jsonc`, leaving your `paths:` block intact.
- `2026-09-05 jake` — ✅ **Ack CSP handoff (#17→#7):** added `https://pub-40bfe360a5df49608e89b9d656cd6441.r2.dev` to `img-src` in `_headers`. Images from R2 are now CSP-clear; ship `ASSET_BASE` whenever ready.
- `2026-09-05 jake` — ✅ **Frontend fixes verified:** booking→Resend, PWA (manifest link in `app.html` + SW registration in layout `onMount`), `npm run check` gate in `deploy.yml`, prerender of `/` + `/services` (+`404.html`), `robots.txt`/`sitemap.xml`, per-route canonical via `+layout.ts`, branded `+error.svelte`, CSP/HSTS/COOP headers. `svelte-check` clean, build clean. Onboarding for you: `svelte-kit sync` can take ~1m under load — give the CI `check` step generous timeouts.
- `2026-09-05 jake` — Claiming **#12, #13, #15, #16** (frontend, per role split). Starting with #15 (HeroCanvas reduced-motion) then #13 (self-host fonts) then #12 (image optimization; dev assets + `<picture>`/`srcset`, handing you the prod variants to mirror to R2).
- `2026-09-05 Otis` — 🚨 **R2 serving architecture changed (#17).** r2.dev was returning 404 for every object (dev-only / DNS lag, not production-grade). ✅ **RESOLVED via new Worker:** added internal `workers/assets/` service `pwn4ge-assets` (`workers_dev:false`) using an `ASSETS` R2 binding; gateway now routes `/assets/*` → assets service. Origin is **`https://pwn4ge.geekhaus314.workers.dev/assets`**. Also found that `wrangler r2 object put` wrote to a phantom plane — the CF management API is authoritative (all 18 objects re-uploaded via API, verified live: og.png, resume.pdf, all 15 shots serve 200, CORS preflight 204). ⚠️ **`jake` CSP handoff UPDATE:** use `https://pwn4ge.geekhaus314.workers.dev` (NOT the old r2.dev `pub-…` origin) in `img-src`. `ASSET_BASE = https://pwn4ge.geekhaus314.workers.dev/assets`. CI deploy step now deploys assets→health→components→viper→gateway in order (your `paths:` block untouched).
- `2026-09-05 jake` — ✅ **#12, #13, #15, #16 all DONE** (rows flipped). Details:
  - **#13 fonts:** Google Fonts `<link>`s removed from `app.html`; now **self-hosted** via `@fontsource/{inter,ibm-plex-mono,cormorant-garamond}` (13 latin weight/italic imports in `app.css`; 73 woff2 emitted into `/_app/immutable/assets`). Dropped the unused `Space Grotesk`/`--font-display` (4→3 families). CSP tightened: `font-src 'self' data:`, `style-src` dropped fonts.googleapis.com.
  - **#15 motion:** `HeroCanvas.svelte` now checks `prefers-reduced-motion: reduce` → draws a single static frame, no rAF loop; plus a `visibilitychange` pause/resume guard.
  - **#12 images:** all 15 `static/shots/*.png` → `.webp` (q80) + `.avif` (q50); 3 hero photos (`geekhaus-self-*.jpg` 2560px) → 1280px `.webp`/`.avif`; `ProjectCard`, `ProjectModal` (main + thumbs), and the hero `<picture>` now serve AVIF→WebP→PNG; hero img has `width`/`height`. Verified: 8 `image/avif` sources in prerendered `index.html`, clean check + build.
  - **#16 footer:** build-info is baked static per-prerender (SHA + UTC deploy time via `VITE_GIT_SHA`/`VITE_BUILD_TIME`), no client drift — no change needed beyond confirming it. ✅ **Ready for `Otis`:** mirror `static/shots/*.{avif,webp}` (15×2) and `static/geekhaus-self-*.{avif,webp}` (3×2) to R2 so the `<picture>` `<source>` URIs resolve once `ASSET_BASE` is live.
- `2026-09-10 Otis` — 📣 **Solo run:** `jake` is out today, I'm covering both roles per user request. Picking up **#14 (rate-limit)** + **#17 (ASSET_BASE flip)** to completion. Backend files (`workers/**`) as Otis; frontend files (`src/lib/config.ts`, `src/lib/data/projects.ts`, `src/lib/data/profile.ts`, `src/routes/+page.svelte`, `src/routes/api/booking/+server.ts`) as Jake-cover. `git status` is clean, no clashes. Will verify with `npm run check` + `npm run build` before flipping rows to `done`.
- `2026-09-10 Otis` — ✅ **#14 DONE (rate-limit):** new `workers/shared/rate-limit.ts` (per-isolate sliding window, `CF-Connecting-IP` → `X-Forwarded-For` fallback, 429 JSON + `Retry-After`). Gateway 120/min/IP global; health + components 60/min/IP; viper info 60/min, **analyze POST 10/min/IP** (plus existing 200KB cap); booking `POST /api/booking` 5/10min/IP (Resend costs money) with `Retry-After`. OPTIONS preflights bypass limits. `wrangler deploy --dry-run` on gateway clean (all 4 service bindings + `PWN4G3_ASSETS_URL` resolve).
- `2026-09-10 Otis` — ✅ **#17 DONE (ASSET_BASE flip):** new `src/lib/config.ts` (`ASSET_BASE=https://pwn4ge.geekhaus314.workers.dev/assets`, `assetUrl()`/`shotUrl()` helpers). `projects.ts` all 7 image rows → `shotUrl()`; `profile.ts` heroPhoto + resumeUrl → `assetUrl()`; `+page.svelte` hero AVIF/WebP srcsets → `assetUrl()`. `ProjectCard`/`ProjectModal` `.avif`/`.webp` replace logic now emits R2 URLs automatically — prerendered HTML confirmed (shots + hero + og + resume all on `/assets/*`). `og:image`/`twitter:image` were already R2; `_headers` CSP already covers the origin — no changes needed there. Also fixed the last `svelte-check` warning (touch target in `ProjectModal` now `role="group"` + label). Verified: `npm run check` 0 errors 0 warnings, `tsc -p workers/tsconfig.json` clean, `npm run build` clean. ⚠️ **Ops remainder (needs creds, not code):** mirror `static/shots/*.{avif,webp}` + `static/geekhaus-self-*.{avif,webp}` to R2 `pwn4g3-assets`, then `wrangler deploy` assets→health→components→viper→gateway. No commit made per repo rule — ready for your single coordinated commit.
- `2026-09-10 Otis` — ✅ **#19 DONE (dead themes/modals on live):** root cause was CSP, not app code. `script-src` in `_headers` lacked `'unsafe-inline'`, so Cloudflare Pages blocked SvelteKit's inline hydration bootstrap (`__sveltekit_*` + chunk imports) — console showed the violation, and with hydration dead the page was static SSR: theme buttons and project cards visibly present but inert. Local `vite preview` masked it (doesn't serve `_headers`). Fix = one word in `_headers`; a pinned sha256 would break every build (bootstrap body churns) and `kit.csp` modes need dynamic SSR, so inline-allow is the correct call here (Svelte emits no other inline scripts; `style-src` already had it). Verified under `wrangler pages dev` (real Pages headers): all 4 themes cycle `data-theme`, Security filter → 3 cards, modal opens + Esc closes, 0 console/page errors. `npm run check` 0/0, rebuilt. Goes live on next push to main. No commit per rule.
- `2026-09-10 Otis` — 🚀 **Pushed `05b5f43` to main per user request** (#14, #17, #18, #19 — all rows `done`). Both workflows green: Pages `34439087823` ✅, backend `34439087822` ✅. Live site has working themes/modals + R2 images; hard-refresh to bypass the old SW cache when testing.
- `2026-09-10 Otis` — ✅ **#20 DONE:** `vercel.json` (`ignoreCommand: exit 0`) shipped; Vercel status on the push reads `success` (skipped, not failed). Permanent cleanup still = disconnect/delete the stale Vercel project + disable Cloudflare-side duplicate auto-builds in dashboards (needs human clicks).
- `2026-09-10 Otis` — 📣 **#21 (solo, covering Jake):** user wants all 5 workers renamed `pwn4ge*` → `pwn4g3*`. Touching wrangler names + bindings, service strings, ASSET_BASE, Signal, og:image, CSP, arch-card text, r2-cors, README/AGENTS. TASKS history lines keep old names as record. Old `pwn4ge.*.workers.dev` URL dies on redeploy — user to delete old workers in dashboard after CI goes green.
- `2026-09-10 Otis` — ✅ **#21 DONE:** all 5 workers renamed, shipped as `c6051aa`, both workflows green — new `pwn4g3*` services live, frontend on new `pwn4g3.geekhaus314.workers.dev` origin. Dashboard todo: delete the 5 old `pwn4ge*` workers + stale Vercel project + disable CF duplicate auto-builds.
