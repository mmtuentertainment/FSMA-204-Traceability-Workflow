# Batch 46 - PostgreSQL Runtime Client Seam

## Summary

Adds the smallest PostgreSQL runtime connection seam needed for future Drizzle-backed repositories on the approved exception-review PATCH activation path.

This batch does not wire any route, implement the PATCH write, add auth/RBAC/idempotency/audit/repository business logic, change schema or migrations, or require a live `DATABASE_URL` for build, typecheck, or tests.

## Files Changed

- `package.json`
- `package-lock.json`
- `lib/db/client.ts`
- `tests/db-client-import.test.ts`
- `README.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0046-postgres-runtime-client-seam.md`

## Dependencies Added

- `pg`: runtime PostgreSQL driver required for Drizzle's `drizzle-orm/node-postgres` path.
- `@types/pg`: TypeScript declarations for the `pg` runtime driver.

No `dotenv`, `tsx`, PostgreSQL adapter beyond `pg`, auth provider, or unrelated dependency was added.

## Client Seam

`lib/db/client.ts` exposes:

- `createDbClient(options?)`
- `getDb()`
- `closeDbClient(client?)`
- `DbClient`, `DbClientOptions`, and `DbSchema` types

The module imports without reading or requiring `DATABASE_URL`. It throws a clear `DATABASE_URL` configuration error only when a DB client is requested without a connection string. Creating the `pg` Pool is still lazy and no route imports or calls the seam in this batch.

## Contract And Runtime Impact

None. `app/api`, `api/openapi.yaml`, generated OpenAPI types, `lib/db/schema.ts`, existing migrations, package scripts, CI, and existing fixture runtime behavior were not changed.

The current exception-review PATCH remains fixture-only with local/test fixture auth, server-derived fixture tenant identity, fixture reviewer RBAC, in-memory fixture state, in-memory idempotency replay/conflict handling, and in-memory audit evidence.

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed.
- `npm run db:check` - passed; Drizzle read `drizzle.config.ts` and reported the migration metadata was fine without a live database.
- `npm run typecheck` - passed.
- `npm run build` - passed without `DATABASE_URL`.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; Node printed the known experimental type-stripping and typeless package/module warnings.
- `node --experimental-strip-types tests/db-client-import.test.ts` - passed; importing the DB client seam did not require `DATABASE_URL`, and requesting a client without configuration threw the expected clear error.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Remove `pg` and `@types/pg` from `package.json`, regenerate `package-lock.json` with npm, delete `lib/db/client.ts`, delete `tests/db-client-import.test.ts`, and remove the Batch 46 wording from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No runtime route, OpenAPI, generated type, schema, migration, CI, auth, RBAC, idempotency, audit, or repository rollback is needed.

## Next Smallest Repository/Service Batch

Add provider-backed repository/service tests for tenant membership lookup, tenant-scoped exception update, idempotency replay/conflict, append-only audit append, and rate limiting without wiring the live exception-review route to the database until Matt approves that exact implementation scope.
