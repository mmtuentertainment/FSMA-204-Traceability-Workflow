---
created: 2026-05-28
sources: repo
---

# Stack Research

## Current Stack

- Application framework: Next.js App Router.
- Language: TypeScript.
- Package manager: npm with committed `package-lock.json`.
- API contract: OpenAPI 3.1.0 in `api/openapi.yaml`.
- Contract linting: Redocly CLI through `npm run api:lint`.
- Contract type generation: `openapi-typescript` through `npm run api:types` and `npm run api:types:check`.

## Fit For Product

The current stack fits a small workflow product because the API contract can remain explicit while runtime slices are added gradually. The App Router route-handler structure is enough for early API proof points without introducing a separate backend service.

## Keep

- Keep `api/openapi.yaml` as the contract source of truth.
- Keep generated types in `lib/api/generated/openapi-types.ts`.
- Keep shared Problem Details construction in `lib/api/problem.ts`.
- Keep package scripts simple and auditable.
- Keep local generated artifacts ignored.

## Defer

- Database selection and schema design until an approved persistence batch.
- Authentication and tenant model until an approved security batch.
- Test framework selection until an approved testing/CI batch.
- Deployment configuration until the product has a real runtime slice to deploy.

## Watch Outs

- Do not hand-edit generated OpenAPI types.
- Do not add dependencies as a side effect of planning work.
- Do not let framework validation create tracked generated artifacts accidentally.
- If future work asks about Next.js, React, Redocly, or OpenAPI tooling usage, fetch current docs with the repo's Context7 rule first.
