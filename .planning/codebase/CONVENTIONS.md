---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: quality
---

# Conventions

## TypeScript Style

- Use TypeScript throughout app and library files.
- Prefer explicit exported function return types for route handlers and helpers.
- Use `import type` for type-only imports.
- Keep route-specific helper types local, such as `RouteContext` in the MockRecall route files.
- Keep provider-neutral interfaces small and named around responsibilities: resolver, policy, source, store, sink.

## Next.js Route Pattern

- Route handlers export named HTTP functions such as `GET`.
- Dynamic route params are modeled as `Promise<{ mockRecallId: string }>` in current Next.js 16 route handlers.
- Route handlers await `params`, then delegate boundary/security/data behavior to library modules.
- Shared response formatting belongs in `lib/api/problem.ts`.
- Shared request-boundary behavior belongs in `lib/api/route-boundary.ts`.

## Boundary Pattern

- Request context is server-owned and must not trust body, query, route, arbitrary header, or client-supplied tenant ids.
- Authorization is action-oriented and deny-by-default.
- Data source seams are tenant-scoped; cross-tenant misses should return `null` and become 404 rather than leaking existence.
- Idempotency and audit are paired with future mutating writes; the current interfaces are not operational yet.
- Default adapters preserve the public fixture behavior and should not be mistaken for production auth or persistence.

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
- Keep docs-only batches out of `app/`, `lib/`, `tests/`, `.github/`, `api/openapi.yaml`, generated types, and package files unless explicitly approved.

## Regulatory Language

- Allowed language: readiness workflow, human review, FDA-style sortable export.
- Avoid claims of compliance certification, legal advice, FDA endorsement, or automated exemption determination.
- Exemption, imported-food, kill-step, partial-exemption, and ambiguous lot-code issues should remain human-review-required cases.
- Product-heavy additions such as ERP integration, supplier portals, OCR, dashboards, mobile scanning, and blockchain traceability remain out of scope until explicitly approved.

## Documentation Style

- `README.md`, `.planning/STATE.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md` should reflect current repo state, not stale phase assumptions.
- `ops/memory/product.md` should stay short and high-signal.
- `.planning/HANDOFF.json` should remain valid JSON.
- `.planning/codebase/` should be refreshed after meaningful architecture/runtime changes, especially after boundary or provider seams move.
