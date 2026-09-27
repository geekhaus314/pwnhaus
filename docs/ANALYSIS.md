# ANALYSIS — the ten downloaded files, and what survived

**Date:** 2026-09-26 · **Author:** Nova · **Scope:** the 10 artifacts in `~/Downloads` produced by an
AI chat session that claimed to "engineer production infrastructure" for pwnhaus, plus the code
snippets in that session's transcript that never made it to disk.

**Verdict:** 0 of 10 files would run on this stack. 6 of them duplicate something already shipped
correctly. 4 of them describe attack tooling or fabricated data. The ideas underneath are worth
about 6 real features, which now live in Round 8 of `TASKS.md`.

---

## Why "it doesn't run" is the least interesting problem

These files aren't slightly wrong, they're written for a runtime that doesn't exist here:

| Assumption in the files | Reality in this repo |
|---|---|
| `@prisma/client` + PostgreSQL | D1 (SQLite), 11 migrations, 5M rows/day read cap |
| `process.env.X` | Undefined on Workers/Pages. Bindings arrive as the `env` param; SvelteKit uses `$env/dynamic/private` |
| `require()`, `node-fetch`, `https-proxy-agent`, Node `agent` | None of these exist in workerd |
| `new Map()` as global state | Per-isolate and non-deterministic across thousands of isolates |
| `fetch(url, { timeout: 4000 })` | `timeout` is not a `RequestInit` key. Silently ignored. Correct form is `AbortSignal.timeout()` |
| `export let` / `on:click` / `createEventDispatcher` | Svelte 5 runes everywhere in `src/` |
| `prisma.$transaction` | D1 has `batch()`; interactive transactions don't exist |
| `pg_dump` → S3 Glacier | D1 export → R2, and per the #17 lesson, R2 writes go through the **API**, not `wrangler r2 object put` |
| `[[unsafe.metadata.rate_limiting]]`, `[site] bucket` | Not valid wrangler config; the schema rejects it. Real limiting already lives in `workers/shared/rate-limit.ts` + per-route budgets |
| `k6/http` imported in a `.js` file | k6 has its own module system; this only loads under `k6 run` |

Even with every one of those fixed, the design is wrong in three places that matter more than
syntax.

### 1. The audit tool invents its own results

`hive.ts` writes this on every request:

```ts
sslValid: true,
securityScore: handshakeOk ? 99 : 0
```

`capture.ts` derives its score from the string the user typed:

```ts
const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
isSslValid = cleanUrl.startsWith('https:');
const securityScoreMetric = handshakeSuccess && isSslValid ? 85 : 30;
```

`isSslValid` reports what the **caller's typing** looks like, not what the certificate chain did. The
`85` and `30` are literals. So a tool whose entire pitch is "here are your real security findings"
returns a confident number derived from nothing. On a portfolio whose whole argument is *proof, not
promises*, that is the one bug class that ends the argument.

**What shipped instead:** `workers/shared/audit.ts`. Every check is a real observation of a real
response — final URL after following the redirect chain hop by hop, whether the chain downgraded
`https:` → `http:`, cert-presence, `Strict-Transport-Security`, CSP, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, click-to-call/click-to-email presence, viewport meta,
HTML weight, TTFB, mixed content, deprecated markup. The 0–100 number is a **published rubric**
(each check states its own point value in the source) computed only from those observations. No
check is invented, and every one is reproducible from the response by hand.

### 2. Two of the routes are attack tools, not features

- **`/api/audit-mirror`** fetches any URL the caller supplies and injects a full-width red
  "LIVE INFRASTRUCTURE SIMULATION" overlay into the returned HTML. Unvalidated server-side fetch of
  a caller-controlled URL is SSRF; serving modified third-party HTML is phishing. The transcript
  frames it as a sales tool, and it is one — aimed at business owners who don't know they're being
  shown doctored output.
- **`/admin/config.php`** returns `403` plus 1000 repetitions of a string, to a scanner. A
  deliberate resource-consumption trap on infrastructure someone else pays for.
- **`proxy_rotation.ts`** exists for one purpose: cycling IPs so a scraper doesn't get blocked. The
  file even has a `192.168.1.5x` "proxy pool" that never existed. The honest fix for "my scraper
  gets blocked" is a real `User-Agent`, a contact address, and a rate budget — which
  `workers/admin-console/src/score.ts` already does.

None of these are in the repo.

### 3. The process-level "hardening" is theatre with sharp edges

```ts
if (String(fatalErr).includes('ENOLCK') || String(fatalErr).includes('EIO')) {
    process.exit(1);
}
return json({ ..., signature: Buffer.from(String(abyssalErr)).toString('base64') });
```

`process.exit(1)` inside a request handler tears down the whole isolate mid-request. And the
"encrypted" `signature` is base64 — a transport encoding that anyone with `base64 -d` reverses.
Calling it encryption in a security tool is the kind of detail a technical interviewer finds in
about ten seconds.

---

## File-by-file

### `schema.prisma`
Four models: `Lead`, `AuditLog`, `HiveCluster`, `GeoFootprint`, two enums.

- `Lead` / `AuditLog` → **already exist**, in D1, as `leads` + `outreach_log`
  (`workers/migrations/0006_leads.sql`) and `telemetry_events` (`0001`). The repo's version is
  better: it has a real status pipeline (`new → enriched → drafted → contacted → replied → won →
  lost`), a real `source` enum including `inbound`, and normalized `outreach_log` instead of a
  polymorphic `diagnostics` array.
- `HiveCluster { nexusIp, totalDigests, lastAwakenedAt }` → **no equivalent, and shouldn't get
  one.** It's a counter with no reader. The honest descendant of "one shared view of every audit
  ever run" is `GET /api/audit/summary`, which aggregates `audit_runs` in SQL and returns real
  totals.
- `GeoFootprint { city, region, country, latitude, longitude, visitedAt }` → one row per visitor,
  forever. That's a location log. Not shipped. The idea survives as an **aggregate-only** rollup
  (country/region counts per day, no IP, no coordinates), because that version can't identify
  anyone.

**Port:** `workers/migrations/0011_audit_runs.sql`. Prisma file deleted, not ported.

### `capture.ts`
Domain in → `HEAD` request → latency → D1 row → JSON out. A 90-line subset of
`admin-console/src/score.ts`, minus every check that makes the score meaningful.

Broken: `process.env`, `{timeout}` no-op, `x-forwarded-for` (client-spoofable — the repo uses
`CF-Connecting-IP`), `process.exit(1)`, and `prisma.$transaction` where D1 only has `batch()`.
Also no SSRF guard whatsoever, which matters enormously once the route is *public* instead of
admin-gated.

**Port:** the public `POST /api/audit` on the new `pwn4g3-audit` service, with `redirect: 'manual'`
and per-hop revalidation, a private-range/metadata-IP blocklist, scheme + port allowlists, a
500KB body cap, `CF-Connecting-IP` bucketing, and the shared `rateLimitOr429`. Response is a strict
superset of what `capture.ts` returned.

### `hive.ts`
`POST` a domain, mark it digested, return a hive population count. Three of its five output fields
are fabricated. Overlaps `capture.ts` almost entirely.

**Port:** merged into `POST /api/audit` (one probe, one write path) + `GET /api/audit/summary` for
the aggregate. The name is already taken by the escape-room service (`pwn4g3-hivemind`, #59).

### `export.ts`
Token-gated JSON dump of leads. The only file in the set with a correct idea and a correct threat
model — the bearer comparison just needs to move off `process.env` and off `===` (a timing side
channel) onto the constant-time SHA-256 compare the repo already uses.

**Port:** `GET /admin/api/export?dataset=leads|audits|bookings|notifications&format=json|csv` in
`workers/admin-console`, reusing `verifyAdminToken()` verbatim. Gains CSV, more datasets, row caps
and a `Content-Disposition` filename that isn't `Date.now()`-colliding.

### `proxy_rotation.ts`
Retry/timeout/UA discipline wrapped around a blocklist-evasion mechanism. Strip the evasion, keep
the discipline: it's exactly what every outbound fetch in this repo is hand-rolling.

**Port:** `workers/shared/http.ts` — `safeFetch()` with `AbortSignal.timeout`, a manual redirect
cap, a streaming byte cap, a descriptive `User-Agent`, and a closed error taxonomy
(`timeout` / `dns` / `tls` / `refused` / `too_many_redirects` / `too_large` / `http_4xx` /
`http_5xx`). Adopted by the audit worker, `scoreSite`, and the scheduler probes.

### `backup_pipeline.sh`
`pg_dump` → `aws s3 cp --storage-class STANDARD_IA` → `rm -f`. Correct shape, wrong substrate: no
Postgres, no AWS account, and D1 has no `pg_dump`.

**Port:** `wrangler d1 export` in the scheduler's existing weekly cron, uploaded through the **R2
API** (`wrangler r2 object put` wrote to a phantom plane in #17 — the management API is the only
authoritative path), plus `tools/d1-backup.sh` for manual/offline runs. Retention is set to 14
snapshots so the bucket can't grow unbounded on the free tier.

### `deploy_system.sh`
```sh
mkdir -p src/lib/server src/lib/client src/components/terminal ...
```
`src/components/` doesn't exist in this repo — components live in `src/lib/components/`. The script
is a `mkdir` list with a success message; it maps no files, as its own comment concedes.

**Port:** `tools/verify.sh` — the pre-flight gate the transcript kept asking for and never wrote:
`tsc` on the worker tree, `svelte-check`, a `wrangler deploy --dry-run` per service, and a
migration-order check. Plus `tools/d1-backup.sh`. Paths derived from what's actually on disk.

### `app.css`
Ships `--bg-primary`/`--text-primary`/`--accent` plus a raw `body { background-color: ... }` block,
in five palettes, addressed to `[data-theme="…"]`.

The repo has a real token system (`src/lib/data/themes.ts` → per-theme display/heading/body fonts,
radii, textures, `color-scheme`) that #50 built deliberately. Overwriting `body` from a stylesheet
fights it, drops the per-theme fonts, and reintroduces the exact "soft minimalist theme picker"
that #44/#45 removed on purpose.

**Port:** none. The one genuinely good idea — a higher-contrast variant — already exists as
`paper`. Recorded here as a considered reject.

### `wrangler.toml`
```toml
[site]
bucket = ".svelte-kit/cloudflare"

[[unsafe.metadata.rate_limiting]]
id = "api_intake_throttle"
characteristics = ["ip.src"]
period = 60
limit = 30
action = { mode = "simulate", timeout = 86400 }
```
`[site]` is legacy Pages config. `[[unsafe.metadata.rate_limiting]]` is not a wrangler key at all —
`wrangler deploy` fails config-schema validation on it, and the "action.mode = simulate" shape is
invented. The transcript even surfaced a GitHub issue titled *"BUG: config-schema.json rejects…"*
as a search result and kept going.

Real rate limiting in this repo: `workers/shared/rate-limit.ts` (sliding window, per-isolate,
`CF-Connecting-IP` with an `X-Forwarded-For` fallback) with documented per-route budgets —
gateway 120/min, health + components 60/min, viper analyze 10/min, booking 5/10min, ask 5/day.

**Port:** none. The honest documentation of the limit is the budget table, which lives in the
source.

### `Terminal.svelte` / `HeroCanvas.svelte` / `SimulationLab.svelte`
Svelte 4. `export let data`, `on:keydown={…}`, `createEventDispatcher`, `<window on:resize={…} />`,
inline `style=""` on every element, emoji in `typewriter` transitions. `HeroCanvas` opens
`ws://localhost:8080` — a plaintext WebSocket to a hardcoded port, from a production page, which
every CSP in `_headers` blocks by design. `SimulationLab` is a `setInterval` that increments a
number by 2 every 30ms toward 94 and prints *"High volatility configuration surfaces detected"* —
a fake audit with a fake progress bar, which is the exact thing `audit.ts` refuses to be.

**Port:**
- `Terminal.svelte` — gains a real `audit <domain>` command that POSTs to the live endpoint and
  prints the actual findings. Already Svelte 5 runes; already has `theme`, `help`, page shortcuts.
- `HeroCanvas.svelte` — the particle-hue-by-CPU idea retargeted from a fake number to a **measured**
  one: real gateway latency from `/health`, polled. Same visual, honest input.
- `SimulationLab.svelte` → `AuditConsole.svelte`. Real input, real request, real findings, real
  latency. No particles, no ticker, no invented score.

### Not on disk, still in the transcript
`alertSystem.ts` (already `pwn4g3-notify`, and better — Ed25519-verified Discord, Reddit OAuth
script-flow, Signal bridge), `hooks_server.ts` (geolocation hook — privacy problem, see
`schema.prisma`), `geoLogger.ts` / `purgeLogs.ts` (retention already exists in
`workers/scheduler/src/index.ts:125`), `endpoint.test.ts` (no test framework existed), `sysmon.sh` +
`telemetry_server.js` (bash + Node WebSocket server — a fundamentally different architecture from
edge workers; the *idea*, live system telemetry, is served by the real
`telemetry_events` + `/stats` + `/status` pages), `test_concurrency.js` (k6 pointed at a route that
doesn't exist), `fxEngine.ts` (`triggerDetonationBurst` — 150 sparks on button press; rejected with
`SimulationLab`).

---

## What shipped, and what it cost

| Idea from the log | Where it lives now | New? |
|---|---|---|
| Public domain audit → lead capture | `workers/audit/` · `POST /api/audit` · `0011_audit_runs.sql` | yes |
| "Hive" aggregate of all audits | `GET /api/audit/summary` | yes |
| Honest findings UI on `/lab` | `src/lib/components/AuditConsole.svelte` | yes |
| Terminal-driven audit | `Terminal.svelte` → `audit <domain>` | yes |
| Lead/telemetry export | `GET /admin/api/export` (json + csv) | yes |
| Retry/timeout/redirect discipline | `workers/shared/http.ts` | yes |
| Incident alerting | scheduler → `pwn4g3-notify` | wiring |
| Retention prune | scheduler `runRollups` (extended) | extended |
| DB backup | scheduler weekly + `tools/d1-backup.sh` | yes |
| Pre-flight deploy gate | `tools/verify.sh` | yes |
| Load profile | `tools/load/k6-audit.js` | yes |
| Unit tests | `tools/test/shared.test.mjs` (`node:test`, zero deps) | yes |
| Privacy-safe geo rollup | country/region daily aggregate, no IP | yes |

**Cost:** 0 new npm dependencies, 0 new paid services, 0 new cron triggers (reuses the weekly one),
1 new worker, 1 new D1 migration, 1 new gateway binding. Still inside the free-tier budget in
Round 2 of `TASKS.md`.

**The one-line version:** the log was a plausible-sounding architecture for a different platform,
and its most confident numbers were the ones with no measurement behind them. Every one of those is
now a real observation, and the features that were actually worth having — the public audit funnel,
the export, the backup — are the ones that survived contact with the existing code.
