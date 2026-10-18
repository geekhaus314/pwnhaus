# Decisions

## 2026-10-18 — Run the test suite in CI
**What:** Added a `Test` step to `.github/workflows/deploy.yml` running `npm run test`, and pinned `--experimental-strip-types` in the `test` script in `package.json`.
**Why:** A 31-test suite existed (ip-gate, local-import, themes) but never ran in the pipeline, so the gate on production deploys was types only. Tests run before `Build`, so a failure blocks deploy rather than shipping it.
**Watch:** The flag is a no-op on Node >=23.6 where stripping is on by default, and required on Node 22. CI uses `node-version: 22`, which floats — the explicit flag makes the script work on both instead of relying on which 22.x resolves. Delete it once `engines.node` requires >=23.6.

## 2026-10-18 — Pass test paths as a shell glob, not a directory
**What:** `npm run test` is now `node --experimental-strip-types --test tools/test/*.test.*` (was `... --test tools/test/`).
**Why:** The first CI run failed. Node 26 accepted a bare directory as a test path; the CI runner's Node 22.23.3 did not — it fell through to the CJS module loader and died with `Cannot find module '.../tools/test'`. Leaving the glob unquoted lets the shell expand it, so Node receives explicit file paths and never has to interpret the argument. This removes the version dependency entirely rather than guessing which Node supports which form.
**Watch:** A new test file must match `tools/test/*.test.*` to be picked up. A `.ts` test named `foo_spec.ts` would be silently skipped — there is no "test file count" assertion to catch it.
