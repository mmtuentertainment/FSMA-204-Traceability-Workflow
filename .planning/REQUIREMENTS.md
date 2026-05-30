# Requirements: FSMA 204 Workflow Product

**Defined:** 2026-05-28
**Last updated:** 2026-05-30 after MockRecall example review and truth-surface reconciliation
**Core Value:** A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA approval.

## Brownfield Baseline

Already present before this requirements file:

- [done] **BASE-01**: Maintainer can run a minimal Next.js App Router scaffold.
- [done] **BASE-02**: Maintainer can treat `api/openapi.yaml` as the source of truth for traceability API shape.
- [done] **BASE-03**: Maintainer can generate and check TypeScript types from the OpenAPI contract.
- [done] **BASE-04**: Requester receives Problem Details for missing mock recall detail and packet routes.
- [done] **BASE-05**: Maintainer can inspect batch evidence in `ops/deltas/`.

## v1 Requirements

### Governance

- [done] **GOV-01**: Maintainer can validate OpenAPI lint, generated-type freshness, TypeScript, build, and MockRecall smoke checks through the existing repeatable gate.
- [done] **GOV-02**: Maintainer has reviewed OpenAPI examples for `MockRecallDetail`, packet CSV, and missing-resource Problem Details without changing runtime code.
- [done] **GOV-03**: Maintainer can keep README, product memory, handoff state, and delta reports synchronized with the real repo state.

### Runtime API

- [ ] **RUN-01**: Requester receives RFC 9457-style Problem Details for missing or unsupported traceability resources.
- [ ] **RUN-02**: Requester can retrieve a successful mock recall detail response for an approved data source or fixture.
- [ ] **RUN-03**: Requester can request a mock recall packet CSV and receive either a readiness-aware not-ready response or a generated FDA-style sortable CSV packet.

### Traceability Records

- [ ] **TRC-01**: Reviewer can record a traceability lot with TLC, normalized TLC, item description, status, source document reference, and human-review flag.
- [ ] **TRC-02**: Reviewer can record receiving, transformation, and shipping events with linked lots, timestamps, locations, counterparties, and source document references.
- [ ] **TRC-03**: Reviewer can see affected lot and shipment counts for a mock recall scope.

### Human Review

- [ ] **REV-01**: Reviewer can see exceptions for missing KDEs, ambiguous lot codes, document mismatches, supplier document gaps, shipping linkage gaps, and human-review-required cases.
- [ ] **REV-02**: Reviewer can update exception status, review reason, notes, and human-review flag with auditability.

### Supplier KDE Requests

- [ ] **SUP-01**: Reviewer can create and track supplier KDE requests with requested KDEs, due dates, source document references, and request status.

### Security And Audit

- [ ] **SEC-01**: Authenticated user actions use server-derived tenant context rather than client-supplied tenant IDs.
- [ ] **SEC-02**: RBAC gates read and write actions before production data is exposed.
- [ ] **SEC-03**: Mutating writes use idempotency keys and append audit evidence.

### Export

- [ ] **EXP-01**: Reviewer can download a FDA-style sortable CSV packet after readiness checks and required human review.
- [ ] **EXP-02**: Export surfaces clearly state readiness/export status without claiming compliance certification, legal advice, or FDA endorsement.

## v2 Requirements

Deferred to future milestones:

- **V2-01**: Import traceability records from external files.
- **V2-02**: Supplier-facing portal for KDE response collection.
- **V2-03**: OCR or document extraction.
- **V2-04**: ERP integration.
- **V2-05**: Mobile scanning workflow.
- **V2-06**: Operational dashboards and analytics.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Compliance certification | Product posture is readiness workflow only. |
| Legal advice | Ambiguous regulatory questions require human review. |
| FDA endorsement | The app may produce FDA-style exports but cannot imply FDA approval. |
| Automated exemption determination | Exemption, imported-food, kill-step, and partial-exemption ambiguity must route to human review. |
| ERP replacement | The project is a workflow layer, not a system of record for all operations. |
| Supplier portal | Deferred until internal readiness workflow is useful. |
| OCR/document ingestion | Deferred to avoid scope and accuracy risk. |
| Blockchain traceability | Not needed for the MVP wedge. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BASE-01 | Existing baseline | Complete |
| BASE-02 | Existing baseline | Complete |
| BASE-03 | Existing baseline | Complete |
| BASE-04 | Existing baseline | Complete |
| BASE-05 | Existing baseline | Complete |
| GOV-01 | Phase 1 | Complete |
| GOV-02 | Phase 1 | Complete |
| GOV-03 | Phase 1 | Complete |
| RUN-01 | Phase 2 | Pending |
| RUN-02 | Phase 3 | Pending |
| RUN-03 | Phase 8 | Pending |
| TRC-01 | Phase 4 | Pending |
| TRC-02 | Phase 4 | Pending |
| TRC-03 | Phase 7 | Pending |
| REV-01 | Phase 5 | Pending |
| REV-02 | Phase 5 | Pending |
| SUP-01 | Phase 6 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 3 | Pending |
| EXP-01 | Phase 8 | Pending |
| EXP-02 | Phase 8 | Pending |

**Coverage:**

- Brownfield baseline requirements: 5 total, 5 complete.
- v1 requirements: 17 total, 3 complete, 14 pending.
- Mapped to phases: 17.
- Unmapped: 0.

---
*Requirements defined: 2026-05-28*
*Last updated: 2026-05-30 after MockRecall example review and truth-surface reconciliation*
