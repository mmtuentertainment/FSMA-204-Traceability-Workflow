---
last_mapped_commit: b106c66ac96b65ad47b658772886ffcd871c13f9
mapped_at: 2026-05-28
focus: tech
---

# Stack

## Runtime

- Node.js is required at `>=20.9`, declared in `package.json`.
- Current local preflight used Node `v22.12.0` and npm `10.9.0`.
- Package manager is npm with committed `package-lock.json`.
- The app is a minimal Next.js App Router project using TypeScript.

## Frameworks And Libraries

- `next` `^16.2.6` provides the app and API route runtime.
- `react` and `react-dom` `^19.2.6` are present for the Next app shell.
- `typescript` `^6.0.3` is used through `npm run typecheck`.
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

## Configuration

- `tsconfig.json` is strict and Next-compatible.
- `.gitignore` intentionally ignores generated/local artifacts: `node_modules/`, `.next/`, `next-env.d.ts`, `.env*.local`, logs, and `*.tsbuildinfo`.
- `AGENTS.md` is the repo instruction surface and carries the FSMA-specific batch and product boundaries.
- `README.md` is the current human-facing truth surface for setup and status.

## Contract Tooling

- `api/openapi.yaml` is the API source of truth.
- `lib/api/generated/openapi-types.ts` is generated and should not be hand-edited.
- `lib/api/problem.ts` imports `components["schemas"]["Problem"]` from the generated types, keeping runtime Problem Details aligned to the OpenAPI schema.
