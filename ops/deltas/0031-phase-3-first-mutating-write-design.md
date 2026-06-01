# Batch 31 - Phase 3 First Mutating-Write Design

## Summary

Docs-only design / threat-model for the Phase 3 first mutating-write slice, building on the merged boundary skeleton (Batch 29). Adds `03-02-first-mutating-write-design.md`, which commits (as a gated recommendation) to the smallest real write - a human-review decision on one exception (`PATCH /api/traceability/exceptions/{exceptionId}`) - and designs the auth/tenant, RBAC, idempotency, audit, persistence, and error/rate-limit surfaces that the future activation slice would wire. No implementation. Phase 3 implementation remains gated behind explicit Matt approval.

This batch was produced via a 6-section parallel design pass plus an adversarial scope/coherence critic. The critic caught and the synthesis resolved: an inconsistent first-write target across drafts (resolved to the single exception-review write), a contract field error (drafts said `review_status`; the real `ExceptionPatch`/`ExceptionRecord` field is `status` enum `open|in_review|resolved|deferred`), scope creep (provider/schema/interface choices pulled back to gated options + illustrative shapes), and gaps (429/`Retry-After`, await-the-load, the first action literal, audit retention) - all now explicitly owned in the doc.

## Files Inspected

- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`, `03-01A-boundary-decision.md`
- `.planning/HANDOFF.json`, `.planning/STATE.md`, `ops/memory/product.md`
- `ops/deltas/0029-boundary-skeleton.md`, `0030-provider-activation-hardening.md`
- `lib/security/authorization.ts`, `lib/security/idempotency-audit.ts`, `lib/security/request-context.ts`, `lib/api/route-boundary.ts`, `lib/api/mock-recall-source.ts`
- `api/openapi.yaml` (read-only oracle: the exceptions PATCH endpoint, `ExceptionPatch`/`ExceptionRecord` schemas, `Idempotency-Key` parameter, `RateLimited`+`Retry-After`)

## Files Changed In Batch 31

- `.planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md` (new)
- `.planning/HANDOFF.json` (additive pointer + next-step reference; status unchanged)
- `.planning/STATE.md` (additive planning-artifact pointer + next-step reference)
- `ops/deltas/0031-phase-3-first-mutating-write-design.md` (this file)

`INTEL.md` remains untracked scratch and was not added or treated as repo truth.

## Drift Found And Corrected

The originating request assumed "Phase 3 not started; next batch = kickoff planning." That premise was stale: Phase 3 kickoff (`KICKOFF.md` + `03-01A`, deltas 0025/0026) and the 03-01A boundary skeleton (Batch 29, deltas 0027-0029) are already merged on `main`; `HANDOFF.json` is v1.5 with status `phase_3_boundary_skeleton_implemented_pending_further_approval`. This batch therefore designs the actual next step (the first mutating write) instead of duplicating the kickoff or regressing the truth surfaces.

## Phase 4-8 Non-Goal Reconciliation

`KICKOFF.md` fences exceptions (and lots/supplier-KDE/aggregation) into Phase 4-8. The doc recommends the single exception-review write as the foundation-proving first write and records that the activation slice requires Matt to explicitly **lift the Non-Goal for that one minimal resource only** - no broader Phase 4-8 workflow is unfenced.

## Contract Impact

None. `api/openapi.yaml` and `lib/api/generated/openapi-types.ts` were read as oracles only and not modified. The mutating endpoint is already declared; the future activation slice owns a contract-first conformance pass.

## Runtime Impact

None. No `app/` or `lib/` runtime file changed. The two MockRecall read routes are untouched and remain byte-identical.

## Verification Commands And Results

- `git status --short` - only the scoped docs/planning/delta changes plus untracked `INTEL.md`.
- `git diff --check` - clean.
- `git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json app lib tests .github` - empty.
- `npm ci` - PASS.
- `npm run api:check` - PASS (Redocly valid; `openapi-typescript --check`).
- `npm run typecheck` - PASS (`tsc --noEmit`).
- `npm run build` - PASS (Next.js; both MockRecall routes registered).
- `npm run test:mock-recall:contract` - PASS (`MockRecall contract smoke check passed.`).

## Memory / Doc Updates

- `HANDOFF.json`: added `phase_3_03_02_first_mutating_write_design` planning-artifact pointer and referenced it in the next recommended action; phase/status unchanged.
- `STATE.md`: added the design doc to Planning Artifacts and referenced it in Next Step.

## Rollback Path

Delete `03-02-first-mutating-write-design.md` and this delta, and revert the two additive pointer lines in `HANDOFF.json`/`STATE.md`. No runtime, contract, type, package, or dependency surface is touched, so the system returns to the current `main` posture with the full gate green.

## Next Smallest Useful Micro-Batch

If Matt approves the gated decisions in 03-02 (Non-Goal lift + provider/auth/RBAC/idempotency/audit choices), the next batch is the first code-bearing activation slice for the exception-review write - or, if Matt prefers, a narrower follow-up that pins only the persistence + auth provider selection as a design-decision batch before any code.
