# Batch 6 - OpenAPI NotFound Problem Details Responses

## What changed

Added one reusable `NotFound` response under `components.responses` in `api/openapi.yaml`:

```yaml
NotFound:
  description: Resource not found.
  content: { application/problem+json: { schema: { $ref: "#/components/schemas/Problem" } } }
```

Referenced that shared response from exactly four path-parameter resource operations:

- `PATCH /api/traceability/exceptions/{exceptionId}`
- `PATCH /api/traceability/supplier-requests/{supplierRequestId}`
- `GET /api/traceability/mock-recalls/{mockRecallId}`
- `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv`

## Why this fixes the Batch 5 P1 finding

Batch 5 found that resource lookup operations with path parameters did not document explicit not-found behavior before handlers are added. These four operations now declare a reusable `404` response that returns RFC 9457-style Problem Details through the shared `Problem` schema and `application/problem+json` media type.

## Files changed

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `ops/deltas/0006-openapi-notfound-responses.md`

## Commands run

Preflight and baseline checks:

- `Get-Location`
- `git status --short`
- `git log --oneline -5`
- `git remote -v`
- `node -v`
- `npm -v`

Inspection and implementation checks:

- `rg -n "components:|responses:|NotFound|BadRequest|Conflict|Problem|application/problem\+json" api/openapi.yaml`
- `rg -n "exceptions/\{exceptionId\}|supplier-requests/\{supplierRequestId\}|mock-recalls/\{mockRecallId\}|packet\.csv|operationId:|responses:" api/openapi.yaml`
- `Get-Content api/openapi.yaml`
- `npm run api:types`
- `git diff -- lib/api/generated/openapi-types.ts`
- `git diff -- api/openapi.yaml`
- `git status --short`

Verification:

- `npm run api:lint` - PASS.
- `npm run api:types:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS.
- `git diff --check` - PASS.
- `git status --short` - PASS for expected batch state before staging.

## Redocly result

`npm run api:lint` passed. Redocly validated `api/openapi.yaml` with no warning or error findings. It printed the normal note that no Redocly configuration was provided and the built-in recommended configuration was used.

## Generated type result

`npm run api:types` updated `lib/api/generated/openapi-types.ts`. The generated diff was limited to:

- Adding `components.responses.NotFound`.
- Adding `404: components["responses"]["NotFound"]` to the four affected operation response maps.

`npm run api:types:check` passed afterward.

## Typecheck/build result

- `npm run typecheck` - PASS.
- `npm run build` - PASS.

## What was intentionally skipped

- No dependency installs, removals, upgrades, downgrades, or audit fixes.
- No changes to `package.json`, `package-lock.json`, or Redocly configuration.
- No database, authentication, route handlers, API handlers, UI product features, imports, exports, runtime traceability logic, tests, migrations, data models, supplier portal, OCR, ERP integration, or CI.
- No legal advice, compliance certification language, FDA endorsement language, or automated exemption determination language.
- No changes to collection endpoints or non-resource endpoints.
- No changes to operation IDs, parameters, request bodies, success responses, security behavior, idempotency behavior, `Retry-After` behavior, tenant isolation posture, CSV success response behavior, or human-review semantics.
- No changes to untracked `PLAN.md`.
- No push to remote.

## Final git status

Before staging this batch:

```text
 M api/openapi.yaml
 M lib/api/generated/openapi-types.ts
?? PLAN.md
?? ops/deltas/0006-openapi-notfound-responses.md
```

## Recommended next micro-batch

Add the first minimal API handler slice only after approving a dedicated handler batch. Keep it limited to one route family, return documented Problem Details responses, preserve idempotency behavior for writes, and do not add database/auth/UI/runtime workflow breadth beyond that approved slice.
