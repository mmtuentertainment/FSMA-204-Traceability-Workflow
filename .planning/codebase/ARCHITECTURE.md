---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: arch
---

# Architecture

## Shape

- This is a small contract-first Next.js App Router repository.
- The user-facing UI is intentionally just a baseline status page in `app/page.tsx`.
- API work is contract-led through `api/openapi.yaml`, with generated TypeScript types in `lib/api/generated/openapi-types.ts`.
- Runtime implementation is limited to two MockRecall GET route handlers, one static contract fixture success path, fixture-derived packet CSV, and not-found Problem Details for missing resources.
- Phase 3 has started but is not complete: the provider-neutral boundary skeleton is implemented, while provider selection, real auth, persistence, non-public tenant enforcement, idempotency storage, and audit storage remain absent.

## Layers

- App shell: `app/layout.tsx` exports metadata and the root HTML/body layout.
- Status page: `app/page.tsx` shows the baseline scaffold message.
- API routes: `app/api/traceability/mock-recalls/[mockRecallId]/...` contains dynamic route handlers.
- Route boundary: `lib/api/route-boundary.ts` resolves request context, authorizes action class, runs a tenant-scoped load, and renders success or Problem Details.
- API helpers: `lib/api/mock-recall.ts`, `lib/api/mock-recall-source.ts`, and `lib/api/problem.ts` hold fixture data, tenant-scoped source access, and Problem Details responses.
- Security seams: `lib/security/request-context.ts`, `lib/security/authorization.ts`, and `lib/security/idempotency-audit.ts` define provider-neutral Phase 3 shapes.
- Contract: `api/openapi.yaml` defines all planned traceability endpoints and schemas.
- Generated contract types: `lib/api/generated/openapi-types.ts` reflects the OpenAPI contract.
- Operational memory: `ops/memory/product.md` and `ops/deltas/*.md` capture product state and batch evidence.

## Request Flow

- A request to `GET /api/traceability/mock-recalls/{mockRecallId}` enters `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`.
- A request to `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` enters `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`.
- The route awaits `params`, extracts `mockRecallId`, and delegates to `handleReadAction()`.
- `handleReadAction()` resolves a server-owned request context through `publicFixtureContextResolver`.
- The default policy authorizes only `mock_recall.read` and `mock_recall.packet.read`.
- The route load calls `fixtureMockRecallSource` with the derived tenant id and requested mock recall id.
- `fixtureMockRecallSource` returns data only for `PUBLIC_FIXTURE_TENANT_ID`; any cross-tenant miss returns `null`.
- `null` loads become not-found Problem Details through `mockRecallNotFoundResponse()`.
- Success renders return JSON detail or `text/csv; charset=utf-8` packet bytes.

## Data Model State

- The OpenAPI contract models lots, events, exceptions, supplier requests, mock recalls, mock recall detail, packet CSV, and Problem Details.
- The runtime has no persistence layer, no in-memory mutable store, and no repository implementation.
- The only live data is `mockRecallContractFixture` in `lib/api/mock-recall.ts`.
- The packet CSV is a deterministic projection of that fixture, not production CSV generation over arbitrary records.
- There are no migrations, database schemas, ORM files, persisted seed data, or storage adapters.

## Security And Write Boundary State

- `request-context.ts` defines `Principal`, `TenantContext`, `RequestContext`, and `RequestContextResolver`.
- `authorization.ts` defines action-oriented, deny-by-default authorization with two public fixture read actions allowed.
- `route-boundary.ts` maps unauthorized/forbidden/not-found outcomes to Problem Details and avoids cross-tenant existence leaks by returning 404 for tenant-scoped misses.
- `idempotency-audit.ts` defines `AuditEvent`, `AuditSink`, `IdempotencyScope`, `IdempotencyCheck`, and `IdempotencyStore`, plus an uninvoked no-op audit sink.
- Batch 31 documents the first mutating-write design for exception-review PATCH, but no write route or operational idempotency/audit behavior exists yet.

## Product Architecture Boundary

- The product is a readiness workflow layer for human-reviewed traceability records.
- It is not an ERP, legal-advice engine, exemption-determination service, FDA certification system, supplier portal, OCR pipeline, or blockchain traceability system.
- Ambiguous exemption, imported-food, kill-step, partial-exemption, and lot-code issues should route through human review in future product slices.

## Planning Architecture

- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` exist.
- `.planning/HANDOFF.json` is structured resume state and points to the current Phase 3 artifacts.
- `.planning/phases/FSMA-03-security-and-persistence-foundation/` contains the Phase 3 kickoff, 03-01A boundary decision, and 03-02 first mutating-write design.
- Batch reports in `ops/deltas/` are the strongest chronological evidence for what changed and why.
