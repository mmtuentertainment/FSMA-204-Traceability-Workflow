# Batch 50 - Provider-Backed Repository/Service Test Approval Packet

## Summary

Adds a docs-only approval packet that resolves the Batch 49 **T3** idempotency resource-scope decision and scopes the next code batch ("Batch A"): provider-backed repository/service tests for the exception-review path, run against a real PostgreSQL test database, **without wiring the live route**. It also records the migration scope, test infrastructure, and rate-limit test scope for that slice, and establishes the hard gate that runtime-hardening "Batch B" must wait until Batch A's test slice is implemented, green, and accepted.

This batch is docs/planning only. It changes no runtime, OpenAPI, generated-type, schema, migration, persistence, dependency, package, or CI artifact. No route is wired or activated, no Postgres connection reaches a runtime route, and no auth, RBAC, idempotency storage, audit storage, repository/service logic, tenant persistence, rate-limit code, imports, exports, or production CSV generation is implemented. The exception-review PATCH remains fixture-only.

## Files Changed

- `.planning/phase-3-provider-backed-repository-service-test-approval.md` (new approval packet)
- `README.md` (additive Batch 49/50 pointer)
- `.planning/HANDOFF.json` (additive planning-artifact pointers, current-state summary, next-action update, status/version/timestamp bump)
- `ops/memory/product.md` (additive Batch 49/50 pointers)
- `INTEL.md` (local, untracked consultant intel; SHA/branch tracking updated to `d51d02e` and immediate-decision/next-micro-batch sections refreshed; not staged)
- `ops/deltas/0050-provider-backed-repository-service-test-approval.md` (this delta)

## Decision Recorded

The packet resolves the one Batch 49 tightening that was left as a gated schema decision and fixes the scope for the next code batch:

- **T3 idempotency resource-scope (resolved):** adopt option (b) — add `resource_type` + `resource_id` `text NOT NULL` columns to `idempotency_records` and rescope uniqueness to `(tenant_id, operation, resource_type, resource_id, idempotency_key)` via exactly one forward-only migration (`0001_idempotency_resource_scope.sql`). This mirrors `audit_events.resource_type`/`resource_id`, aligns the persisted table with the already-resource-scoped `IdempotencyScope`/`scopeKey` seam, keeps `operation` a pure action verb, and closes the cross-resource collision. The exact `schema.ts` change and migration SQL are recorded as the approved target (applied in Batch A, not now).
- **Migration scope (Batch A):** the T3 migration is the only schema/migration change permitted. No `rate_limit` table and no dedicated prior/next-state columns (deferred to Batch B per T8; prior/next state stay in `audit_events.metadata` jsonb).
- **Test infrastructure (Batch A):** zero new dependencies — a GitHub Actions `services: postgres` container in a new CI job, `drizzle-kit migrate` against a fenced `TEST_DATABASE_URL`, per-test `BEGIN/ROLLBACK` isolation (with a documented `TRUNCATE` opt-out for multi-connection concurrency cases), and the existing `node --experimental-strip-types` + `node:assert/strict` harness. New `tests/db/*` files, package scripts, and the CI job are gated Batch A additions.
- **Rate-limit scope (Batch A):** posture-only at the service level via an injected deterministic clock + in-memory fixed-window store; the persistent `rate_limit` table and live enforcement are deferred to Batch B. A `rateLimited` Problem-catalog entry/builder in `lib/api/problem.ts` is flagged as the minimal in-scope Problem-layer code (not an OpenAPI edit; the contract already declares `RateLimited`).
- **Test scope (Batch A):** provider-backed repository/service tests for the five named areas — tenant membership lookup, tenant-scoped exception update, idempotency reserve/replay/conflict (under the T2 protocol + T3 scope + T1 atomicity + T4 redaction), append-only audit append, and rate-limit posture — with explicit per-area minimum behaviors and acceptance criteria.
- **Batch A / Batch B gate:** Batch B (route wiring, live `DATABASE_URL`, T6 connection hardening, DB-level append-only/RLS, persistent rate limiting, PATCH success activation) must not start until Batch A's test slice is green and accepted.

The packet is explicitly an approval packet, not implementation. It includes a non-activation statement, a Batch A acceptance checklist, an allowed/forbidden file list, and a verification gate, all gating future code behind explicit Matt approval.

## Protected Surfaces (No Changes)

No changes were made to:

- `app/api`
- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/api/problem.ts`
- `lib/db/schema.ts`
- `lib/db/migrations`
- `lib/db/client.ts`
- `lib/security`
- `package.json`
- `package-lock.json`
- `.github`
- `tsconfig.json`
- `drizzle.config.ts`
- runtime route files
- test files

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the API source of truth. The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only with local/test fixture auth, server-derived fixture tenant identity, fixture reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and append-only in-memory audit evidence. The lazy client seam `lib/db/client.ts` remains import-safe and is called by no route. The packet's decisions are planning constraints that bind the future Batch A code; they do not enable, wire, or alter any runtime behavior.

## Verification Commands And Results

Full docs-only baseline gate run on 2026-06-02 (review branch `review/phase-3-batches-44-48`):

- `npm ci` - passed; npm reported pre-existing moderate audit findings (unchanged from prior batches; not fixed here).
- `npm run api:check` - passed (exit 0); Redocly reported "Your API description is valid" and `openapi-typescript --check` confirmed generated types match the contract.
- `npm run db:check` - passed (exit 0); `drizzle-kit check` reported "Everything's fine" and the DB client import-safety check passed without `DATABASE_URL`.
- `npm run typecheck` - passed (exit 0).
- `npm run build` - passed (exit 0); `next build` compiled and generated routes without `DATABASE_URL` (the client seam is never instantiated).
- `npm run test:mock-recall:contract` - passed; "MockRecall contract smoke check passed."
- `npm run test:exception-review:patch` - passed; all 13 focused fixture cases passed (Node printed the known experimental type-stripping and typeless-package warnings).
- `git --no-pager diff -- api/openapi.yaml app lib tests .github package.json package-lock.json tsconfig.json drizzle.config.ts` - empty (exit 0); no protected runtime/contract/code surface touched.
- `git diff --check` - passed; no whitespace errors.
- `node -e "JSON.parse(...HANDOFF.json...)"` - passed; `.planning/HANDOFF.json` is valid JSON after the additive edits.

All edits are markdown/JSON-doc only; none of these gate results can be affected by this batch, and all remain green.

## Rollback Path

Delete `.planning/phase-3-provider-backed-repository-service-test-approval.md` and `ops/deltas/0050-provider-backed-repository-service-test-approval.md`, then remove the additive Batch 50 wording and pointers from `README.md`, `.planning/HANDOFF.json`, `ops/memory/product.md`, and the local `INTEL.md`.

No runtime route, OpenAPI, generated type, DB schema, migration, package, test, CI, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.

## Next Smallest Useful Batch

Batch A: implement the single forward-only T3 migration (`0001_idempotency_resource_scope.sql`) plus provider-backed repository/service tests for tenant membership lookup, tenant-scoped exception update, idempotency reserve/replay/conflict (T2 protocol), append-only audit append, and rate-limit posture, run against a real PostgreSQL test database, **without wiring the live exception-review route**, after Matt approves the exact code scope, the allowed files, the single migration, the new package scripts and CI job, the validation commands, the rollout path, and the rollback path. Batch B (runtime hardening and PATCH activation) waits until Batch A's test slice is green and accepted.
