# Decisions

## 2026-10-18 — Run the test suite in CI
**What:** Added a `Test` step to `.github/workflows/deploy.yml` running `npm run test`, and pinned `--experimental-strip-types` in the `test` script in `package.json`.
**Why:** A 31-test suite existed (ip-gate, local-import, themes) but never ran in the pipeline, so the gate on production deploys was types only. Tests run before `Build`, so a failure blocks deploy rather than shipping it.
**Watch:** The flag is a no-op on Node >=23.6 where stripping is on by default, and required on Node 22. CI uses `node-version: 22`, which floats — the explicit flag makes the script work on both instead of relying on which 22.x resolves. Delete it once `engines.node` requires >=23.6.
