# Decisions

## 2026-10-18 — Run the test suite in CI
**What:** Added a `Test` step to `.github/workflows/deploy.yml` running `npm run test`, and pinned `--experimental-strip-types` in the `test` script in `package.json`.
**Why:** A 31-test suite existed (ip-gate, local-import, themes) but never ran in the pipeline, so the gate on production deploys was types only. Tests run before `Build`, so a failure blocks deploy rather than shipping it.
**Watch:** The flag is a no-op on Node >=23.6 where stripping is on by default, and required on Node 22. CI uses `node-version: 22`, which floats — the explicit flag makes the script work on both instead of relying on which 22.x resolves. Delete it once `engines.node` requires >=23.6.

## 2026-10-18 — Pass test paths as a shell glob, not a directory
**What:** `npm run test` is now `node --experimental-strip-types --test tools/test/*.test.*` (was `... --test tools/test/`).
**Why:** The first CI run failed. Node 26 accepted a bare directory as a test path; the CI runner's Node 22.23.3 did not — it fell through to the CJS module loader and died with `Cannot find module '.../tools/test'`. Leaving the glob unquoted lets the shell expand it, so Node receives explicit file paths and never has to interpret the argument. This removes the version dependency entirely rather than guessing which Node supports which form.
**Watch:** A new test file must match `tools/test/*.test.*` to be picked up. A `.ts` test named `foo_spec.ts` would be silently skipped — there is no "test file count" assertion to catch it.

## 2026-10-18 — Remove the Vercel mirror, keep a stop-build marker
**What:** Dropped `@sveltejs/adapter-vercel` and the `ADAPTER=vercel` switch in `svelte.config.js`. Reduced `vercel.json` from 36 lines to a single `ignoreCommand: exit 0`. Also replaced the legal name with `Jake M. Viefhaus` in `tools/resume/*.html` and `TASKS.md`.
**Why:** #20 declared the repo Cloudflare-only, then #52 revived a Vercel mirror nine days later "for reach" — and the mirror's stated purpose was serving a resume under the legal name. The dual-target branch pulled a vulnerable adapter into a repo that only ever builds for Cloudflare, and nothing in CI set `ADAPTER`, so the Vercel path was manual-only. Deleting `vercel.json` outright would not stop the builds: the project is still connected, so Vercel would auto-detect SvelteKit and keep failing. The one-line `ignoreCommand` is the actual stop signal; disconnecting the project in the Vercel dashboard is the only thing that fully removes it.
**Watch:** Advisories drop 15 -> 7 (3 low, 4 high). Everything remaining is build/dev-time only — `source-map-js` and `sharp` come from `vite`/`wrangler`, `undici` and `devalue` are already past their fixed versions. None ship in the deploy output. Git history still contains the legal name in commit `1c163e7` and older file versions; scrubbing that needs a history rewrite, not yet done.

## 2026-10-18 — Resume becomes a rendered route, not a hand-maintained PDF
**What:** Added `src/lib/data/resume.ts` as the single source of resume content, rendered by the new prerendered route `src/routes/resume/`. Styled entirely with existing design tokens so all five themes apply. Added a Download PDF button, a Print button, and a copy-email button. Registered the route in the nav and `sitemap.xml`.
**Why:** `static/resume.pdf` was a binary nobody rebuilt, which is how it kept advertising a 3.9 GPA, 50 credits, and "two semesters remaining" after none of that was true, and how seven unverifiable skill claims reached the public site. The same content rendered from one TS module cannot drift silently. Tokens-only styling also keeps the theme drift guard (`npm run test`) passing — hardcoding a palette colour in the page would have failed it.
**Watch:** `tools/resume/resume.html` is now a *second* copy of the same content that the committed PDF is generated from. It can drift from `resume.ts`. Either delete the static PDF and let the Print button be the export path, or write a generator that renders `resume.ts` into the HTML before `weasyprint`. Leaving both means the PDF will slowly go stale again — the exact failure this change fixes.
