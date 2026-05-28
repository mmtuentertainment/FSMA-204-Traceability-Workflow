---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: quality
---

# Conventions

## TypeScript Style

- Use TypeScript throughout app and library files.
- Prefer explicit exported function return types for route handlers and helpers, as seen in `lib/api/problem.ts`.
- Use `import type` for type-only imports, as in `app/layout.tsx` and `lib/api/problem.ts`.
- Keep helper types local when they are route-specific, such as `RouteContext` in the mock recall route files.

## Next.js Route Pattern

- Route handlers export named HTTP functions such as `GET`.
- Dynamic route params are modeled as `Promise<{ mockRecallId: string }>` in current Next.js 16 route handlers.
- The route handler awaits `params`, derives the request path with `new URL(request.url).pathname`, and returns a plain `Response`.
- Shared response formatting belongs in `lib/api/problem.ts`.

## OpenAPI Conventions

- `api/openapi.yaml` uses OpenAPI 3.1.0.
- Stable `operationId` values are required for every operation.
- Mutating operations include the shared `Idempotency-Key` parameter.
- Error responses use shared response components with `application/problem+json`.
- Rate-limit responses include `Retry-After`.
- Contract language stays conservative: readiness workflow, human review, and FDA-style sortable export.

## Generated-Code Convention

- `lib/api/generated/openapi-types.ts` is generated from `api/openapi.yaml`.
- Update it with `npm run api:types`.
- Check it with `npm run api:types:check`.
- Never hand-edit generated contract types.

## Batch Discipline

- Work should be small, approved, and documented in `ops/deltas/`.
- Each batch should state what changed, why, verification commands, skipped scope, and next micro-batch.
- Generated artifacts should remain ignored unless an approved `.gitignore` plan says otherwise.
- Package or dependency changes should be explicit batch scope, not incidental.

## Regulatory Language

- Allowed language: readiness workflow, human review, FDA-style sortable export.
- Avoid claims of compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- Product-heavy additions such as ERP integration, supplier portals, OCR, and dashboards remain out of scope until explicitly approved.

## Documentation Style

- `README.md` should reflect the current repo state, not future aspirations.
- `ops/memory/product.md` should stay short and high-signal.
- `.planning/HANDOFF.json` and `.planning/.continue-here.md` should preserve resumability after pauses.
