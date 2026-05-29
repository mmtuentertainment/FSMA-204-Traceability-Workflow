---
created: 2026-05-28
sources: repo, FDA
---

# Research Summary

## Project Context

FSMA 204 Workflow Product is a conservative traceability readiness workflow for fresh-cut produce mock recall preparation. The current repository already has a minimal Next.js App Router scaffold, an OpenAPI-first contract, generated TypeScript contract types, and runtime-verified Problem Details handlers for missing mock recalls.

## Current Regulatory Snapshot

- FDA's current Food Traceability Rule page says the original compliance date was January 20, 2026, but FDA proposed a 30-month extension to July 20, 2028, and Congress directed FDA not to enforce the rule before July 20, 2028.
- FDA describes the electronic sortable spreadsheet template as illustrative; firms are not required to use that exact template to comply with the rule.
- The Food Traceability List covers listed foods and foods containing listed foods as ingredients when the listed food remains in the same form.
- This product should continue using readiness, human review, and FDA-style sortable export language without legal advice, certification, endorsement, or automated exemption determination.

## Repository Baseline

- `api/openapi.yaml` is the source of truth for API shape.
- `lib/api/generated/openapi-types.ts` is generated from the OpenAPI contract.
- `lib/api/problem.ts` centralizes typed Problem Details responses.
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` and `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` currently return not-found Problem Details for all requests.
- `ops/deltas/` contains batch evidence through Batch 10.

## Table Stakes For The Planned Product

- OpenAPI contract stays ahead of runtime implementation.
- Traceability lot and CTE/KDE capture is reviewable by humans.
- Supplier KDE gaps and ambiguous lot/TLC issues are surfaced as exceptions.
- Mock recall readiness can summarize affected lots, shipments, open exceptions, supplier requests, and human-review reasons.
- FDA-style sortable CSV packet export remains bounded as a readiness/export aid.
- Tenant isolation, RBAC, idempotency, and append-only auditability are preserved before production use.

## Sources

- FDA Food Traceability Rule: https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-proposed-rule-food-traceability
- FDA Food Traceability List: https://www.fda.gov/food/food-safety-modernization-act-fsma/food-traceability-list
- FDA sortable spreadsheet template page/PDF: https://www.fda.gov/media/181945/download
