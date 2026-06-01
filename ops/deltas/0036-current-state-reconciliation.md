# Batch 36 - Current-State Reconciliation After Exception-Review Activation

## Summary

Docs/current-state reconciliation after Batch 34 and Batch 35. This batch updates active truth surfaces so they distinguish:

- the fixture-only `PATCH /api/traceability/exceptions/{exceptionId}` exists;
- production auth, database persistence, production RBAC provider, durable idempotency storage, and persisted audit providers do not exist;
- Phase 3 has started but is not complete;
- Phase 4-8 runtime work remains out of scope without a future approved micro-batch.

Historical deltas remain intact. Older planning packets can still describe earlier decisions as gated because they predate Batch 34; those files are provenance, not current-state docs.

## Files Changed

- `AGENTS.md`
- `app/page.tsx`
- `.planning/STATE.md`
- `.planning/.continue-here.md`
- `.planning/ROADMAP.md`
- `.planning/HANDOFF.json`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/codebase/TESTING.md`
- `ops/memory/product.md`
- `ops/deltas/0036-current-state-reconciliation.md`

`README.md`, `.planning/HANDOFF.json`, `ops/deltas/0033-phase-3-exception-review-patch-activation-approval.md`, `ops/deltas/0034-exception-review-patch-fixture-activation.md`, and `.planning/phase-3-production-provider-selection.md` were read for source-of-truth context and did not need edits in this batch.

`INTEL.md` and `.audit/` remain local-only/untracked and were not staged.

## Contract Impact

None. `api/openapi.yaml` and `lib/api/generated/openapi-types.ts` were not edited.

## Runtime Impact

None. The only `app/` change is status-page copy in `app/page.tsx`; no `app/api` or `lib` runtime logic changed.

## Package / CI Impact

None. `package.json`, `package-lock.json`, and `.github/` were not edited. This batch deliberately does not wire the exception-review PATCH focused test into package scripts or CI.

## Verification Plan

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `git diff --exit-code -- app/api lib tests api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json .github`

## Rollback Path

Revert only the files listed in "Files Changed" for this batch. No runtime API route, library logic, OpenAPI contract, generated type, package, lockfile, or CI rollback is needed.

## Next Smallest Follow-Up

After review, a separate approved batch can decide whether to wire the existing exception-review PATCH focused test into package scripts/CI as-is or first replace the experimental Node type-stripping command with a stable test strategy.
