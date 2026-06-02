# Batch 32 - Codebase Map Refresh

## Summary

Docs-only refresh of `.planning/codebase/` against `main` at `47b3adb8ba0224e2c30edf112661f77b4d69410c` after PR #9. The map now reflects the merged Phase 3 boundary skeleton, the Batch 31 first mutating-write design, current npm/TypeScript versions, current CI gate, route-boundary seams, testing gaps, and remaining implementation absences.

## Files Inspected

- `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`
- `.github/workflows/contract-gate.yml`
- `api/openapi.yaml`
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- `lib/api/mock-recall.ts`, `lib/api/mock-recall-source.ts`, `lib/api/problem.ts`, `lib/api/route-boundary.ts`
- `lib/security/request-context.ts`, `lib/security/authorization.ts`, `lib/security/idempotency-audit.ts`
- `tests/mock-recall-contract-smoke.mjs`
- `.planning/STATE.md`, `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0027-mock-recall-record-source-of-truth.md`
- `ops/deltas/0028-problem-details-catalog-structure.md`
- `ops/deltas/0029-boundary-skeleton.md`
- `ops/deltas/0030-provider-activation-hardening.md`
- `ops/deltas/0031-phase-3-first-mutating-write-design.md`

## Files Changed

- `.planning/codebase/STACK.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `ops/deltas/0032-codebase-map-refresh.md`

## Notable Corrections

- Updated stale map commit/date metadata from the original May 28 map to `47b3adb` / 2026-06-01.
- Corrected the TypeScript version to `^5.9.3`.
- Replaced the old "no data access abstraction" map language with the current tenant-scoped `MockRecallSource` seam.
- Added the Phase 3 boundary skeleton: request context, authorization policy, route boundary, tenant-scoped source, and idempotency/audit interface shapes.
- Added the Batch 31 first mutating-write design as accepted but still gated.
- Updated testing documentation to include fixture detail 200, fixture CSV 200, missing detail 404, missing packet 404, exact CSV bytes, and disallowed compliance-language checks.
- Flagged remaining truth-surface drift: `README.md` still says Phase 3 implementation has not started, while current source/truth surfaces say the boundary skeleton is implemented and Phase 3 remains incomplete.

## Contract And Runtime Impact

None. This is documentation only.

No changes were made to:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `app/`
- `lib/`
- `tests/`
- `.github/`
- `package.json`
- `package-lock.json`

## Verification Commands And Results

- `npm ci` - PASS on rerun with a wider timeout; installed/audited 229 packages and reported 2 moderate audit findings.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed and listed the two MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts app lib tests package.json package-lock.json .github` - PASS; no protected-path diffs.

## Rollback Path

Revert this delta and the seven `.planning/codebase/*.md` changes. No runtime, contract, generated type, package, dependency, CI, or test file is affected.

## Next Smallest Useful Micro-Batch

If Matt wants a docs-only cleanup before implementation, reconcile the stale README Phase 3 sentence to the current boundary-skeleton posture. Otherwise, the next implementation-adjacent step remains an explicit approval packet for the Batch 31 exception-review PATCH activation slice.
