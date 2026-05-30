---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: quality
---

# Testing

## Current Automated Checks

- `npm run api:lint` validates `api/openapi.yaml` with Redocly.
- `npm run api:types:check` verifies generated OpenAPI types are current.
- `npm run api:check` combines OpenAPI lint and type freshness checks.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run build` performs a production Next build.
- `.github/workflows/contract-gate.yml` runs `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, and `npm run test:mock-recall:contract` on push and pull request events.

## Test Files

- `tests/mock-recall-contract-smoke.mjs` verifies the current MockRecall contract fixture and missing-resource Problem Details behavior against a production Next server.
- No test runner such as Vitest, Jest, Playwright, or Cypress is configured in `package.json`.
- Earlier runtime verification is captured in operational delta reports; current MockRecall fixture and not-found behavior are also protected by the committed smoke check.

## Verified Runtime Behavior

- `ops/deltas/0008-runtime-verify-mock-recall-problem-handlers.md` records production-server request verification for both mock-recall GET endpoints.
- The verified behavior was `404` with `Content-Type: application/problem+json` and a body containing `type`, `title`, `status`, `detail`, and `instance`.
- The CSV packet route returned Problem Details on missing resources; it did not return `text/csv` for that missing-resource case.

## Contract Verification Evidence

- `ops/deltas/0009-openapi-mock-recall-detail-success-shape.md` records passing `api:types`, `api:lint`, `api:types:check`, `typecheck`, `build`, and `git diff --check` for the `MockRecallDetail` contract change.
- `ops/deltas/0010-sync-truth-surfaces.md` records passing OpenAPI lint, generated-type check, typecheck, build, and diff checks after documentation sync.
- `ops/deltas/0021-mock-recall-contract-example-review.md` records that MockRecall OpenAPI examples matched fixture and missing-resource behavior without an OpenAPI repair.

## Testing Gaps

- The not-found route behavior is protected by the MockRecall contract smoke check.
- No broad unit, integration, or end-to-end test framework is configured.
- No tests cover `lib/api/problem.ts` directly.
- No storage-backed or production positive runtime path exists yet for `MockRecallDetail` or CSV packet generation.

## Recommended Next Testing Steps

- Keep the CI contract gate aligned with existing package scripts as contract checks evolve.
- Add focused route-handler tests only when the repo explicitly approves a test framework.
- Keep runtime success tests deferred until storage or a deliberate fixture strategy exists.
- Continue documenting verification commands in `ops/deltas/` for every micro-batch.
