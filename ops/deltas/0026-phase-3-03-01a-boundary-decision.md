# Batch 26 - Phase 3 03-01A Boundary Decision

## Goal

Prepare Phase 3 slice `03-01A` as a design-only security and persistence boundary decision. Do not implement auth, RBAC, tenanting, audit, database, schema files, repositories, runtime handlers, or OpenAPI changes.

## Files Inspected

- `AGENTS.md`
- `README.md`
- `api/openapi.yaml`
- `package.json`
- `.planning/HANDOFF.json`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/.continue-here.md`
- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`
- `ops/memory/product.md`
- latest `ops/deltas/`
- `INTEL.md` (read only; left untracked and unstaged)

## Files Changed In 03-01A

- `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md` (new)
- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md` (consistency update after 03-01A exists)
- `.planning/HANDOFF.json`
- `.planning/STATE.md`
- `.planning/.continue-here.md`
- `ops/memory/product.md`
- `ops/deltas/0025-phase-3-security-persistence-kickoff-plan.md` (follow-up note)
- `ops/deltas/0026-phase-3-03-01a-boundary-decision.md` (new, this file)

Pre-existing uncommitted planning/docs files from the Phase 3 kickoff batch remain present and were not staged or reverted.

## Design Decision

`03-01A` chooses a provider-neutral Phase 3 boundary model:

- Tenant identity is server-derived from trusted auth/session and membership state, never from request bodies, query strings, route parameters, or arbitrary headers.
- Authentication is a request-boundary concern before any future production traceability action.
- RBAC is deny-by-default and action-oriented for read, write, review, supplier request, mock recall, export, and tenant administration actions.
- Persistence is service-owned and tenant-scoped; future route handlers should not directly construct database queries or pass client-supplied tenant IDs as authority.
- Mutating writes pair idempotency enforcement with append-only audit evidence.
- Audit evidence supplements, but does not replace, source-document references.

The note does not select a provider, create schema, add middleware, change route behavior, or implement storage.

## Truth-Surface Updates

- `.planning/HANDOFF.json`: bumped to `1.4`, added the `03-01A` design note path, summarized the decision, and kept implementation blocked pending approval.
- `.planning/STATE.md`: updated current focus, planning artifact pointer, recent decision, and next step.
- `.planning/.continue-here.md`: updated resume status, reading order, and next action around the `03-01A` design note.
- `ops/memory/product.md`: added one short domain line recording that `03-01A` is provider-neutral and implementation has not started.
- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`: changed the proposed `03-01A` wording into a status pointer to the completed design note and kept the next code-bearing slice approval-gated.
- `ops/deltas/0025-phase-3-security-persistence-kickoff-plan.md`: added a follow-up note that `03-01A` is now documented in Batch 26.

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
- auth, RBAC, tenanting, audit, database, schema, repository, persistence, route-handler, import, export, or CSV generation code

`git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json app lib tests .github` returned no output before this delta was added.

## Verification Commands And Results

- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml` and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js 16.2.6 production build completed and listed the existing MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`

## Rollback Path

Revert only:

- `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md`
- `.planning/HANDOFF.json`
- `.planning/STATE.md`
- `.planning/.continue-here.md`
- `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`
- `ops/memory/product.md`
- `ops/deltas/0025-phase-3-security-persistence-kickoff-plan.md`
- `ops/deltas/0026-phase-3-03-01a-boundary-decision.md`

This removes the `03-01A` design decision and pointers without touching OpenAPI, generated types, runtime, package/dependency files, CI workflows, or any implementation surface.

## Next Smallest Implementation Candidate

Only after Matt explicitly approves a code-bearing batch, the next smallest candidate is a boundary skeleton that proves request context, authorization policy shape, idempotency/audit interfaces, and persistence ownership without wiring existing routes to production storage or changing fixture-only MockRecall runtime behavior.

The candidate must name exact allowed files and state whether package/schema files are in scope before any implementation starts.
