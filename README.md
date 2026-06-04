# FSMA 204 Workflow Product

Conservative FSMA 204 traceability readiness workflow. This product should help teams prepare, review, and export traceability records; it must not claim compliance certification, provide legal advice, imply FDA endorsement, or automate exemption determinations.

## Stack

- Next.js App Router
- TypeScript
- npm
- Node.js >= 22.6
- PostgreSQL + Drizzle schema/migration tooling and a lazy runtime client seam for the future provider foundation only

## Current State

- OpenAPI remains the source of truth at `api/openapi.yaml`.
- Generated TypeScript contract types exist at `lib/api/generated/openapi-types.ts`.
- Mock-recall detail and packet routes include one OpenAPI-declared contract fixture plus `application/problem+json` not-found behavior for unknown mock recalls.
- MockRecall OpenAPI examples were reviewed against the fixture and missing-resource behavior; no OpenAPI repair was needed.
- The fixture is for contract/runtime smoke checks only; no persisted mock-recall records or production CSV generation workflow exists yet.
- `PATCH /api/traceability/exceptions/{exceptionId}` has the first approved fixture-backed mutating write: local/test fixture auth, server-derived fixture tenant identity, deny-by-default reviewer RBAC, an in-memory fixture exception repository, idempotency replay/conflict handling, and append-only in-memory fixture audit evidence.
- A PostgreSQL + Drizzle schema/migration foundation and lazy runtime client seam exist for the future exception-review PATCH provider path, but no route-wired database connection, production auth provider, runtime tenant provider, production RBAC provider, persisted audit enforcement, runtime persisted traceability records, imports, exports, supplier workflow, lot/event workflow, or production CSV generation exists yet.
- Batch 48 adds a docs-only provider-activation minimum-decision approval packet for the future exception-review PATCH provider implementation; it consolidates the required pre-code decisions and does not change runtime behavior or activate the route.
- Batch 49 tightens those decisions into explicit pre-code gates (T1-T9), and Batch 50 adds a docs-only approval packet that resolves the T3 idempotency resource-scope decision and scopes the next code batch (Batch A): provider-backed repository/service tests against a real PostgreSQL test database, with no live route wiring. Runtime hardening and PATCH activation (Batch B) remain gated until that test slice is accepted.
- Phase 1 and Phase 2 are complete. Phase 3 has started but is not complete; the approved activation remains limited to the exception-review PATCH only.

## Setup and Checks

```powershell
npm ci
npm run api:check
npm run db:check
npm run typecheck
npm run build
npm run test:mock-recall:contract
npm run test:exception-review:patch
npm run test:db-client:import
```

`npm run api:check` wraps the component contract commands `npm run api:lint` and `npm run api:types:check`.
`npm run db:check` validates the Drizzle migration metadata and the DB client import-safety check without requiring a live database. `drizzle.config.ts` reads `DATABASE_URL` when provided and otherwise uses a credential-free local fallback URL; the baseline typecheck and build do not require a live database URL.
The GitHub Actions contract gate mirrors the local check sequence, including `npm run db:check`.
`npm run test:db-client:import` verifies the runtime DB client seam can be imported without `DATABASE_URL`; the seam throws for missing configuration only when a DB client is requested.
`npm run test:exception-review:patch` runs the fixture-only exception-review PATCH focused test with Node's built-in type stripping. Node may print the current experimental type-stripping and module-type warnings; those warnings are expected for this no-test-runner fixture gate.
