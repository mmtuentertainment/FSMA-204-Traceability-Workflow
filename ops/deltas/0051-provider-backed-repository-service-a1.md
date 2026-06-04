# Batch 51 - Provider-Backed Repository/Service A1

## Summary

Implements the first provider-backed repository/service test slice for the exception-review PATCH activation path without wiring the live route. The slice adds the approved T3 idempotency resource-scope migration, repairs stale Drizzle metadata that otherwise generated unrelated audit DDL, adds a non-route provider-backed repository/service spine, and adds focused provider-backed tests against a real PostgreSQL test database.

This is still a repository/service test slice. It does not activate production route behavior, does not import the DB client from any route, and does not change the fixture-backed PATCH route.

## Files Changed

- `lib/db/migrations/meta/0000_snapshot.json` - metadata-only repair: `audit_events.reason` marked nullable to match the existing `0000` SQL and current schema.
- `lib/db/schema.ts` - adds `idempotency_records.resource_type` and `idempotency_records.resource_id`; rescopes the idempotency unique constraint to tenant, operation, resource type, resource id, and idempotency key.
- `lib/db/migrations/0001_idempotency_resource_scope.sql` - generated Drizzle migration for the T3 resource-scope change only.
- `lib/db/migrations/meta/0001_snapshot.json` and `lib/db/migrations/meta/_journal.json` - generated Drizzle migration metadata for `0001`.
- `lib/db/exception-review-provider.ts` - non-route provider-backed repository/service module for tenant membership lookup, tenant-scoped exception update, idempotency reserve/replay/conflict/in-flight/reclaim, and audit append.
- `tests/db/exception-review-provider-a1.test.ts` - focused provider-backed Batch A1 test slice using `node --experimental-strip-types` against an explicit `TEST_DATABASE_URL`.
- `ops/deltas/0051-provider-backed-repository-service-a1.md` - this report.
- `INTEL.md` - local-only consultant intel refreshed; remains untracked and unstaged.

## Contract And Runtime Impact

No OpenAPI contract change. `api/openapi.yaml` remains the source of truth and is unchanged.

No live route wiring was added. `app/api/traceability/exceptions/[exceptionId]/route.ts` remains fixture-backed and continues to use local/test fixture auth, server-derived fixture tenant identity, fixture RBAC, in-memory fixture state, in-memory idempotency replay/conflict, and in-memory audit evidence. No route imports `lib/db/client.ts` or `lib/db/exception-review-provider.ts`.

The new provider-backed code is directly exercised by tests only. It is suitable for the future route boundary but is not wired into the route in this batch.

## Schema And Migration Impact

T3 idempotency resource-scope change:

- Adds `idempotency_records.resource_type text NOT NULL`.
- Adds `idempotency_records.resource_id text NOT NULL`.
- Drops `idempotency_records_tenant_operation_key_unique`.
- Adds `idempotency_records_tenant_operation_resource_key_unique` over `tenant_id`, `operation`, `resource_type`, `resource_id`, and `idempotency_key`.

The regenerated `0001` migration contains only this idempotency DDL:

```sql
ALTER TABLE "idempotency_records" DROP CONSTRAINT "idempotency_records_tenant_operation_key_unique";--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "resource_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "resource_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_operation_resource_key_unique" UNIQUE("tenant_id","operation","resource_type","resource_id","idempotency_key");
```

Metadata repair:

- `lib/db/migrations/meta/0000_snapshot.json` now marks `audit_events.reason` as nullable.
- This matches the existing `0000_postgres_exception_review_foundation.sql`, where `reason` was already nullable, and the current `lib/db/schema.ts`.
- This repair prevented Drizzle from generating the unrelated `ALTER TABLE "audit_events" ALTER COLUMN "reason" DROP NOT NULL;` DDL in `0001`.

No `rate_limit` table was added. No `prior_state` or `next_state` audit columns were added.

## Repository/Service Implementation

`lib/db/exception-review-provider.ts` adds direct provider-backed functions:

- `getActiveTenantMembership` - tenant-scoped active membership lookup by server-resolved tenant and authenticated subject.
- `applyTenantScopedExceptionReview` - tenant-scoped exception update requiring `tenant_id` and exception id, with server attribution and source-document reference support.
- `reserveIdempotencyRecord` - `INSERT ... ON CONFLICT DO NOTHING`, followed by `SELECT ... FOR UPDATE` for replay/conflict/in-flight/expired-reclaim decisions.
- `completeIdempotencyRecord` - completion snapshot with allowlisted replay headers and audit FK.
- `appendExceptionReviewAuditEvent` - append-only insert into `audit_events` using `action = exception.review.update`, `resource_type = traceability_exception`, and `resource_id = persisted exception id`.
- `reviewTraceabilityExceptionWithProvider` and `reviewTraceabilityExceptionInTransaction` - deterministic service outcomes for accepted, replayed, conflict, in-flight, forbidden, not-found, and validation-error paths.

Resource scoping is:

- `operation = exception.review.update`
- `resource_type = traceability_exception`
- `resource_id = persisted exception id`

Free-form notes are not the only evidence trail: the service stores source-document references and audit metadata carries structured status/reason/source-reference fields while omitting raw review notes.

## Tests Added

`tests/db/exception-review-provider-a1.test.ts` covers 12 focused A1 cases:

1. Tenant membership lookup accepts an active authorized tenant member.
2. Tenant membership lookup rejects non-member and wrong-tenant access.
3. Tenant-scoped exception update cannot update another tenant's exception.
4. Successful update writes allowed review and source-reference fields.
5. First idempotency request reserves and completes.
6. Exact replay with same resource and request hash returns stored result.
7. Same idempotency key with different request hash returns conflict.
8. Same idempotency key on a different resource does not collide after T3.
9. In-flight duplicate returns the approved in-flight outcome.
10. Expired in-flight record can be reclaimed in place.
11. Accepted update appends audit event with structured evidence metadata.
12. Rate-limit persistence and route wiring remain absent in A1.

The provider-backed test requires an explicit `TEST_DATABASE_URL` whose database name looks like a test database. During local verification, a disposable `postgres:16-alpine` Docker container was used, migrations were applied with Drizzle, and the container was removed after the test.

## Verification Commands And Results

- `npm ci` - passed on rerun with a longer timeout; npm reported the pre-existing 6 moderate audit findings.
- `npm run api:check` - passed; Redocly reported the API description is valid and generated types matched.
- `npm run db:check` - passed; Drizzle migration check reported "Everything's fine" and the DB client import-safety check passed without `DATABASE_URL`.
- `npm run typecheck` - passed.
- `npm run build` - passed; Next.js built successfully and listed the existing dynamic API routes.
- `npm run test:exception-review:patch` - passed; all 13 fixture PATCH focused cases passed.
- `npm run test:mock-recall:contract` - passed; MockRecall contract smoke check passed.
- Disposable provider-backed DB setup:
  - `npx drizzle-kit migrate --config drizzle.config.ts` - passed against the disposable test Postgres database.
  - `node --experimental-strip-types tests/db/exception-review-provider-a1.test.ts` - passed all 12 A1 provider-backed cases.

Node printed the existing experimental type-stripping and typeless-package warnings for TypeScript test files; no package metadata was changed in this batch.

## Remaining Batch A Inventory Not Covered By A1

A1 is the first repository/service slice, not the full Batch A acceptance denominator from Batch 50. Remaining provider-backed Batch A work includes:

- The broader 107-case matrix from the Batch 50 approval packet.
- A committed package script and provider-backed CI job, if Matt approves that wiring later.
- Full role/check-constraint matrix coverage for tenant memberships.
- Full tenant-scoped exception-update matrix, including every enum and partial-patch case.
- Multi-connection concurrency proof for competing idempotency reservations.
- Forced-fault transaction rollback proofs for update, audit append, and idempotency completion.
- Full audit append-only surface/non-enforcement documentation tests.
- Full T4 redaction matrix.
- Service-level fixed-window rate-limit posture tests with injected clock/store.
- Batch B runtime hardening and live PATCH activation remain gated until Batch A is accepted.

## Rollback Path

Before any environment applies `0001`, rollback is to delete:

- `lib/db/exception-review-provider.ts`
- `tests/db/exception-review-provider-a1.test.ts`
- `lib/db/migrations/0001_idempotency_resource_scope.sql`
- `lib/db/migrations/meta/0001_snapshot.json`
- `ops/deltas/0051-provider-backed-repository-service-a1.md`

Then remove the idx-1 entry from `lib/db/migrations/meta/_journal.json`, remove `resourceType`/`resourceId` and the widened unique constraint from `lib/db/schema.ts`, and restore `lib/db/migrations/meta/0000_snapshot.json` only if Matt decides to reintroduce the known stale snapshot drift.

If `0001` has already been applied anywhere, use a forward-repair migration rather than a destructive rollback.
