# Batch 19 - MockRecall Contract Smoke Diagnostics

## Goal

Improve failure diagnostics in the existing MockRecall contract smoke script without changing runtime behavior, OpenAPI contract content, generated types, workflow files, dependencies, package scripts, or broad documentation.

## Files changed

- `tests/mock-recall-contract-smoke.mjs`
- `ops/deltas/0019-mock-recall-smoke-diagnostics.md`

## Summary

The smoke script now includes response context in assertion failures: request URL, HTTP status, content type, and a truncated response body. JSON parse failures now report the same response context, and server-start failures now include the probe URL, last probe error, and captured Next.js server output.

The contract assertions remain the same: the fixture detail route must return the readiness-review JSON payload, the fixture packet route must return the exact FDA-style sortable CSV fixture, and missing detail/packet routes must return RFC 9457 Problem Details.

## Scope boundaries

- No runtime route handlers changed.
- No OpenAPI contract or generated OpenAPI types changed.
- No package, dependency, lockfile, workflow, authentication, tenanting, database, UI, import, export, or production workflow behavior changed.
- No broad docs were changed beyond this batch delta.

## Verification

- `Get-Location` - PASS; repo path was `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- `git status --short --branch` before this batch - PASS; `main...origin/main` was clean after the accepted checkpoint was pushed and remote CI passed.
- `git remote -v` - PASS; `origin` points to `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- `node -v` - PASS; `v22.12.0`.
- `npm -v` - PASS; `10.9.0`.
- Remote GitHub Actions `Contract Gate` for pushed head `a7ea8091b9690f6be631f793d9f6ec2e3cc688be` - PASS.
- `git diff --check -- tests/mock-recall-contract-smoke.mjs` - PASS.
- `node --check .\tests\mock-recall-contract-smoke.mjs` - PASS.
- `npm ci` - PASS; installed 228 packages and reported 2 moderate audit advisories. No audit repair was run.
- `npm run api:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS; build listed `/`, `/_not-found`, and both MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; MockRecall contract smoke check passed.
- Out-of-scope diff check - PASS; changed files are limited to `tests/mock-recall-contract-smoke.mjs` and this delta report.

## Rollback path

Revert only:

- `tests/mock-recall-contract-smoke.mjs`
- `ops/deltas/0019-mock-recall-smoke-diagnostics.md`

This removes the diagnostics-only smoke-test enhancement without touching runtime routes, OpenAPI, generated types, package files, dependencies, workflow files, or product behavior.
