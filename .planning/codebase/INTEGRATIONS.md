---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: tech
---

# Integrations

## Current External Services

- No database integration exists.
- No production authentication provider integration exists.
- No tenant service, production RBAC provider, storage service, queue, email provider, webhook, or third-party API client exists.
- No Vercel project configuration exists in the repository.
- GitHub Actions is the only configured external automation surface.

## API Surface

- `api/openapi.yaml` defines the intended REST API contract.
- The OpenAPI server URL is `/`, so route paths are app-relative.
- The OpenAPI contract declares placeholder bearer auth via `components.securitySchemes.bearerAuth`; runtime auth provider wiring does not exist yet.
- Mutating OpenAPI operations require the shared `Idempotency-Key` header parameter.
- Shared error responses use `application/problem+json`, including 401, 403, 404, 409, 422, and 429.
- Rate-limit responses declare a `Retry-After` header.

## Runtime Routes

- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts` implements `GET /api/traceability/mock-recalls/{mockRecallId}` for one contract fixture and not-found Problem Details for missing resources.
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts` implements `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` for one contract fixture CSV and not-found Problem Details for missing resources.
- `app/api/traceability/exceptions/[exceptionId]/route.ts` implements `PATCH /api/traceability/exceptions/{exceptionId}` for one fixture exception using local/test fixture auth, fixture tenant identity, reviewer RBAC, in-memory idempotency, and in-memory audit evidence.
- Both MockRecall routes go through `handleReadAction()` in `lib/api/route-boundary.ts`.
- Both MockRecall routes use `fixtureMockRecallSource` in `lib/api/mock-recall-source.ts`, which gates access by the server-derived public fixture tenant.
- The Problem catalog in `lib/api/problem.ts` owns not-found, unauthorized, forbidden, conflict, and validation Problem responses.

## Contracted But Not Implemented

- Traceability lots are contracted at `/api/traceability/lots`.
- Traceability events are contracted at `/api/traceability/events`.
- Human-review exception listing is contracted at `/api/traceability/exceptions`; exception PATCH is implemented only for the approved fixture path at `/api/traceability/exceptions/{exceptionId}`.
- Supplier KDE requests are contracted at `/api/traceability/supplier-requests` and `/api/traceability/supplier-requests/{supplierRequestId}`.
- Mock recall creation is contracted at `/api/traceability/mock-recalls`.
- Mock recall detail and packet download are partially implemented for the single fixture plus missing-resource Problem Details.

## Phase 3 Integration Seams

- `RequestContextResolver` is the future auth/session/tenant integration point.
- `AuthorizationPolicy` is the future RBAC integration point.
- `MockRecallSource` is the future persistence ownership seam for MockRecall reads.
- `IdempotencyStore` and `AuditSink` are the future mutating-write integration points; the exception-review PATCH uses in-memory fixture implementations only.
- Current defaults are public-fixture/local-test adapters only; they do not select or configure production providers.

## Integration Guardrails

- Future auth must derive tenant context server-side; OpenAPI intentionally avoids `tenant_id` and `tenantId` request authority.
- Future writes must preserve idempotency-key handling.
- Future API errors should continue using `application/problem+json` and RFC 9457-style Problem Details.
- Future CSV packet work should keep the language to FDA-style sortable export, not FDA endorsement or certification.
- Batch 34 implemented exception-review PATCH as the first fixture-only write; production provider wiring and broader runtime workflows are still gated.
