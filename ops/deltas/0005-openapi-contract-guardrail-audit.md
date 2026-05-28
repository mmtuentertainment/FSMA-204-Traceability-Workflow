# Batch 5 - OpenAPI Contract Guardrail Audit

## What was audited

Read-only audit of `api/openapi.yaml` as the API source of truth before adding handlers, database, authentication, UI product features, imports, exports, or runtime traceability logic.

The audit checked the committed baseline at `f2f54ca Add OpenAPI license metadata`, with `ff54a0f Add OpenAPI tooling` immediately behind it. Preflight working tree state showed only untracked `PLAN.md` before this batch started.

## Commands run

Preflight and baseline checks:

- `Get-Location`
- `git status --short`
- `git log --oneline -5`
- `git remote -v`
- `node -v`
- `npm -v`

Audit inspection:

- `Get-Content api\openapi.yaml`
- `Get-Content package.json`
- `rg -n "(&[A-Za-z0-9_-]+|\*[A-Za-z0-9_-]+|<<:|x-response-sets|tenant_id|tenantId|Idempotency-Key|problem\+json|Retry-After|certif|endorse|legal advice|exemption|human|CSV|csv|ERP|blockchain|OCR|supplier portal)" api\openapi.yaml`
- `rg -n "^(  /|    (get|post|put|patch|delete):|      operationId:|      summary:|      description:|        '?(400|401|403|404|409|422|429|500)'?:|        '?(201|200|202|204)'?:)" api\openapi.yaml`
- `git diff -- api\openapi.yaml lib\api\generated\openapi-types.ts`
- `Select-String` operationId uniqueness check
- `rg -n "(^|[\s,{\[])(tenant_id|tenantId|tenant-id|tenant identity|tenant_identity)($|[\s,}\]])" api\openapi.yaml`
- `rg -n "(&[A-Za-z0-9_-]+|\*[A-Za-z0-9_-]+|<<:|x-response-sets)" api\openapi.yaml`
- `rg -n "application/json:\s*\{\s*schema:\s*\{\s*type:\s*object|default:|NotFound|404|500|application/problem\+json|Retry-After" api\openapi.yaml`
- `rg -n "(certification|certified|FDA endorsement|endorsement|legal advice|automated exemption|automatic exemption|automated.*determination|ERP|blockchain|OCR|supplier portal|human_review_required|ambiguous_exemption|kill_step_review|imported_food_review|partial_exemption_review|ambiguous_lot_code|text/csv|FDA-style|sortable|readiness)" api\openapi.yaml`
- PowerShell operation summary over paths, methods, operationIds, idempotency headers, and response status codes.

Verification:

- `npm run api:lint`
- `npm run api:types:check`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `git status --short`

## Guardrail checklist results

### Operation hygiene - PASS

- All 12 operations have stable `operationId` values.
- Operation IDs are unique.
- No YAML anchors, aliases, merge keys, or `x-response-sets` were found.
- Paths and operation IDs are implementation-ready and not obviously duplicated or ambiguous.

### Tenant isolation posture - PASS

- No request or response schema exposes `tenant_id` or `tenantId`.
- No path, query, or header parameter exposes tenant identity.
- Tenant context remains described as server-derived through future server-side auth.

### Write safety - PASS

- All write operations are `POST` or `PATCH`.
- Each write operation references `#/components/parameters/IdempotencyKey`.
- Read-only `GET` operations do not require `Idempotency-Key`.

### Error contract - FINDING

- Existing shared error responses use `application/problem+json` with the `Problem` schema.
- 429 responses reference `RateLimited`, which includes `Retry-After`.
- No vague JSON object error bodies were found.
- Finding: path-parameter resource operations do not document a `404` Problem Details response, leaving not-found behavior undefined before handlers are added.

### Regulatory/product language - PASS

- Contract language remains conservative: readiness workflow, human review, and FDA-style sortable CSV packet export.
- The description explicitly says the contract is not compliance certification, legal advice, or FDA endorsement.
- No automated exemption determination language was found.

### Human-review semantics - PASS

- Ambiguous exemption, kill-step, imported-food, partial-exemption, and ambiguous lot-code issues remain representable through `review_reason` values and `human_review_required`.
- The contract does not force automated final determinations for those review issues.

### CSV packet export - PASS

- `downloadMockRecallPacketCsv` returns `text/csv`.
- The CSV operation is described as FDA-style sortable packet output in a mock recall readiness context.
- The CSV endpoint is not mixed with JSON packet response bodies.

### First-slice fit - PASS

- The contract still fits the first product slice: lot/TLC normalization, receiving/transformation/shipping event linkage, supplier KDE request tracking, exception review, mock recall readiness runs, and FDA-style sortable CSV packet export.
- The contract has not drifted into ERP, blockchain, OCR, broad supplier portal scope, generic compliance dashboard scope, database/auth implementation, imports, exports, or runtime traceability logic.

## Findings

### P0 - none

No findings block the contract from being reviewed or linted.

### P1 - resource lookup operations need documented not-found responses before handlers

Affected operations:

- `PATCH /api/traceability/exceptions/{exceptionId}`
- `PATCH /api/traceability/supplier-requests/{supplierRequestId}`
- `GET /api/traceability/mock-recalls/{mockRecallId}`
- `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv`

Risk: handlers for path-parameter resources will need an explicit not-found branch. Without a documented `404` response using `application/problem+json`, implementation may either return an undocumented framework/default response or misclassify missing resources as another error type.

### P2 - none

No deferrable guardrail issues were identified.

## Recommended next micro-batch

Because a P1 finding exists, the next micro-batch should be the single smallest contract fix:

Add one reusable `NotFound` response using `application/problem+json`, reference it from the four path-parameter resource operations, regenerate/check generated types if needed, and rerun the existing OpenAPI/type/build verification commands.

Do not start handlers, database, auth, UI, imports, exports, or runtime workflow logic in that micro-batch.

## What was intentionally skipped

- No edits to `api/openapi.yaml`.
- No edits to `lib/api/generated/openapi-types.ts`.
- No dependency installs, removals, upgrades, downgrades, or audit fixes.
- No changes to `package.json`, `package-lock.json`, or Redocly configuration.
- No handlers, database, authentication, UI product features, imports, exports, runtime traceability logic, tests, migrations, data models, supplier portal, OCR, ERP integration, CI, or legal/compliance certification language.
- No changes to untracked `PLAN.md`.
- No push to remote.

## Verification results

- `npm run api:lint` - PASS. Redocly reported the API description as valid with no lint warning findings.
- `npm run api:types:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS.
- `git diff --check` - PASS.
- `git status --short` - PASS for expected batch state: pre-existing untracked `PLAN.md` plus this untracked audit delta before staging.

## Final git status

Before staging this delta:

```text
?? PLAN.md
?? ops/deltas/0005-openapi-contract-guardrail-audit.md
```

`api/openapi.yaml` remained unchanged. `lib/api/generated/openapi-types.ts` remained unchanged.
