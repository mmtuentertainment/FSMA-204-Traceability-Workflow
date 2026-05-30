# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-28)

**Core value:** A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA approval.
**Current focus:** Phase 2 - Problem Details Test Harness verification-scope documentation (plan 02-02); documentation only, no runtime expansion.

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

## Recent Decisions

- Keep FSMA language conservative: readiness workflow, human review, and FDA-style sortable export only.
- Keep OpenAPI first and generated types checked.
- The CI contract gate and committed MockRecall contract smoke check already exist; future batches should use them as the baseline rather than duplicate them.
- The MockRecall example review is complete; future work should not reopen it unless new drift is verified.
- Keep future work in small approved batches with `ops/deltas/` evidence.
- Use GSD `interactive` mode with Codex text-mode and no auto-advance.
- Start with Phase 1 rather than jumping directly into database, auth, CSV, or UI work.
- Phase 2's immediate scope is documenting the existing Problem Details verification (the committed `tests/mock-recall-contract-smoke.mjs` smoke check), not runtime success expansion or persistence. The only success path remains the single static contract fixture.

## Next Step

Phase 2 verification scope is documented: the committed MockRecall smoke check protects the missing-resource `404 application/problem+json` behavior (with `type`, `title`, `status`, `detail`, `instance`) and the single static fixture success path. No runtime, persistence, or security work proceeds until an approved Phase 3+ batch; do not duplicate the CI contract gate or smoke harness unless verified drift requires it.

## Guardrails

- Do not claim compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- Do not hand-edit generated OpenAPI types.
- Do not add database, auth, tenant model, RBAC, audit log, imports, exports, CSV generation, UI expansion, or runtime traceability logic without an approved phase/batch.
- Recheck official FDA sources before making date-specific regulatory claims.
- Use Context7 first when a future task asks about library, framework, SDK, API, CLI, or cloud-service docs.
