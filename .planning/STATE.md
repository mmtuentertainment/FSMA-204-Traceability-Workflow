# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-28)

**Core value:** A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA approval.
**Current focus:** Phase 3 - 03-01A security/persistence boundary decision; design only, implementation pending explicit approval.

## Current Repository State

- Repo path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- Branch at initialization: `main`.
- Remote: `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- OpenAPI source of truth: `api/openapi.yaml`.
- Generated types: `lib/api/generated/openapi-types.ts`.
- Runtime implemented today: mock recall detail and packet routes expose one contract fixture for smoke checks and return not-found Problem Details for missing resources.
- MockRecall OpenAPI examples have been reviewed against the fixture and missing-resource behavior; no OpenAPI repair or runtime change was needed.
- Current absences: database, auth, tenant model, RBAC, audit log, persisted traceability records, imports, exports, storage-backed mock recall payloads, production CSV generation, and production workflow logic.

## Planning Artifacts

- Project context: `.planning/PROJECT.md`.
- Config: `.planning/config.json`.
- Research: `.planning/research/`.
- Codebase map: `.planning/codebase/`.
- Requirements: `.planning/REQUIREMENTS.md`.
- Roadmap: `.planning/ROADMAP.md`.
- Repo instructions: `AGENTS.md`.
- Phase 1 closeout: `.planning/phases/FSMA-01-contract-gate-and-examples/CLOSEOUT.md`.
- Phase 2 verification scope: `.planning/phases/FSMA-02-problem-details-test-harness/VERIFICATION-SCOPE.md`.
- Phase 3 kickoff plan: `.planning/phases/FSMA-03-security-and-persistence-foundation/KICKOFF.md`.
- Phase 3 03-01A boundary decision: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-01A-boundary-decision.md`.

## Recent Decisions

- Keep FSMA language conservative: readiness workflow, human review, and FDA-style sortable export only.
- Keep OpenAPI first and generated types checked.
- The CI contract gate and committed MockRecall contract smoke check already exist; future batches should use them as the baseline rather than duplicate them.
- The MockRecall example review is complete; future work should not reopen it unless new drift is verified.
- Keep future work in small approved batches with `ops/deltas/` evidence.
- Use GSD `interactive` mode with Codex text-mode and no auto-advance.
- Start with Phase 1 rather than jumping directly into database, auth, CSV, or UI work.
- Phase 2's immediate scope is documenting the existing Problem Details verification (the committed `tests/mock-recall-contract-smoke.mjs` smoke check), not runtime success expansion or persistence. The only success path remains the single static contract fixture.
- Phase 3 kickoff planning defines the approval gate and invariants for security/persistence work; no implementation has started.
- 03-01A chooses a provider-neutral boundary model: server-derived tenant identity, request-boundary auth, deny-by-default RBAC, tenant-scoped persistence, and paired idempotency/audit for future writes.

## Next Step

Review and approve, reject, or revise the 03-01A boundary decision before any security or persistence implementation starts. The next smallest implementation candidate is a tightly scoped boundary skeleton only if Matt explicitly approves a code-bearing batch.

## Guardrails

- Do not claim compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- Do not hand-edit generated OpenAPI types.
- Do not add database, auth, tenant model, RBAC, audit log, imports, exports, CSV generation, UI expansion, or runtime traceability logic without an approved phase/batch.
- Recheck official FDA sources before making date-specific regulatory claims.
- Use Context7 first when a future task asks about library, framework, SDK, API, CLI, or cloud-service docs.
