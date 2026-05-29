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
- Mock-recall detail and packet routes include one OpenAPI-declared contract fixture plus `application/problem+json` not-found behavior for unknown mock recalls.
- The fixture is for contract/runtime smoke checks only; no persisted mock-recall records or production CSV generation workflow exists yet.
- No database, auth, tenant model, RBAC, audit log, persisted traceability records, imports, exports, or production workflow implementation exists yet.

## Setup and Checks

```powershell
npm ci
npm run api:lint
npm run api:types:check
npm run typecheck
npm run build
```
