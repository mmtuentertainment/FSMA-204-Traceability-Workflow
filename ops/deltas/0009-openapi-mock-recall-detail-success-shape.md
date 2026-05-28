# Batch 9 - OpenAPI Mock Recall Detail Success Shape

## Goal

Define the first successful mock recall detail response shape in OpenAPI only, without implementing storage, auth, CSV generation, UI, tests, or runtime success behavior.

## Preflight baseline

- Repository path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`
- Initial `git status --short`: `?? PLAN.md`
- Initial `HEAD`: `5500f33 Verify mock recall problem handlers at runtime`
- Recent history included:
  - `5500f33 Verify mock recall problem handlers at runtime`
  - `3120a69 Add first mock recall problem handlers`
  - `6c8aa8a Add OpenAPI not-found responses`
  - `d3e12e4 Audit OpenAPI contract guardrails`
  - `f2f54ca Add OpenAPI license metadata`
- Remote: `origin https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`
- Node.js: `v22.12.0`
- npm: `10.9.0`
- Only pre-existing untracked file: `PLAN.md`

## Files changed

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `ops/deltas/0009-openapi-mock-recall-detail-success-shape.md`

## Schema added or refined

Added reusable schema `MockRecallDetail`.

No materially equivalent detail schema existed. The existing `MockRecall` schema remains in place for the mock recall create response. The contract does not add `additionalProperties: false` because the existing OpenAPI schemas do not use that style.

## Endpoint response wired

- `GET /api/traceability/mock-recalls/{mockRecallId}` now has a `200` `application/json` response referencing `#/components/schemas/MockRecallDetail`.
- The existing operation ID, path parameter, auth/problem responses, and `404 -> components.responses.NotFound` are preserved.
- `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv` remains unchanged, with `text/csv` for success and `application/problem+json` for not found.

## Exact fields and enums

`MockRecallDetail` required top-level fields:

- `mockRecallId`: string
- `status`: string enum `draft`, `running`, `ready_for_human_review`, `packet_ready`, `closed`
- `scope`
- `readinessSummary`
- `packet`
- `createdAt`: string, `date-time`
- `updatedAt`: string, `date-time`

`scope` required fields:

- `productDescription`: string
- `traceabilityLotCode`: string
- `dateRangeStart`: string, `date`
- `dateRangeEnd`: string, `date`

`readinessSummary` required fields:

- `affectedLotCount`: integer, minimum `0`
- `affectedShipmentCount`: integer, minimum `0`
- `openExceptionCount`: integer, minimum `0`
- `supplierRequestCount`: integer, minimum `0`
- `humanReviewRequired`: boolean
- `humanReviewReasons`: array of enum values `ambiguous_exemption`, `partial_exemption`, `imported_food_review`, `kill_step_review`, `lot_code_ambiguity`, `supplier_kde_gap`, `transformation_linkage_gap`, `shipping_linkage_gap`

`packet` required fields:

- `csvAvailable`: boolean
- `csvHref`: string, `uri-reference`
- `format`: string enum `fda_style_sortable_csv`

## Contract-only confirmation

- The success shape is contract-only.
- Runtime handlers still intentionally may return `404` for all mock recall IDs until a later approved runtime/storage batch.
- Packet CSV success response remains `text/csv`.
- Human-review states remain explicit through `ready_for_human_review`, `humanReviewRequired`, and `humanReviewReasons`.
- No compliance certification, FDA endorsement, legal advice, or automated exemption determination language was added.

## Generated type result

- `npm run api:types`: PASS
- `lib/api/generated/openapi-types.ts` updated only to reflect `MockRecallDetail` and the detail endpoint `200` response type.

## Verification commands

- `npm run api:types`: PASS
- `npm run api:lint`: PASS; Redocly printed only the built-in recommended configuration note.
- `npm run api:types:check`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

Focused inspections:

- `git diff -- api/openapi.yaml`: inspected; only the detail `200` response and `MockRecallDetail` schema changed.
- `git diff -- lib/api/generated/openapi-types.ts`: inspected; only generated schema and response typing changed.
- `git status --short`: inspected; only `api/openapi.yaml`, `lib/api/generated/openapi-types.ts`, this delta report, and untracked `PLAN.md` were present.
- `rg -n "MockRecallDetail|ready_for_human_review|fda_style_sortable_csv|humanReviewReasons|automated exemption|certification|FDA endorsement|legal advice|tenantId|tenant_id" api/openapi.yaml`: inspected; expected schema terms were present. The certification/legal/FDA phrase was only the existing negative guardrail in the API description, and no `automated exemption`, `tenantId`, or `tenant_id` matches were present.

## Intentionally skipped

- Runtime handler changes
- Storage, database, auth, RBAC, middleware, audit log, imports, exports, CSV generation, fixtures, tests, UI, CI, dependency changes, and Redocly config
- Any edits to `PLAN.md`
- Remote push

## Final git status after commit

Expected final status after commit:

```text
?? PLAN.md
```

Commit hash is reported in the final response because a commit cannot contain its own final hash.

## Recommended next micro-batch

Add a contract-only OpenAPI example for `MockRecallDetail` or define the next explicitly approved runtime/storage slice that can begin returning a successful mock recall detail response.
