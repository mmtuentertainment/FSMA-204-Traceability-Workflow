# Batch 48 - Provider Activation Minimum Decision Packet

## Summary

Adds a docs-only approval packet that consolidates the minimum provider-activation decisions required before any code-bearing implementation of `PATCH /api/traceability/exceptions/{exceptionId}`.

This batch does not change runtime, API, generated type, schema, migration, persistence, dependency, or CI behavior. No route is wired or activated, no Postgres connection reaches a runtime route, and no auth, RBAC, idempotency storage, audit storage, repository logic, tenant persistence, imports, exports, or production CSV generation is implemented. The exception-review PATCH remains fixture-only.

## Files Changed

- `.planning/phase-3-provider-activation-minimum-decisions.md`
- `README.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0048-provider-activation-minimum-decision-packet.md`

## Decision Recorded

The packet states the minimum settled position for each of the nine pre-code decisions and points each to its source of record (Batches 35, 40, 41, 42, 45) rather than re-deriving rationale:

- **Auth source:** Auth.js database-backed sessions; server-verified before persistence; fixture bearer tokens are test-only and production-fenced; `401` Problem Details on missing/invalid auth.
- **Server-derived tenant identity:** tenant from server-side auth/session plus PostgreSQL `tenant_memberships` only; client body/query/route/header/metadata never authoritative; leak-safe `404`.
- **RBAC decision point:** deny-by-default action RBAC before persistence; `tenant_admin` and `quality_reviewer` may perform `exception.review.update`; `read_only` may not; unknown roles/actions deny.
- **Postgres persistence boundary:** PostgreSQL plus Drizzle behind route -> service -> repository; tenant-scoped methods; forward-only migrations in the approved code batch; the existing lazy client seam (`lib/db/client.ts`) is not route-wired.
- **Idempotency storage:** PostgreSQL idempotency table; required `Idempotency-Key`; uniqueness on tenant + operation + key; reserve fresh, replay completed same-hash snapshot, `409` on hash mismatch.
- **Append-only / audit-backed transition evidence:** append-only `audit_events`, one event per accepted transition, no update/delete path, no regulatory-retention or compliance claim.
- **Problem Details behavior:** RFC 9457 for `401`, `403`, leak-safe `404`, `409`, `422`, and applicable `429`; preserve the declared OpenAPI taxonomy; `422` for invalid input.
- **429 Retry-After behavior:** PostgreSQL fixed-window limiter enforced before the transition; `429` Problem Details with `Retry-After`; smallest approved migration only if limiter schema is missing.
- **Rollback path:** docs rollback deletes the packet and this delta and removes the additive pointers; the future code batch must name its rollback before code starts.

The packet is explicitly an approval packet, not implementation. It includes a non-activation statement and a decision-readiness checklist gating future code behind explicit Matt approval and passing provider-backed tests.

## Protected Surfaces (No Changes)

No changes were made to:

- `app/api`
- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/db/schema.ts`
- `lib/db/migrations`
- `package.json`
- `package-lock.json`
- `.github`
- `tsconfig.json`
- runtime route files

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the API source of truth. The current `PATCH /api/traceability/exceptions/{exceptionId}` remains fixture-only with local/test fixture auth, server-derived fixture tenant identity, fixture reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and append-only in-memory audit evidence.

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed; Redocly reported the description valid and `openapi-typescript --check` confirmed generated types match the contract.
- `npm run db:check` - passed; Drizzle migration metadata validated and the DB client import-safety check passed without `DATABASE_URL`.
- `npm run typecheck` - passed.
- `npm run build` - passed without `DATABASE_URL`.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; all focused fixture cases passed, and Node printed the known experimental type-stripping and typeless package/module warnings.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Delete `.planning/phase-3-provider-activation-minimum-decisions.md` and `ops/deltas/0048-provider-activation-minimum-decision-packet.md`, then remove the additive Batch 48 wording and pointers from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No runtime route, OpenAPI, generated type, DB schema, migration, package, test, CI, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.

## Next Smallest Useful Batch

Add provider-backed repository/service tests for tenant membership lookup, tenant-scoped exception update, idempotency replay/conflict, append-only audit append, and rate limiting, without wiring the live exception-review route to the database, after Matt approves the exact code scope, dependency changes, migration scope, validation commands, rollout path, and rollback path.
