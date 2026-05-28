# FSMA 204 Workflow Product

Conservative FSMA 204 traceability readiness workflow. This product should help teams prepare, review, and export traceability records; it must not claim compliance certification, provide legal advice, imply FDA endorsement, or automate exemption determinations.

## Stack

- Next.js App Router
- TypeScript
- npm
- Node.js >= 20.9

## Current State

- OpenAPI remains the source of truth at `api/openapi.yaml`.
- Generated TypeScript contract types exist at `lib/api/generated/openapi-types.ts`.
- Mock-recall not-found route handlers exist and are runtime-verified to return `application/problem+json` for missing mock recalls.
- `MockRecallDetail` success response shape exists in OpenAPI and generated types only.
- No database, auth, tenant model, RBAC, audit log, persisted traceability records, successful mock-recall runtime payloads, CSV generation, imports, exports, or production workflow implementation exists yet.

## Setup and Checks

```powershell
npm ci
npm run api:lint
npm run api:types:check
npm run typecheck
npm run build
```
