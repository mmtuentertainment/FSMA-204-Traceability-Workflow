---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: quality
---

# Testing

## Current Automated Checks

- `npm ci` installs from the committed lockfile.
- `npm run api:lint` validates `api/openapi.yaml` with Redocly.
- `npm run api:types:check` verifies generated OpenAPI types are current.
- `npm run api:check` combines OpenAPI lint and type freshness checks.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run build` performs a production Next build.
- `npm run test:mock-recall:contract` starts a production Next server and runs the MockRecall smoke check.
- `npm run test:exception-review:patch` runs the focused fixture-only exception-review PATCH test with Node's built-in type stripping.
- `.github/workflows/contract-gate.yml` runs `npm ci`, `npm run api:check`, `npm run typecheck`, `npm run build`, `npm run test:mock-recall:contract`, and `npm run test:exception-review:patch` on push and pull request events.

## Test Files

- `tests/mock-recall-contract-smoke.mjs` verifies the current MockRecall contract fixture and missing-resource Problem Details behavior against a production Next server.
- `tests/exception-review-patch.test.ts` verifies the fixture-only exception-review PATCH path directly.
- No test runner such as Vitest, Jest, Playwright, or Cypress is configured in `package.json`.
- Node may print experimental type-stripping and module-type warnings while running the direct TypeScript exception-review PATCH test; that warning posture is accepted for the current no-test-runner fixture gate.
- Earlier runtime verification is captured in operational delta reports; current MockRecall fixture and not-found behavior are protected by the committed smoke check.

## Verified Runtime Behavior

- Fixture detail returns 200 JSON for `contract-fixture-ready-for-review`.
- Fixture packet returns 200 `text/csv` for `contract-fixture-ready-for-review/packet.csv`.
- Packet CSV bytes are pinned exactly, including CRLF line endings and trailing line.
- Missing mock recall detail returns 404 `application/problem+json`.
- Missing packet CSV returns 404 `application/problem+json`, not `text/csv`.
- Problem Details include `type`, `title`, `status`, `detail`, and `instance`.
- The smoke check also asserts the packet CSV does not include disallowed compliance/legal/FDA-endorsement language.
- The focused exception-review PATCH test asserts missing/unknown auth returns 401, non-reviewer returns 403, cross-tenant reviewer receives leak-safe 404, invalid inputs return 422, same idempotency key replays the stored response, mismatched idempotency fingerprints return 409, and accepted updates append one in-memory fixture audit event.

## Contract Verification Evidence

- `ops/deltas/0027-mock-recall-record-source-of-truth.md` records the fixture-to-CSV projection refactor with byte-identical behavior.
- `ops/deltas/0028-problem-details-catalog-structure.md` records the named Problem catalog refactor with byte-identical behavior.
- `ops/deltas/0029-boundary-skeleton.md` records the request-boundary skeleton and full gate passing with the smoke test unedited.
- `ops/deltas/0031-phase-3-first-mutating-write-design.md` records docs-only design validation, including empty protected-path diffs and full gate passing.
- `ops/deltas/0034-exception-review-patch-fixture-activation.md` records the fixture-only exception-review PATCH activation and its focused direct test passing.

## Testing Gaps

- No broad unit, integration, or end-to-end test framework is configured.
- No tests exercise `lib/api/problem.ts` directly outside route behavior.
- No tests exercise dormant unauthorized/forbidden branches, because the public fixture policy allows the current read actions.
- Production idempotency storage, persisted audit, provider wiring, and non-public tenant enforcement are not operational and have no production-path tests yet.
- No storage-backed or production positive runtime path exists yet for `MockRecallDetail` or CSV packet generation.
- No tests cover contracted lots, events, exceptions, supplier requests, or mock recall creation routes, because those routes do not exist at runtime yet.

## Recommended Next Testing Steps

- Keep the CI contract gate aligned with existing package scripts as contract checks evolve.
- In a separate approved batch, decide whether to replace the experimental Node type-stripping command with a stable test strategy.
- Add route-handler or service tests only when the repo explicitly approves a test framework or a narrow no-framework test strategy.
- Keep runtime success expansion tests deferred until storage or a deliberate fixture strategy exists.
- Continue documenting verification commands in `ops/deltas/` for every micro-batch.
