# Batch 34 - Exception-Review PATCH Fixture Activation

## Summary

Activated the smallest first mutating-write slice for Phase 3: `PATCH /api/traceability/exceptions/{exceptionId}` only. The implementation uses the approved one-write Phase 4-8 Non-Goal lift and keeps the runtime fixture-only:

- local/test bearer-token auth only;
- server-derived fixture tenant identity;
- deny-by-default RBAC with `exception.review.update` allowed only for the same-tenant reviewer role;
- a typed in-memory fixture exception repository;
- required `Idempotency-Key` with replay and fingerprint-conflict behavior;
- append-only in-memory fixture audit events.

No production auth provider, database, ORM, external storage, supplier workflow, lot/event workflow, import/export flow, production CSV behavior, or dependency was added.

## Files Changed

- `app/api/traceability/exceptions/[exceptionId]/route.ts` (new PATCH route)
- `lib/api/exception-review.ts` (new fixture repository, validation, idempotency/audit fixture exports)
- `lib/api/problem.ts` (409/422 Problem helpers and bearer 401 header)
- `lib/security/request-context.ts` (local/test fixture auth resolver and fixture tenant constants)
- `lib/security/authorization.ts` (`exception.review.update` action and fixture reviewer policy)
- `lib/security/idempotency-audit.ts` (scoped idempotency and fixture audit/idempotency stores)
- `tests/exception-review-patch.test.ts` (focused direct route tests)
- `tsconfig.json` (`allowImportingTsExtensions` for the focused direct TypeScript test path)
- `README.md` (current-state update)
- `.planning/HANDOFF.json` (current-state update)
- `ops/memory/product.md` (short product-memory update)
- `ops/deltas/0034-exception-review-patch-fixture-activation.md` (this delta)

Batch 33 files remain present as the accepted approval packet. `INTEL.md` remains local-only and untracked; it was not edited.

## Contract Impact

None. `api/openapi.yaml` already declares the exception-review PATCH with required `Idempotency-Key`, bearer security, `200 ExceptionRecord`, and `401/403/404/409/422/429` Problem Details responses. `lib/api/generated/openapi-types.ts` was read and not hand-edited.

No OpenAPI/runtime mismatch was found.

## Runtime Impact

Adds one new runtime route: `PATCH /api/traceability/exceptions/{exceptionId}`.

The route:

- requires a known fixture bearer token;
- derives tenant and actor from the fixture auth adapter only;
- denies non-reviewer fixture actors with `403`;
- returns leak-safe `404` for cross-tenant fixture misses;
- rejects missing/short idempotency keys and invalid/out-of-contract patch bodies with `422`;
- replays exact duplicate successful requests;
- returns `409` when the same idempotency key is reused with a different fingerprint;
- appends one audit event for accepted transitions only.

Existing MockRecall read routes were not edited.

## Package / CI Impact

No package or dependency changes. No CI changes.

`tsconfig.json` gained `allowImportingTsExtensions` so the focused direct TypeScript route test can import the new route and fixture seams without adding a test runner dependency.

## Focused Tests

Command:

```powershell
node --experimental-strip-types tests\exception-review-patch.test.ts
```

Expected behavior covered:

- missing Authorization returns `401` Problem Details;
- unknown Authorization returns `401` Problem Details;
- same-tenant non-reviewer returns `403` Problem Details;
- cross-tenant reviewer receives leak-safe `404`;
- missing `Idempotency-Key` returns `422` without audit;
- invalid patch body returns `422` without audit;
- client-supplied tenant field is rejected;
- reviewer PATCH updates the fixture exception and appends audit;
- same idempotency key plus same fingerprint replays the stored response;
- same idempotency key plus different fingerprint returns `409`.

Result: PASS. Node emitted its built-in experimental type-stripping warning and a module-type warning for the direct TypeScript test file; no package change was made to silence those warnings.

## Verification Commands And Results

- `npm ci` - PASS; added/audited 229 packages and reported 2 moderate npm audit findings.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed and listed the new exception PATCH route plus the existing MockRecall routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `node --experimental-strip-types tests\exception-review-patch.test.ts` - PASS; all 10 focused checks passed.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git status --short --branch --untracked-files=all` - branch is `main...origin/main [ahead 1]`; tracked changes are the Batch 34 surfaces plus Batch 33 truth-surface updates; untracked files include the accepted Batch 33 packet/delta, new Batch 34 route/repository/test/delta, and local-only `INTEL.md`.
- `git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json .github` - PASS; no contract/generated/package/CI diffs.
- `git diff -- app lib tests README.md ops/memory/product.md .planning/HANDOFF.json ops/deltas tsconfig.json` - reviewed scoped runtime/test/docs/config diff; new untracked files are visible in status and listed above.

## Rollback Path

Delete the new exception-review route, `lib/api/exception-review.ts`, the focused test, and this delta. Revert the additive changes in `lib/api/problem.ts`, `lib/security/request-context.ts`, `lib/security/authorization.ts`, `lib/security/idempotency-audit.ts`, `tsconfig.json`, `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No OpenAPI, generated type, package, dependency, CI, database, or production auth surface needs rollback.

## Next Smallest Micro-Batch

Either harden focused verification/documentation around the fixture-only exception PATCH, or make a separate explicit provider-selection decision for production auth and persistence. Do not broaden into supplier portal, lot/event workflows, import/export behavior, production CSV generation, or database buildout without a new approval.
