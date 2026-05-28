---
created: 2026-05-28
sources: repo
---

# Architecture Research

## Recommended Product Architecture

The product should stay contract-first and slice runtime behavior behind the existing OpenAPI contract. Each batch should move one narrow capability from contract to runtime while preserving Problem Details, idempotency, tenant isolation, RBAC, and auditability guardrails.

## Suggested Layers

- Contract layer: `api/openapi.yaml`.
- Generated type layer: `lib/api/generated/openapi-types.ts`.
- Response helper layer: `lib/api/problem.ts`.
- Route layer: `app/api/traceability/...`.
- Future service layer: domain functions for lot/event/supplier/mock-recall workflows.
- Future persistence layer: storage behind service functions, not direct route-level data access.
- Future audit layer: append-only event capture for mutating actions and human-review decisions.

## Current Runtime Slice

The only runtime product behavior is missing-resource Problem Details for mock recall detail and packet routes. This is a useful first proof because it validates the error contract before storage exists.

## Next Architectural Moves

- Add CI enforcement around existing contract checks.
- Add OpenAPI examples for successful mock recall detail and packet export shapes.
- Add a test strategy before broad runtime expansion.
- Introduce persistence, auth, tenant context, RBAC, and audit in a deliberately approved sequence.

## Boundaries

- Do not build runtime workflows faster than the contract and review model can support.
- Do not add a database without a tenant/audit plan.
- Do not implement automated legal interpretations.
- Do not add CSV export before its data sources and review states are well-defined.
