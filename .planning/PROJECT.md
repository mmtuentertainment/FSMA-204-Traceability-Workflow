# FSMA 204 Workflow Product

## What This Is

FSMA 204 Workflow Product is a lightweight traceability readiness workflow for fresh-cut produce mock recall preparation. It helps teams prepare, review, and export traceability records while keeping human review explicit. It must not claim compliance certification, provide legal advice, imply FDA endorsement, or automate exemption determinations.

## Core Value

A reviewer can assemble a trustworthy, human-reviewed mock recall readiness packet from traceability records and supplier KDE gaps without mistaking the workflow for legal or FDA approval.

## Requirements

### Validated

- [done] Minimal Next.js App Router and TypeScript scaffold exists.
- [done] `api/openapi.yaml` defines the contract-first traceability API.
- [done] `lib/api/generated/openapi-types.ts` is generated from the OpenAPI contract.
- [done] Mock recall detail and packet routes return typed `application/problem+json` not-found responses for missing resources.
- [done] GitHub Actions contract gate runs npm install, OpenAPI freshness, typecheck, build, and MockRecall smoke checks on push and pull request events.
- [done] Batch deltas document the current scaffold, OpenAPI, generated-type, runtime-verification, and truth-surface state.

### Active

- [ ] Keep contract, generated types, README, product memory, and delta reports synchronized.
- [ ] Add contract examples for `MockRecallDetail` and future CSV packet behavior before broad runtime implementation.
- [ ] Implement traceability lots, CTE records, supplier KDE requests, exceptions, human review, mock recall summary, and FDA-style sortable CSV export in approved micro-batches.
- [ ] Preserve tenant isolation, RBAC, idempotency, and append-only auditability before production data workflows.

### Out of Scope

- Compliance certification - the product is readiness workflow only.
- Legal advice or automated exemption decisions - ambiguous regulatory questions route to human review.
- FDA endorsement - export language may be FDA-style, not FDA-approved.
- ERP replacement - this remains a traceability workflow layer.
- Supplier portal, OCR, blockchain, mobile scanning, dashboards, and broad integrations - these are not part of the current MVP.
- Database, auth, imports, exports, CSV generation, UI expansion, or runtime traceability logic without an approved batch.

## Context

- Current repo: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- Current branch at initialization: `main`.
- Expected remote: `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- OpenAPI source of truth: `api/openapi.yaml`.
- Generated contract types: `lib/api/generated/openapi-types.ts`.
- Shared Problem Details helper: `lib/api/problem.ts`.
- Current runtime API behavior is intentionally narrow: two mock-recall routes expose one contract fixture for smoke checks and return not-found Problem Details for missing resources.
- FDA research checked on 2026-05-28 says FDA intends not to enforce the Food Traceability Rule before July 20, 2028, following the 2026 appropriations directive; recheck official FDA sources before date-specific claims.
- FDA's electronic sortable spreadsheet template is illustrative, not a required exact template.

## Constraints

- **Regulatory posture**: Use readiness workflow, human review, and FDA-style sortable export language only.
- **Batch discipline**: Keep work in small approved batches and document each batch in `ops/deltas/`.
- **Contract first**: OpenAPI changes precede database, auth, or runtime workflow expansion.
- **Generated files**: Do not hand-edit `lib/api/generated/openapi-types.ts`.
- **Artifact hygiene**: Do not commit `.next/`, `node_modules/`, `next-env.d.ts`, `.env*.local`, or `*.tsbuildinfo`.
- **Runtime absences**: No database, auth, tenant model, RBAC, audit log, persisted traceability records, imports, exports, storage-backed mock recall payloads, or production CSV generation exist yet.
- **Tooling**: If future work asks about library/framework/API usage, use the repo's Context7 CLI rule first.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the product as a lightweight readiness workflow | Prevents expansion into ERP/compliance engine scope | Pending |
| Use OpenAPI as the API source of truth | Keeps contract reviewable before runtime implementation | Good so far |
| Keep generated OpenAPI types committed | Gives route helpers typed access to contract schemas | Good so far |
| Use Problem Details for API errors | Aligns future API errors around a consistent contract | Good so far |
| Require human review for ambiguous regulatory cases | Avoids automated legal/exemption determinations | Pending |
| Use GSD fine-grained phases with Codex text mode | Matches the repo's micro-batch discipline | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition:

1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if product reality drifted.

After each milestone:

1. Review all sections.
2. Check whether Core Value is still the right priority.
3. Audit Out of Scope reasons.
4. Update Context with current state and evidence.

---
*Last updated: 2026-05-28 after GSD project initialization*
