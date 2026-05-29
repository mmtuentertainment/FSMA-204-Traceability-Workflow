# Batch 13 - MockRecall Contract Reconciliation

## Goal

Start a separate MockRecall contract reconciliation batch per the approved Option B direction. Align the MockRecall OpenAPI contract, generated types, runtime behavior, and executable smoke coverage with OpenAPI as the source of truth.

## Preflight

- Repository path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`
- Branch: `codex/fsma204/ci-contract-gate`
- Remote: `origin https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`
- Node.js: `v22.12.0`
- npm: `10.9.0`
- Recent `HEAD`: `bb48318 docs: initialize gsd project`

Initial dirty tree before this batch:

```text
 M package-lock.json
 M package.json
?? .github/workflows/contract-gate.yml
?? ops/deltas/0012-ci-contract-gate.md
```

Those files belong to the pre-existing CI contract gate and TypeScript reproducibility repair. This batch did not modify them.

## Existing MockRecall Inventory

- OpenAPI paths present:
  - `POST /api/traceability/mock-recalls`
  - `GET /api/traceability/mock-recalls/{mockRecallId}`
  - `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv`
- Generated types present for `MockRecall`, `MockRecallDetail`, `MockRecallCreate`, `getMockRecall`, and `downloadMockRecallPacketCsv`.
- Runtime routes present:
  - `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
  - `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- Shared Problem Details helper present at `lib/api/problem.ts`.
- No committed tests existed before this batch.

## Exact Mismatch Found

- `api/openapi.yaml` declared a `200 application/json` `MockRecallDetail` response for `GET /api/traceability/mock-recalls/{mockRecallId}`.
- `lib/api/generated/openapi-types.ts` reflected that success response.
- Runtime returned `404 application/problem+json` for every `mockRecallId`, including any ID that should exercise the success shape.
- `api/openapi.yaml` declared a `200 text/csv` response for `GET /api/traceability/mock-recalls/{mockRecallId}/packet.csv`.
- Runtime returned `404 application/problem+json` for every packet request.
- README and product memory still described `MockRecallDetail` as contract-only.
- The existing runtime 404 behavior matched the documented Problem Details response, but it was not protected by a committed executable check.

## Files Changed

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/api/mock-recall.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- `tests/mock-recall-contract-smoke.mjs`
- `README.md`
- `ops/memory/product.md`
- `ops/deltas/0013-mock-recall-contract-reconciliation.md`

## Contract And Runtime Impact

- Added an explicit OpenAPI contract fixture example for `MockRecallDetail`.
- Added an explicit OpenAPI CSV fixture example for the packet endpoint.
- Regenerated generated OpenAPI types from `api/openapi.yaml`.
- Added `lib/api/mock-recall.ts` as a tiny typed fixture source using generated OpenAPI component types.
- The fixture ID `contract-fixture-ready-for-review` now returns:
  - `200 application/json` for detail.
  - `200 text/csv; charset=utf-8` for packet CSV.
- Unknown mock-recall IDs still return RFC 9457-style `404 application/problem+json` through the existing Problem Details helper.

This is not a storage, auth, tenant, RBAC, audit, import/export, or production CSV generation implementation. The fixture only reconciles the current contract and runtime surface so future work can detect drift.

## Executable Smoke Check

Added `tests/mock-recall-contract-smoke.mjs`.

The check starts the built Next production server on `127.0.0.1:3227` and verifies:

- The fixture detail route returns `200 application/json` with the OpenAPI-shaped `MockRecallDetail`.
- The fixture packet route returns `200 text/csv`.
- A missing detail route returns `404 application/problem+json`.
- A missing packet route returns `404 application/problem+json`.

No test framework or package script was added.

## Verification Commands

- `npm run api:types` - PASS. Regenerated `lib/api/generated/openapi-types.ts` from `api/openapi.yaml`.
- `npm ci` - PASS. npm installed 228 packages and reported 2 moderate audit findings; no audit repair was run because dependency cleanup is outside this batch.
- `npm run api:check` - PASS. Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` reported generated types are current.
- `npm run typecheck` - PASS.
- `npm run build` - PASS. Next.js built successfully and listed both MockRecall API routes as dynamic routes.
- `node tests\mock-recall-contract-smoke.mjs` - PASS. The fixture success routes and missing-resource Problem Details routes matched expectations.
- `git diff --check` - PASS.
- `git status --short --untracked-files=all` - PASS for inspection; final status is recorded below.

Final status:

```text
 M README.md
 M api/openapi.yaml
 M app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts
 M app/api/traceability/mock-recalls/[mockRecallId]/route.ts
 M lib/api/generated/openapi-types.ts
 M ops/memory/product.md
 M package-lock.json
 M package.json
?? .github/workflows/contract-gate.yml
?? lib/api/mock-recall.ts
?? ops/deltas/0012-ci-contract-gate.md
?? ops/deltas/0013-mock-recall-contract-reconciliation.md
?? tests/mock-recall-contract-smoke.mjs
```

The `package.json`, `package-lock.json`, `.github/workflows/contract-gate.yml`, and `ops/deltas/0012-ci-contract-gate.md` entries are pre-existing CI/package repair work and are not part of this batch.

## Skipped Scope

- No CI workflow edits.
- No `package.json` or `package-lock.json` edits in this batch.
- No production dependency changes.
- No auth, RBAC, tenanting, audit, database, persistence, imports, exports, UI, supplier workflow, or broad planning document changes.
- No POST/mutating MockRecall runtime handler.
- No real CSV export workflow or persisted mock-recall records.
- No false compliance certification, legal advice, FDA endorsement, or automated exemption determination language.

## Risks

- The repository still has pre-existing uncommitted CI/package changes, so reviewers should separate this batch by file path.
- The fixture is intentionally static. It proves contract/runtime agreement but does not prove future persisted readiness aggregation.
- The smoke check depends on a successful production build existing before it runs.

## Rollback Path

Remove this batch by reverting only:

- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/api/mock-recall.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/route.ts`
- `app/api/traceability/mock-recalls/[mockRecallId]/packet.csv/route.ts`
- `tests/mock-recall-contract-smoke.mjs`
- `README.md`
- `ops/memory/product.md`
- `ops/deltas/0013-mock-recall-contract-reconciliation.md`

Do not revert the pre-existing CI/package repair files as part of this rollback.

## Recommended Next Micro-Batch

After this batch is reviewed separately from the CI repair, add a lightweight way to run the MockRecall smoke check from CI or a documented local script, without adding a heavy test framework or broad runtime behavior.
