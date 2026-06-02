# Batch 47 - DB Client Import-Safety Gate

## Summary

Adds the Batch 46 PostgreSQL runtime client import-safety check to the normal DB validation path.

This batch does not change runtime behavior, wire routes to the database, implement exception-review PATCH persistence, add dependencies, change OpenAPI, change generated types, add schema or migrations, or implement auth/RBAC/idempotency/audit storage.

## Files Changed

- `package.json`
- `README.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0047-db-client-import-safety-gate.md`

## Package And CI Wiring

- Adds `npm run test:db-client:import` as the named script for `node --experimental-strip-types tests/db-client-import.test.ts`.
- Renames the raw Drizzle migration metadata check to `npm run db:migrations:check`.
- Makes `npm run db:check` run both `npm run db:migrations:check` and `npm run test:db-client:import`.
- Leaves `.github/workflows/contract-gate.yml` unchanged because the workflow already runs `npm run db:check`.

The DB client import-safety check remains valid without `DATABASE_URL`: importing `lib/db/client.ts` does not throw, and the seam throws for missing configuration only when a DB client is requested.

## Protected Surfaces

No changes were made to:

- `app/api`
- `api/openapi.yaml`
- `lib/api/generated/openapi-types.ts`
- `lib/db/schema.ts`
- `lib/db/migrations`
- `.github`
- runtime route files

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed.
- `npm run db:check` - passed; this ran both Drizzle migration metadata validation and `npm run test:db-client:import` without `DATABASE_URL`.
- `npm run typecheck` - passed.
- `npm run build` - passed without `DATABASE_URL`.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; Node printed the known experimental type-stripping and typeless package/module warnings.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Restore `package.json` so `npm run db:check` directly invokes `drizzle-kit check --config drizzle.config.ts`, remove the `test:db-client:import` and `db:migrations:check` scripts, and remove the Batch 47 truth-surface wording.

No runtime route, OpenAPI, generated type, schema, migration, dependency, auth, RBAC, idempotency, audit, or repository rollback is needed.
