# Batch 15 - MockRecall CSV Contract Smoke Hardening

## Goal

Resolve the only repo-evidenced dirty change by confirming that the MockRecall packet CSV smoke test asserts the exact current contract fixture output.

## Files Changed

- `tests/mock-recall-contract-smoke.mjs`
- `ops/deltas/0015-mock-recall-csv-contract-smoke-hardening.md`

## Contract/runtime impact

- No API contract, generated types, runtime route, package script, CI, dependency, auth, tenanting, database, UI, connector, or production export behavior changed.
- The existing smoke check now asserts the packet CSV body exactly, including the OpenAPI fixture header, fixture row, and CRLF-terminated trailing blank line.
- The expected CSV values are derived from `api/openapi.yaml` and `lib/api/mock-recall.ts`.
- Missing-resource Problem Details checks and conservative readiness language guards remain in place.

## Verification commands and results

- `git status --short` - PASS. Only `tests/mock-recall-contract-smoke.mjs` was dirty before this delta report was added.
- `git branch --show-current` - PASS. Current branch was `main`.
- `git rev-parse --short HEAD` - PASS. Starting HEAD was `8f646d7`.
- `git log -1 --oneline` - PASS. Starting commit was `8f646d7 Merge pull request #1 from mmtuentertainment/codex/fsma204/ci-contract-gate`.
- `node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"` - PASS. Existing scripts include `api:check`, `typecheck`, `build`, and `test:mock-recall:contract`; no plain `test` or `verify` script exists.
- `Get-ChildItem -LiteralPath 'ops\\deltas' -File | Sort-Object Name | ForEach-Object { $_.FullName }` - PASS. `0015` was the next available delta number.
- `git diff -- tests/mock-recall-contract-smoke.mjs` - PASS. Reviewed the test-only hardening diff.
- `git diff --check -- tests/mock-recall-contract-smoke.mjs` - PASS.
- `npm run api:check` - PASS. OpenAPI lint and generated type freshness checks passed.
- `npm run typecheck` - PASS.
- `npm run build` - PASS. Next.js production build completed and listed the MockRecall detail and packet routes.
- `npm run test:mock-recall:contract` - PASS. MockRecall contract smoke check passed.

## Rollback path

Revert only:

- `tests/mock-recall-contract-smoke.mjs`
- `ops/deltas/0015-mock-recall-csv-contract-smoke-hardening.md`

This rollback removes the stricter smoke assertion and its delta report without touching the API contract, runtime fixture, generated types, package scripts, CI, or product behavior.

## Next smallest useful batch

Add no new MockRecall behavior until the next batch has a fresh, explicit scope. The smallest useful follow-up would be a read-only contract drift audit comparing the OpenAPI examples, `lib/api/mock-recall.ts`, and the smoke test constants.
