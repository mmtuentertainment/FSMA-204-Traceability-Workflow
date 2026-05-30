# Phase 1: Contract Gate And Examples - Context

**Gathered:** 2026-05-29T20:08:40-04:00
**Status:** Reviewed examples complete; truth surfaces reconciled

<domain>
## Phase Boundary

Phase 1 is a contract/docs/planning-only reconciliation phase. Its job is to let maintainers trust the current OpenAPI-first scaffold by confirming what is already baseline, recording reviewed MockRecall contract examples, and reconciling GSD truth surfaces with the actual repo state.

GSD has been initialized for this brownfield repo, but Phase 1 had not previously been executed through the machine-tracked phase artifact flow. This context starts that catch-up without rebuilding completed work.

</domain>

<decisions>
## Implementation Decisions

### Done Baseline
- **D-01:** Treat the repeatable CI contract gate as already satisfied baseline. The existing workflow runs `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, and `npm run test:mock-recall:contract` on push and pull request events.
- **D-02:** Treat the MockRecall fixture/not-found smoke verification as already satisfied baseline. The committed smoke check verifies fixture success behavior and missing-resource Problem Details behavior against a production Next server.
- **D-03:** Do not propose rebuilding the CI gate, duplicating the smoke harness, or redoing prior batches as Phase 1 work.

### Remaining Phase 1 Planning Candidate
- **D-04:** Scope any remaining Phase 1 work to truth-surface closeout only; MockRecall contract examples were reviewed in Batch 21.
- **D-05:** Reconcile `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/HANDOFF.json`, `.planning/.continue-here.md`, README/product-memory surfaces, and codebase-map notes against current repo reality.
- **D-06:** Keep active Phase 1 handoff references on the canonical GSD path: `.planning/phases/FSMA-01-contract-gate-and-examples`.
- **D-07:** Batch 21 reviewed concrete `MockRecallDetail`, packet CSV, and 404 Problem Details examples against fixture behavior and found no OpenAPI repair was needed.
- **D-08:** Keep all remaining Phase 1 work contract/docs/planning-only unless Matt explicitly approves otherwise.

### Product And Runtime Boundaries
- **D-09:** Use conservative product language only: readiness workflow, human review, and FDA-style sortable export.
- **D-10:** Do not claim compliance certification, legal advice, automated exemption determination, or FDA endorsement.
- **D-11:** Do not add database, auth, tenanting, RBAC, audit log, imports, exports, production CSV generation, UI expansion, storage-backed mock recalls, or production workflow logic in Phase 1.
- **D-12:** Do not edit generated files by hand, do not edit root `PLAN.md`, do not add dependencies, and do not regenerate API types unless `api/openapi.yaml` changes.

### MockRecall Fixture Truth
- **D-13:** Treat `contract-fixture-ready-for-review` as the one real contract fixture ID. It returns `200` for the detail route and packet CSV route.
- **D-14:** Treat other `mockRecallId` values as missing resources that return RFC 9457-style `404 application/problem+json`.
- **D-15:** The fixture is contract/runtime smoke evidence only. It is not persistence, production CSV generation, or a production mock-recall workflow.

### Claude's Discretion
- Downstream agents may choose the smallest documentation/planning edit set needed to reconcile stale truth surfaces.
- Downstream agents may use existing package scripts and deltas as evidence instead of rerunning full npm gates when only `.planning/` context files change.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### GSD And Project State
- `AGENTS.md` - Repo instructions, Context7 rule, product scope, batch discipline, and future API guardrails.
- `.planning/PROJECT.md` - Product posture, validated baseline, active requirements, exclusions, and key decisions.
- `.planning/REQUIREMENTS.md` - Requirement IDs; Phase 1 maps to `GOV-01`, `GOV-02`, and `GOV-03`.
- `.planning/ROADMAP.md` - Phase definitions, Phase 1 success criteria, and plan status.
- `.planning/STATE.md` - Current project focus and explicit done-baseline language for CI gate and MockRecall smoke check.
- `.planning/HANDOFF.json` - Current handoff snapshot; contains a stale phase directory reference to reconcile.
- `.planning/.continue-here.md` - Resume instructions and critical anti-patterns for Phase 1.
- `.planning/config.json` - GSD configuration; Codex runtime, text mode enabled, auto-advance disabled.

### Contract And Verification Surfaces
- `api/openapi.yaml` - OpenAPI source of truth, including MockRecall detail, packet CSV, and 404 examples.
- `package.json` - Current scripts and Node engine requirement.
- `.github/workflows/contract-gate.yml` - Existing CI contract gate; baseline, not new work.
- `tests/mock-recall-contract-smoke.mjs` - Existing MockRecall fixture/not-found smoke check; baseline, not new work.
- `README.md` - Human-facing setup/current-state truth surface.
- `ops/memory/product.md` - Product memory truth surface; records current fixture and CI posture.

### Evidence Deltas
- `ops/deltas/0011-gsd-project-initialization.md` - Brownfield GSD initialization evidence.
- `ops/deltas/0012-ci-contract-gate.md` - Initial CI contract gate and dependency alignment evidence.
- `ops/deltas/0013-mock-recall-contract-reconciliation.md` - Contract fixture and runtime reconciliation evidence.
- `ops/deltas/0014-mock-recall-contract-smoke-ci.md` - Smoke check package script and CI wiring evidence.
- `ops/deltas/0015-mock-recall-csv-contract-smoke-hardening.md` - Exact CSV fixture smoke assertion evidence.
- `ops/deltas/0016-mock-recall-404-openapi-examples.md` - OpenAPI 404 example evidence.
- `ops/deltas/0017-ci-contract-gate.md` - Later CI gate/truth-surface verification evidence.
- `ops/deltas/0018-agents-current-posture.md` - Repo instruction posture sync evidence.
- `ops/deltas/0019-mock-recall-smoke-diagnostics.md` - Smoke diagnostics evidence.
- `ops/deltas/0020-phase-1-planning-pointer-repair.md` - Phase 1 handoff and continue-here pointer repair evidence.
- `ops/deltas/0021-mock-recall-contract-example-review.md` - MockRecall example review evidence; no OpenAPI repair was needed.
- `ops/deltas/0022-truth-surface-wording-reconciliation.md` - Truth-surface wording reconciliation after the example review.

### Codebase Maps
- `.planning/codebase/STACK.md` - Stack and script map; verify against current `package.json` before relying on dependency versions.
- `.planning/codebase/ARCHITECTURE.md` - Contract-first architecture map; verify against current fixture runtime before relying on older route notes.
- `.planning/codebase/TESTING.md` - Current automated check and smoke-test map.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/openapi.yaml`: contract source of truth for reviewed examples and error shapes.
- `.github/workflows/contract-gate.yml`: existing CI gate; should be referenced as baseline evidence, not recreated.
- `tests/mock-recall-contract-smoke.mjs`: existing executable smoke check for the contract fixture and missing-resource behavior.
- `package.json` scripts: existing local gate sequence for contract lint/freshness, typecheck, build, and MockRecall smoke verification.
- MockRecall fixture runtime: one static fixture backs the current success route checks.

### Established Patterns
- OpenAPI changes precede generated types and runtime behavior.
- Generated OpenAPI types are regenerated by script and never hand-edited.
- API errors use Problem Details with `application/problem+json`.
- Batch evidence belongs in `ops/deltas/`.
- Product language stays conservative and keeps human review explicit.

### Integration Points
- The current GSD phase directory is `.planning/phases/FSMA-01-contract-gate-and-examples`.
- Truth-surface reconciliation should touch planning/docs surfaces only unless Matt approves a broader batch.
- Future contract example review should compare `api/openapi.yaml`, fixture runtime behavior, and smoke-test assertions before planning any edit.

</code_context>

<specifics>
## Specific Ideas

- Use the existing CI contract gate and MockRecall smoke check as proof, not as work to rebuild.
- Batch 21 found current OpenAPI examples and fixture behavior aligned for:
  - `MockRecallDetail` fixture success.
  - packet CSV fixture success.
  - missing detail 404 Problem Details.
  - missing packet 404 Problem Details.
- Reconcile stale GSD path references so downstream GSD commands find Phase 1 artifacts without ambiguity.

</specifics>

<deferred>
## Deferred Ideas

- Database, auth, tenant model, RBAC, audit log, imports, exports, production CSV generation, UI expansion, storage-backed mock recall data, and production workflow logic remain deferred until explicitly approved in later phases.
- Broad test-framework adoption remains deferred; current smoke coverage is a deliberately small executable check.
- FDA date-specific claims require fresh official-source verification before use.

</deferred>

---

*Phase: 1-Contract Gate And Examples*
*Context gathered: 2026-05-29T20:08:40-04:00*
