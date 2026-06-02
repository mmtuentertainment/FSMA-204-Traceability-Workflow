# Batch 39 - PR #10 CodeRabbit Repairs

## Summary

Small follow-up repair batch for PR #10 CodeRabbit findings. This keeps the exception-review PATCH fixture-only and avoids broad production workflow expansion.

This batch:

- fences fixture bearer-token auth so fixture tokens cannot authorize requests when `NODE_ENV === "production"`;
- replaces raw pipe-delimited idempotency scope serialization with deterministic structured serialization;
- adds focused tests for the production fixture-auth fence and pipe-character idempotency key collision safety;
- hardens Problem Details response header handling for all supported `HeadersInit` forms;
- fixes stale codebase-map CI/testing truth surfaces;
- fixes the Batch 36 `.planning/HANDOFF.json` contradiction.

## Files Changed

- `lib/security/request-context.ts`
- `lib/security/idempotency-audit.ts`
- `lib/api/problem.ts`
- `tests/exception-review-patch.test.ts`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/STRUCTURE.md`
- `ops/deltas/0036-current-state-reconciliation.md`
- `ops/deltas/0039-pr10-coderabbit-repairs.md`

## CodeRabbit Finding Disposition

- Fixed: stale `.planning/codebase/CONCERNS.md` testing-gap note now lists the current baseline gate, including `npm run test:exception-review:patch`.
- Fixed: stale `.planning/codebase/STRUCTURE.md` statement now says the exception-review PATCH test is wired into package scripts and CI.
- Deferred: the atomic reserve/commit idempotency-store rewrite and full HTTP response snapshot storage are not a small fixture repair. They require a response snapshot schema, in-flight duplicate semantics, release/error handling, and durable provider decisions. This remains a production-provider blocker.
- Fixed: `FixtureIdempotencyStore` scope keys now use structured JSON serialization instead of raw `|` delimiters, with a focused collision regression test.
- Fixed: `fixtureAuthContextResolver` now disables fixture-token authorization in production runtime and returns the existing 401 Problem Details path.
- Fixed: `ops/deltas/0036-current-state-reconciliation.md` no longer lists `.planning/HANDOFF.json` as both changed and unchanged.
- Fixed: `problemResponse` now normalizes `HeadersInit` with `new Headers()` before enforcing `Content-Type: application/problem+json`.
- Fixed: `assertProblem` now supports an explicit expected `instance`, with a variable exception-ID 404 test.
- Fixed: the idempotency replay/conflict test-order dependency is documented in the test file.

## Deferred Atomic Idempotency Review

The current in-memory fixture store still exposes the existing `check()` then `storeSuccess()` API. Replacing it with an atomic reserve/commit API would touch the public idempotency seam, route control flow, replay response shape, and failure cleanup behavior. That is larger than this CodeRabbit repair batch.

The production safety risk is fenced by this batch because fixture bearer tokens cannot authorize the PATCH path in production runtime. Durable idempotency, exact response replay snapshots, and in-flight duplicate handling remain required before any production write provider is activated.

## Contract Impact

None. `api/openapi.yaml` and `lib/api/generated/openapi-types.ts` were not edited.

## Runtime Impact

Production runtime now denies the fixture-token PATCH path with the existing 401 Problem Details response. Non-production fixture behavior remains scoped to the approved exception-review PATCH path.

The fixture idempotency store no longer has raw delimiter collisions when caller-controlled idempotency keys contain `|`.

## Package / CI Impact

None. No dependency, package script, lockfile, or CI workflow change was made.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - PASS; branch is `review/phase-3-batches-32-35...origin/review/phase-3-batches-32-35`, intended repair files are modified, and local-only `.audit/` plus `INTEL.md` remain untracked.
- `npm ci` - PASS; added/audited 229 packages and reported the known 2 moderate npm audit findings.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS after the test helper was adjusted to mutate `NODE_ENV` via `Reflect.set` instead of direct assignment.
- `npm run build` - PASS; Next.js production build completed.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `npm run test:exception-review:patch` - PASS; all 13 focused checks passed. Node printed the expected experimental type-stripping and module-type warnings.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff --name-only` - PASS; tracked diffs are limited to the intended repair files. The new Batch 39 delta is untracked until staging.
- `git diff -- api/openapi.yaml lib/api/generated/openapi-types.ts package.json package-lock.json .github` - PASS; no protected contract/generated/package/workflow diffs.

## Rollback Path

Revert the files listed in "Files Changed" for this batch. No OpenAPI contract, generated type, dependency, lockfile, database, production auth provider, production tenant model, production RBAC provider, persisted audit log, import/export workflow, or production CSV generation rollback is needed.
