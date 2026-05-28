---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: arch
---

# Architecture

## Shape

- This is a small contract-first Next.js App Router repository.
- The user-facing UI is intentionally just a baseline status page in `app/page.tsx`.
- API work is currently contract-led through `api/openapi.yaml`, with generated TypeScript types in `lib/api/generated/openapi-types.ts`.
- Runtime implementation is limited to two mock-recall not-found route handlers.

## Layers

- App shell: `app/layout.tsx` exports metadata and the root HTML/body layout.
- Status page: `app/page.tsx` shows the baseline scaffold message.
- API routes: `app/api/traceability/mock-recalls/[mockRecallId]/...` contains dynamic route handlers.
- API helpers: `lib/api/problem.ts` centralizes Problem Details response construction.
- Contract: `api/openapi.yaml` defines all planned traceability endpoints and schemas.
- Generated contract types: `lib/api/generated/openapi-types.ts` reflects the OpenAPI contract.
- Operational memory: `ops/memory/product.md` and `ops/deltas/*.md` capture product state and batch evidence.

## Request Flow

- A request to `GET /api/traceability/mock-recalls/{mockRecallId}` enters `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`.
- A request to `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` enters `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`.
- The route awaits `params`, extracts `mockRecallId`, derives the request path from `new URL(request.url).pathname`, and calls `mockRecallNotFoundResponse()`.
- `mockRecallNotFoundResponse()` creates a typed Problem Details object and delegates to `problemResponse()`.
- `problemResponse()` serializes JSON and sets `Content-Type: application/problem+json`.

## Data Model State

- The OpenAPI contract models lots, events, exceptions, supplier requests, mock recalls, mock recall detail, and Problem Details.
- The runtime has no persistence layer, no in-memory store, and no data access abstraction.
- There are no migrations, schemas, ORM files, repositories, or seed fixtures.

## Product Architecture Boundary

- The product is a readiness workflow layer for human-reviewed traceability records.
- It is not an ERP, legal-advice engine, exemption-determination service, FDA certification system, supplier portal, OCR pipeline, or blockchain traceability system.
- Ambiguous exemption, imported-food, kill-step, partial-exemption, and lot-code issues should route through human review in future product slices.

## Planning Architecture

- `.planning/HANDOFF.json` and `.planning/.continue-here.md` currently hold resume state.
- Before this map, canonical GSD project files such as `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` were absent.
- Batch reports in `ops/deltas/` are the strongest chronological evidence for what changed and why.
