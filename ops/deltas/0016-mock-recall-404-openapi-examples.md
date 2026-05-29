# Batch 16 - MockRecall 404 OpenAPI Examples

## Goal

Add concrete OpenAPI 404 Problem Details examples for the MockRecall missing-detail and missing-packet routes so the API source of truth matches current runtime and smoke-test behavior.

## Files changed

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `ops/deltas/0016-mock-recall-404-openapi-examples.md`

## Contract impact

- `GET /api/traceability/mock-recalls/{mockRecallId}` now documents a concrete `404 application/problem+json` example for missing mock recall detail.
- `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` now documents a concrete `404 application/problem+json` example for missing packet CSV.
- Both examples use the current smoke-test missing ID `contract-smoke-missing` and match the runtime Problem Details shape:
  - `type: about:blank`
  - `title: Resource not found`
  - `status: 404`
  - `detail: No mock recall was found for mockRecallId "contract-smoke-missing".`
  - `instance` equal to the request path
- The generated OpenAPI TypeScript artifact was regenerated with `npm run api:types` after `npm run api:check` reported it was stale.

## Runtime impact

None expected. No runtime route handlers, Problem Details helpers, package scripts, dependencies, package manager files, smoke tests, storage, auth, RBAC, tenanting, audit behavior, imports, exports, UI, or production workflow logic changed.

## Verification

- `git status --short` - PASS before edits; clean working tree.
- `git branch --show-current` - PASS; `main`.
- `git branch -vv` - PASS; `main` at `a12c73f`, ahead of `origin/main` by 1.
- `git rev-parse --short HEAD` - PASS; `a12c73f`.
- `rg -n "mock-recalls|contract-smoke-missing|No mock recall was found|Resource not found|application/problem\+json|about:blank" api/openapi.yaml lib/api/problem.ts app/api/traceability/mock-recalls tests/mock-recall-contract-smoke.mjs` - PASS; examples, runtime helper, and smoke constants align.
- `npm run api:check` - initially failed because generated OpenAPI types were stale after the contract edit.
- `npm run api:types` - PASS; regenerated `lib/api/generated/openapi-types.ts`.
- `npm run api:check` - PASS after regeneration.
- `npm run typecheck` - PASS.
- `npm run build` - PASS; build listed both MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; MockRecall contract smoke check passed.

## Rollback path

Revert this batch's changes to `api/openapi.yaml`, `lib/api/generated/openapi-types.ts`, and `ops/deltas/0016-mock-recall-404-openapi-examples.md`. No runtime rollback is required because no runtime files changed.
