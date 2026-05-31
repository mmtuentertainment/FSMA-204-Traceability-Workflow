# Batch 25 - Phase 3 Security And Persistence Kickoff Plan

## Goal

Create a planning-only kickoff plan for Phase 3 Security And Persistence Foundation. Do not start Phase 3 implementation.

## Files Inspected

- `git status --short`
- `git rev-parse --abbrev-ref HEAD`
- `git rev-parse HEAD`
- `AGENTS.md`
- `README.md`
- `package.json`
- `api/openapi.yaml`
- `.github/workflows/contract-gate.yml`
- `ops/deltas/`
- `ops/memory/product.md`
- `.planning/`
- `INTEL.md` (read only; left untracked and unstaged)

## Files Changed

- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md` (new)
- `.planning/.continue-here.md`
- `.planning/HANDOFF.json`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `README.md`
- `ops/memory/product.md`
- `ops/deltas/0025-phase-3-security-persistence-kickoff-plan.md` (new, this file)

## Content Summary

The new kickoff plan defines:

- Phase 3 goal: establish approved security and persistence foundations before production-like traceability data workflows.
- Non-goals: no compliance certification, legal advice, FDA endorsement, automated exemption determination, Phase 4-8 feature work, runtime behavior change, OpenAPI change, generated type edit, dependency change, or database/auth/RBAC/audit/persistence code in this kickoff batch.
- Approval gate: Phase 3 implementation cannot begin until Matt approves a concrete micro-batch with exact file scope, allowed protected-path changes, selected persistence/auth direction, validation commands, and rollback path.
- Security and persistence invariants: OpenAPI-first discipline, server-derived tenant context, deny-by-default RBAC, cross-tenant non-leakage, idempotency keys for mutating writes, append-only audit evidence, source-document references as metadata, Problem Details for API errors, and readiness-only export language.
- Acceptance criteria and validation gates for this kickoff and future Phase 3 implementation batches.
- Proposed first approved slice: `03-01A: security and persistence boundary decision`, with a design/provider decision before any database/auth/RBAC/audit code. If Matt chooses a code-bearing first slice, it should be only a provider-approved schema or boundary skeleton and should not wire routes to persistence.

## Truth-Surface Updates

- `README.md`: added a short current-state pointer to the Phase 3 kickoff plan and approval requirement.
- `ops/memory/product.md`: recorded that Phase 1 and Phase 2 are complete, Phase 3 kickoff planning exists, and implementation remains approval-gated.
- `.planning/STATE.md`: advanced current focus to Phase 3 kickoff planning and added the kickoff path.
- `.planning/ROADMAP.md`: added a Phase 3 kickoff note without marking any Phase 3 plan done.
- `.planning/HANDOFF.json`: advanced handoff status to Phase 3 kickoff pending approval and added the kickoff path.
- `.planning/.continue-here.md`: updated resume instructions to point at Phase 3 review/approval, not Phase 1 continuation.

## Contract And Runtime Impact

None.

This batch did not modify:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `app/`
- `lib/`
- `tests/`
- `.github/`
- `package.json`
- `package-lock.json`
- dependencies
- database/auth/RBAC/audit/persistence code

`git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json app lib tests .github` returned no output.

## Verification Commands And Results

- `git status --short` - PASS; showed only planning/docs/memory edits, the new Phase 3 kickoff directory, this delta after creation, and untracked local-only `INTEL.md`.
- `git rev-parse --abbrev-ref HEAD` - PASS; `main`.
- `git rev-parse HEAD` - PASS; `30e03014e664ae4307dd661430cd3af287be8a2e`.
- `git diff --stat` - PASS; tracked diff stayed in `.planning`, `README.md`, and `ops/memory/product.md`. New untracked files are visible in `git status --short`, not the unstaged `git diff --stat` output.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js 16.2.6 production build completed and listed the existing MockRecall routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`

## Rollback Path

Revert only:

- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`
- `.planning/.continue-here.md`
- `.planning/HANDOFF.json`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `README.md`
- `ops/memory/product.md`
- `ops/deltas/0025-phase-3-security-persistence-kickoff-plan.md`

This removes the Phase 3 kickoff planning packet and pointers without touching OpenAPI, runtime, generated types, package files, tests, CI workflows, dependencies, database/auth/RBAC/audit/persistence code, or local-only `INTEL.md`.

## Next Smallest Useful Micro-Batch

At the time of this kickoff batch, the next smallest useful micro-batch was `03-01A: security and persistence boundary decision`.

Follow-up: `03-01A` is now documented in `ops/deltas/0026-phase-3-03-01a-boundary-decision.md` and `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md`. Current implementation remains not started; preserve this planning packet before any code-bearing Phase 3 slice.
