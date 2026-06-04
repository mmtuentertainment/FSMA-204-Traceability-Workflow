# Batch 44 - DB Check CI Gate

## Summary

Adds `npm run db:check` to the existing GitHub Actions contract gate so the Batch 43 PostgreSQL and Drizzle schema/migration foundation is protected by CI.

This is a CI/docs/delta guardrail only. It does not change runtime route behavior, OpenAPI, generated OpenAPI types, Drizzle schema, SQL migrations, dependencies, package scripts, or database connectivity.

## Files Changed

- `.github/workflows/contract-gate.yml`
- `README.md`
- `.planning/HANDOFF.json`
- `ops/memory/product.md`
- `ops/deltas/0044-db-check-ci-gate.md`

## Contract And Runtime Impact

None. `api/openapi.yaml` remains the API source of truth and was not edited. Generated OpenAPI types, `app/api`, `lib/db/schema.ts`, migrations, package files, tests, and `tsconfig.json` were not edited.

`npm run db:check` uses Drizzle migration metadata and does not require a live `DATABASE_URL` in CI or local baseline validation.

## Non-Goals

- No exception-review PATCH activation.
- No schema or SQL migration changes.
- No PostgreSQL runtime driver.
- No Auth.js runtime integration.
- No login UI, middleware, dashboard, supplier portal, imports, exports, production CSV generation, or broader workflow logic.
- No compliance certification, legal advice, FDA approval, FDA endorsement, or automated exemption determination claims.

## Verification Commands And Results

- `npm ci` - passed; npm reported 6 moderate audit findings and transitive `@esbuild-kit/*` deprecation warnings, not fixed in this batch.
- `npm run api:check` - passed.
- `npm run db:check` - passed; Drizzle read `drizzle.config.ts` and reported the migration metadata was fine without a live database.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed; Node printed the known experimental type-stripping and typeless package/module warnings.
- `git diff --check` - passed.
- `git diff --cached --check` - passed after staging only the intended files.

## Rollback Path

Remove the `npm run db:check` step from `.github/workflows/contract-gate.yml` and remove the Batch 44 wording from `README.md`, `.planning/HANDOFF.json`, and `ops/memory/product.md`.

No runtime route, OpenAPI, generated type, schema, migration, dependency, package, or database rollback is needed.

## Next Smallest Useful Micro-Batch

Add provider-backed service/repository tests for tenant membership lookup, deny-by-default role checks, durable idempotency replay/conflict behavior, and append-only audit writes without wiring the live exception-review route to the database.
