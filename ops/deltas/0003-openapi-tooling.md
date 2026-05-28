# 0003 OpenAPI Tooling

Date: 2026-05-27

## What Changed

- Installed OpenAPI tooling as development dependencies:
  - `@redocly/cli`
  - `openapi-typescript`
- Added package scripts for contract linting, type generation, generated type
  freshness checks, and a combined API check.
- Generated TypeScript contract types from `api/openapi.yaml`.

## Why

OpenAPI is the source of truth for future API work. This batch adds local
validation and generated TypeScript contract types before any route handlers,
database code, authentication, UI product features, imports, exports, runtime
traceability logic, tests, migrations, or data models are added.

## Files Changed

- `package.json`
- `package-lock.json`
- `lib/api/generated/openapi-types.ts`
- `ops/deltas/0003-openapi-tooling.md`

## Commands Run

- `pwd`
- `git status --short`
- `git remote -v`
- `node -v`
- `npm -v`
- `Test-Path package.json`
- `Test-Path package-lock.json`
- `Test-Path tsconfig.json`
- `Test-Path .gitignore`
- `Test-Path api/openapi.yaml`
- `Test-Path node_modules`
- `Test-Path .git.zip`
- `npm view @redocly/cli version`
- `npm view openapi-typescript version`
- `npm view openapi-typescript@7.13.0 peerDependencies`
- `npm view openapi-typescript@latest version peerDependencies`
- `npm view @redocly/cli@2.31.5 peerDependencies`
- `npm install --save-dev @redocly/cli openapi-typescript`
- `npm install --save-dev @redocly/cli openapi-typescript --legacy-peer-deps`
- `npm run api:lint`
- `npm run api:types`
- `npm run api:types:check`
- `npm run typecheck`
- `npm run build`
- `git status --short`
- `git status --short --ignored`
- `Test-Path lib/api/generated/openapi-types.ts`
- `Test-Path .next`
- `Test-Path node_modules`
- `Test-Path next-env.d.ts`
- `Test-Path tsconfig.tsbuildinfo`
- `git check-ignore -v node_modules .next next-env.d.ts tsconfig.tsbuildinfo lib/api/generated/openapi-types.ts`

## Dependency Versions Installed

- `@redocly/cli`: `^2.31.5`
- `openapi-typescript`: `^7.13.0`

The first install attempt failed because `openapi-typescript@7.13.0` declares a
peer dependency on `typescript@^5.x`, while this scaffold currently uses
`typescript@^6.0.3`. The failed install left the working tree unchanged. The
second install used npm peer-resolution compatibility mode and installed only
the two approved dev dependencies without downgrading or updating TypeScript.

## api:lint Results

- `npm run api:lint` passed.
- Redocly validated `api/openapi.yaml`.
- Redocly reported one warning: `info` should contain a `license` field
  (`info-license` rule).
- `api/openapi.yaml` was not changed in this batch.

## api:types Results

- `npm run api:types` passed.
- `openapi-typescript 7.13.0` generated
  `lib/api/generated/openapi-types.ts` from `api/openapi.yaml`.
- The generated file contains the standard auto-generated header and was not
  hand-edited.

## api:types:check Results

- `npm run api:types:check` passed.
- Generated types are current with `api/openapi.yaml`.

## Typecheck and Build Results

- `npm run typecheck` passed.
- `npm run build` passed with Next.js `16.2.6`.

## npm Audit Findings

- npm reported `2 moderate severity vulnerabilities` during install.
- No audit fix was run.
- No dependency updates beyond the two approved dev dependencies were attempted.

## Generated Artifact Audit

- `lib/api/generated/openapi-types.ts`: present, not ignored, intended to be
  tracked.
- `node_modules/`: present, ignored by `.gitignore`.
- `.next/`: present, ignored by `.gitignore`.
- `next-env.d.ts`: present, ignored by `.gitignore`.
- `tsconfig.tsbuildinfo`: present, ignored by the `*.tsbuildinfo` rule.

## What Failed or Was Skipped

- The first plain npm install failed on the TypeScript peer dependency conflict
  described above; the working tree was unchanged after that failure.
- No `npm audit fix` was run.
- No tests were added or run because this batch is API-contract tooling only.
- No database, authentication, API handlers, route handlers, UI product work,
  imports, exports, runtime traceability logic, migrations, or data models were
  added.
- No OpenAPI contract changes were made; the Redocly `info-license` warning was
  documented for a future approved contract-quality batch.

## Next Recommended Micro-Batch

Run a narrowly scoped OpenAPI contract-quality batch to decide whether to add
`info.license` metadata, then rerun `api:lint`, `api:types:check`, typecheck,
and build. Do not add handlers, database code, authentication, imports, exports,
UI product features, or runtime traceability logic in that cleanup batch.
