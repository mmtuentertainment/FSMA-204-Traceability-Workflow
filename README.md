# FSMA 204 Workflow Product

Conservative FSMA 204 traceability readiness workflow. This product should help teams prepare, review, and export traceability records; it must not claim compliance certification, provide legal advice, imply FDA endorsement, or automate exemption determinations.

## Stack

- Next.js App Router
- TypeScript
- npm
- Node.js >= 22.6

## Current State

- OpenAPI remains the source of truth at `api/openapi.yaml`.
- Generated TypeScript contract types exist at `lib/api/generated/openapi-types.ts`.
- Mock-recall detail and packet routes include one OpenAPI-declared contract fixture plus `application/problem+json` not-found behavior for unknown mock recalls.
- MockRecall OpenAPI examples were reviewed against the fixture and missing-resource behavior; no OpenAPI repair was needed.
- The fixture is for contract/runtime smoke checks only; no persisted mock-recall records or production CSV generation workflow exists yet.
- `PATCH /api/traceability/exceptions/{exceptionId}` has the first approved fixture-backed mutating write: local/test fixture auth, server-derived fixture tenant identity, deny-by-default reviewer RBAC, an in-memory fixture exception repository, idempotency replay/conflict handling, and append-only in-memory fixture audit evidence.
- No database, production auth provider, production tenant model, production RBAC provider, persisted audit log, persisted traceability records, imports, exports, supplier workflow, lot/event workflow, or production CSV generation exists yet.
- Phase 1 and Phase 2 are complete. Phase 3 has started but is not complete; the approved activation remains limited to the exception-review PATCH only.

## Setup and Checks

```powershell
npm ci
npm run api:check
npm run typecheck
npm run build
npm run test:mock-recall:contract
npm run test:exception-review:patch
```

`npm run api:check` wraps the component contract commands `npm run api:lint` and `npm run api:types:check`.
`npm run test:exception-review:patch` runs the fixture-only exception-review PATCH focused test with Node's built-in type stripping. Node may print the current experimental type-stripping and module-type warnings; those warnings are expected for this no-test-runner fixture gate.
