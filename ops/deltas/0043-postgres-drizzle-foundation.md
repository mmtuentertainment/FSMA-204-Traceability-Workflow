# Batch 43 - PostgreSQL Drizzle Foundation

## Summary

Adds the minimal PostgreSQL and Drizzle persistence foundation for a future production-like exception-review PATCH activation batch. This is schema, migration, and tooling only.

No route wiring, production database connection, Auth.js integration, middleware, UI, generated OpenAPI type edit, fixture semantic change, production CSV, import, supplier portal, broader workflow logic, legal advice, FDA endorsement, or compliance certification behavior was added.

## Files Changed

- `package.json`
- `package-lock.json`
- `README.md`
- `drizzle.config.ts`
- `lib/db/schema.ts`
- `lib/db/migrations/0000_postgres_exception_review_foundation.sql`
- `lib/db/migrations/meta/_journal.json`
- `lib/db/migrations/meta/0000_snapshot.json`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0043-postgres-drizzle-foundation.md`

`api/openapi.yaml`, generated OpenAPI types, runtime routes, fixtures, tests, `.audit/*`, and `INTEL.md` were not edited.

## Dependencies Added

- `drizzle-orm`: typed schema definitions for PostgreSQL-backed provider scaffolding.
- `drizzle-kit`: migration/tooling support through `drizzle.config.ts` and `npm run db:check`.

No PostgreSQL runtime driver was added because this batch does not create a live database connection or activate route persistence.

## Schema And Migration Scope

- `tenant_memberships`: server-derived tenant membership foundation with `tenant_admin`, `quality_reviewer`, and `read_only` roles, unique tenant/subject membership, timestamps, and inactive marker.
- `traceability_exceptions`: tenant-scoped exception records aligned to the current OpenAPI exception-review PATCH contract statuses/reasons, with review fields for a later provider-backed PATCH batch.
- `idempotency_records`: durable idempotency foundation with tenant + operation + key uniqueness, request hash, lifecycle state, replay snapshot fields, optional audit event reference, and expiration.
- `audit_events`: append-only audit evidence foundation for accepted transitions, including tenant, actor, action, resource, source, reason, metadata, and creation timestamp.

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the source of truth and was not edited. The existing exception-review PATCH runtime remains fixture-only and local/test scoped.

`DATABASE_URL` is read only by Drizzle tooling configuration. The local fallback URL is credential-free. Baseline `npm run typecheck` and `npm run build` do not require a live database URL.

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed.
- `npm run typecheck` - passed.
- `npm run build` - initially exposed a stale `.next` build-cache module-resolution error; after removing the ignored `.next` artifact, passed without a live `DATABASE_URL`.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; Node printed the known experimental type-stripping and typeless package/module warnings.
- `npm run db:check` - passed; Drizzle read `drizzle.config.ts` and reported the migration metadata was fine.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Remove the Drizzle dependencies and `db:check` script from `package.json`, regenerate `package-lock.json`, delete `drizzle.config.ts`, delete `lib/db/`, and remove the additive Batch 43 entries from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No runtime route, API contract, generated type, fixture, test, Auth.js, middleware, UI, production CSV, import/export, supplier workflow, or hosted database rollback is needed.

## Next Smallest Useful Micro-Batch

Add provider-backed service/repository tests around tenant membership lookup, deny-by-default role checks, durable idempotency replay/conflict behavior, and append-only audit writes without wiring the live route to the database.
