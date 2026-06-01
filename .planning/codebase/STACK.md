---
last_mapped_commit: 47b3adb8ba0224e2c30edf112661f77b4d69410c
mapped_at: 2026-06-01
focus: tech
---

# Stack

## Runtime

- Node.js is required at `>=20.9`, declared in `package.json`.
- Current local preflight used Node `v22.12.0` and npm `10.9.0`.
- GitHub Actions uses Node `22.x` in `.github/workflows/contract-gate.yml`.
- Package manager is npm with committed `package-lock.json`.
- The app is a small Next.js App Router project using TypeScript.

## Frameworks And Libraries

- `next` `^16.2.6` provides the app and API route runtime.
- `react` and `react-dom` `^19.2.6` are present for the app shell.
- `typescript` `^5.9.3` is used through `npm run typecheck`.
- `openapi-typescript` `^7.13.0` generates types from `api/openapi.yaml`.
- `@redocly/cli` `^2.31.5` validates the OpenAPI contract.

## Important Scripts

- `npm run dev` starts the local Next development server.
- `npm run build` runs a production Next build.
- `npm run start` serves the production build.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run api:lint` validates `api/openapi.yaml`.
- `npm run api:types` writes `lib/api/generated/openapi-types.ts`.
- `npm run api:types:check` checks that generated OpenAPI types are current.
- `npm run api:check` runs OpenAPI lint plus generated-type freshness.
- `npm run test:mock-recall:contract` starts a production Next server and verifies the MockRecall fixture and missing-resource Problem Details behavior.

## Configuration

- `tsconfig.json` is strict and Next-compatible.
- No `next.config.*` file exists.
- No TypeScript path alias is configured; current app routes use long relative imports into `lib/`.
- `.gitignore` intentionally ignores generated/local artifacts: `node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `.env*.local`, logs, and `*.tsbuildinfo`.
- `AGENTS.md` is the repo instruction surface and carries FSMA-specific batch, product, and Context7 documentation boundaries.

## Contract Tooling

- `api/openapi.yaml` is the API source of truth.
- `lib/api/generated/openapi-types.ts` is generated and should not be hand-edited.
- Runtime helpers import OpenAPI generated types for Problem Details and MockRecall fixture shape.
- The CI contract gate runs install, OpenAPI check, TypeScript check, build, and MockRecall contract smoke on push and pull request events.

## Current Tech Boundary

- There is no database, ORM, migration system, auth SDK, queue, storage SDK, email/webhook client, or external API client.
- The Phase 3 boundary skeleton is provider-neutral TypeScript only: request context, authorization policy shape, tenant-scoped MockRecall source, read boundary, and idempotency/audit interface shapes.
- Idempotency and audit interfaces are present but uninvoked by the current read-only routes.
