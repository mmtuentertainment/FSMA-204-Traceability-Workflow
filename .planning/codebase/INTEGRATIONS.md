---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: tech
---

# Integrations

## Current External Services

- No database integration exists.
- No authentication provider integration exists.
- No tenant service, RBAC provider, storage service, queue, email provider, webhook, or third-party API client exists.
- No Vercel project configuration exists in the repository.

## API Surface

- `api/openapi.yaml` defines the intended REST API contract.
- The OpenAPI server URL is `/`, so route paths are app-relative.
- The OpenAPI contract declares placeholder bearer auth via `components.securitySchemes.bearerAuth`, but no runtime auth enforcement exists yet.
- Mutating OpenAPI operations require the shared `Idempotency-Key` header parameter.

## Runtime Routes

- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` implements `GET /api/traceability/mock-recalls/{mockRecallId}` as a not-found Problem Details response.
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` implements `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` as a not-found Problem Details response.
- Both routes call `mockRecallNotFoundResponse()` from `lib/api/problem.ts`.
- No successful mock recall detail payload or CSV generation exists at runtime.

## Contracted But Not Implemented

- Traceability lots are contracted at `/api/traceability/lots`.
- Traceability events are contracted at `/api/traceability/events`.
- Human-review exceptions are contracted at `/api/traceability/exceptions` and `/api/traceability/exceptions/{exceptionId}`.
- Supplier KDE requests are contracted at `/api/traceability/supplier-requests` and `/api/traceability/supplier-requests/{supplierRequestId}`.
- Mock recall creation is contracted at `/api/traceability/mock-recalls`.
- Mock recall detail and packet download are partially implemented only for missing-resource Problem Details.

## Integration Guardrails

- Future auth must derive tenant context server-side; OpenAPI intentionally avoids `tenant_id` and `tenantId`.
- Future writes should preserve idempotency-key handling.
- Future API errors should continue using `application/problem+json` and RFC 9457-style Problem Details.
- Future CSV packet work should keep the language to FDA-style sortable export, not FDA endorsement or certification.
