# Roadmap: FSMA 204 Workflow Product

## Overview

The roadmap starts from the existing scaffold, OpenAPI contract, generated types, CI contract gate, committed MockRecall contract smoke check, reviewed MockRecall examples, and mock-recall Problem Details handlers. It moves forward in small, reviewable phases: first keeping contract truth surfaces synchronized, then adding runtime behavior, persistence/security foundations, traceability workflow slices, supplier KDE tracking, mock recall readiness summaries, and FDA-style sortable CSV export. Each phase must preserve conservative FSMA language and explicit human review.

## Phases

**Phase Numbering:**

- Integer phases are planned milestone work.
- Decimal phases are urgent insertions and must be marked `INSERTED`.
- Completed pre-GSD batches remain documented in `ops/deltas/` and are not renumbered into this roadmap.

- [done] **Phase 1: Contract Gate And Examples** - Existing contract gate and reviewed MockRecall examples are documented, with truth surfaces reconciled.
- [ ] **Phase 2: Problem Details Test Harness** - Protect current API error behavior with tests or equivalent verification.
- [ ] **Phase 3: Security And Persistence Foundation** - Introduce tenant/auth/RBAC/audit/idempotency foundations before production data.
- [ ] **Phase 4: Traceability Lot And Event Records** - Add lot and CTE record workflow slices.
- [ ] **Phase 5: Human Review Exceptions** - Add reviewable exceptions and status updates.
- [ ] **Phase 6: Supplier KDE Requests** - Add supplier KDE request tracking.
- [ ] **Phase 7: Mock Recall Readiness Summary** - Add mock recall summary behavior over approved data.
- [ ] **Phase 8: FDA-Style CSV Packet Export** - Add bounded readiness export without certification claims.

## Phase Details

### Phase 1: Contract Gate And Examples

**Goal**: Maintainers can validate the API contract repeatably and rely on reviewed `MockRecallDetail`/packet examples before runtime expansion.
**Mode:** mvp
**Depends on**: Existing baseline.
**Requirements**: GOV-01, GOV-02, GOV-03
**Success Criteria** (what must be TRUE):
  1. Maintainer can run one documented command for OpenAPI lint and generated-type freshness.
  2. Contract examples for `MockRecallDetail` and CSV packet behavior validate against `api/openapi.yaml`.
  3. README, product memory, and delta report distinguish contract scope from runtime behavior.
  4. No database, auth, route success behavior, imports, exports, or UI expansion is added in this phase.
**Plans**: 3 plans

Plans:
- [done] 01-01: Add and review contract examples for mock recall detail and packet states.
- [done] 01-02: Add repeatable contract gate script or CI workflow.
- [done] 01-03: Sync truth surfaces and delta evidence.

### Phase 2: Problem Details Test Harness

**Goal**: The existing not-found Problem Details behavior is protected by committed verification.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: RUN-01
**Success Criteria** (what must be TRUE):
  1. Missing mock recall detail requests return `application/problem+json`.
  2. Missing packet CSV requests return `application/problem+json`, not `text/csv`.
  3. Response bodies include `type`, `title`, `status`, `detail`, and `instance`.
  4. Verification can run without secrets, database, or external services.
**Plans**: 2 plans

Plans:
- [done] 02-01: Add the smallest route verification approach for the current MockRecall contract fixture and not-found behavior.
- [ ] 02-02: Document verification scope and skipped runtime expansion.

### Phase 3: Security And Persistence Foundation

**Goal**: Production data work has a foundation for auth, server-derived tenant context, RBAC, idempotency, and append-only auditability.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Authenticated requests resolve tenant context on the server.
  2. RBAC checks are explicit for read and write paths.
  3. Mutating writes accept and enforce idempotency keys.
  4. Audit evidence is append-only for mutating actions and review decisions.
  5. No client-supplied tenant ID is trusted as authority.
**Plans**: 4 plans

Plans:
- [ ] 03-01: Design persistence and tenant model.
- [ ] 03-02: Add auth and RBAC foundation.
- [ ] 03-03: Add idempotency and append-only audit foundation.
- [ ] 03-04: Verify security and artifact hygiene.

### Phase 4: Traceability Lot And Event Records

**Goal**: Reviewers can create and inspect the core lot and event records needed for mock recall readiness.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: TRC-01, TRC-02
**Success Criteria** (what must be TRUE):
  1. Reviewer can record a traceability lot with TLC, normalized TLC, item description, status, source document reference, and human-review flag.
  2. Reviewer can record receiving, transformation, and shipping events.
  3. Event records can link related lots.
  4. Source document references remain metadata references; file upload stays out of scope.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Add lot record workflow.
- [ ] 04-02: Add receiving/transformation/shipping event workflow.
- [ ] 04-03: Verify traceability record contract, runtime, and audit behavior.

### Phase 5: Human Review Exceptions

**Goal**: The workflow surfaces KDE gaps and ambiguity as reviewable exceptions rather than automated legal determinations.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: REV-01, REV-02
**Success Criteria** (what must be TRUE):
  1. Reviewer can see exceptions for missing KDEs, ambiguous lot codes, mismatches, supplier gaps, and linkage gaps.
  2. Reviewer can update exception status, reason, notes, and human-review flag.
  3. Ambiguous exemption, imported-food, kill-step, and partial-exemption cases remain human-review-required.
  4. Exception updates write audit evidence.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Add exception records and listing.
- [ ] 05-02: Add exception status/review updates.
- [ ] 05-03: Verify human-review guardrails and audit evidence.

### Phase 6: Supplier KDE Requests

**Goal**: Reviewers can track supplier KDE requests that block mock recall readiness.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: SUP-01
**Success Criteria** (what must be TRUE):
  1. Reviewer can create a supplier KDE request with supplier reference, requested KDEs, and due date.
  2. Reviewer can update request status and source document reference.
  3. Supplier gaps can appear in readiness summaries.
  4. No supplier-facing portal is added.
**Plans**: 2 plans

Plans:
- [ ] 06-01: Add supplier request creation and status tracking.
- [ ] 06-02: Verify supplier gaps flow into review state.

### Phase 7: Mock Recall Readiness Summary

**Goal**: Reviewers can inspect a mock recall readiness summary over approved traceability records.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: RUN-02, TRC-03
**Success Criteria** (what must be TRUE):
  1. Reviewer can retrieve a successful `MockRecallDetail` response for an approved scope.
  2. Summary includes affected lot count, affected shipment count, open exception count, supplier request count, human-review flag, and human-review reasons.
  3. The response does not claim compliance certification or legal determination.
  4. Missing resources still return Problem Details.
**Plans**: 3 plans

Plans:
- [ ] 07-01: Add mock recall detail runtime aggregation.
- [ ] 07-02: Add readiness summary human-review reasons.
- [ ] 07-03: Verify success and not-found behavior.

### Phase 8: FDA-Style CSV Packet Export

**Goal**: Reviewers can download a bounded FDA-style sortable CSV readiness packet after review requirements are satisfied.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: RUN-03, EXP-01, EXP-02
**Success Criteria** (what must be TRUE):
  1. Reviewer can request packet CSV for a mock recall.
  2. Packet output is sortable CSV and labeled as readiness/export output.
  3. Export is blocked or marked not ready when required human review remains open.
  4. Export wording avoids compliance certification, legal advice, and FDA endorsement.
**Plans**: 3 plans

Plans:
- [ ] 08-01: Add packet readiness checks.
- [ ] 08-02: Add FDA-style sortable CSV generation.
- [ ] 08-03: Verify export behavior and regulatory wording.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Contract Gate And Examples | 3/3 | Complete | 2026-05-30 |
| 2. Problem Details Test Harness | 1/2 | In progress | - |
| 3. Security And Persistence Foundation | 0/4 | Not started | - |
| 4. Traceability Lot And Event Records | 0/3 | Not started | - |
| 5. Human Review Exceptions | 0/3 | Not started | - |
| 6. Supplier KDE Requests | 0/2 | Not started | - |
| 7. Mock Recall Readiness Summary | 0/3 | Not started | - |
| 8. FDA-Style CSV Packet Export | 0/3 | Not started | - |
