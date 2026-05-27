# 0002 Dependency Install Validation

Date: 2026-05-27

## What Changed

- Installed declared npm dependencies.
- Created `package-lock.json`.
- Added `*.tsbuildinfo` to `.gitignore` for TypeScript incremental build artifacts.
- Validated the baseline scaffold with typecheck and production build.

## Why

Lock the dependency graph and prove the baseline Next.js App Router scaffold can typecheck and build before any handlers, database, auth, UI features, or runtime traceability logic are added.

## Files Changed

- `.gitignore`
- `package-lock.json`
- `ops/deltas/0002-dependency-install-validation.md`

## Commands Run

- `pwd`
- `git status --short`
- `git remote -v`
- `node -v`
- `npm -v`
- `Test-Path package.json`
- `Test-Path tsconfig.json`
- `Test-Path .gitignore`
- `Test-Path api/openapi.yaml`
- `Test-Path .git.zip`
- `npm install`
- `npm run typecheck`
- `npm run build`
- `git status --short`
- `git status --short --ignored`
- `Test-Path node_modules`
- `Test-Path .next`
- `Test-Path next-env.d.ts`
- `Test-Path package-lock.json`
- generated `*.tsbuildinfo` scan
- diff checks for disallowed source file changes

## Validation Results

- Repo path and origin matched the approved repository.
- Node.js `v22.12.0` satisfies the `>=20.9` requirement.
- npm `10.9.0` is available.
- `npm install` succeeded and created `package-lock.json`.
- `npm run typecheck` succeeded.
- `npm run build` succeeded with Next.js `16.2.6`.
- `node_modules/`, `.next/`, `next-env.d.ts`, and `*.tsbuildinfo` are ignored.
- `package-lock.json` is not ignored and appears in normal git status.
- No API handlers, DB/auth code, imports, exports, product runtime logic, or UI feature work was added.

## What Failed or Was Skipped

- npm reported 2 moderate audit findings during install; no audit fix was run in this batch.
- Next.js temporarily auto-normalized `tsconfig.json` during build; the generated edit was restored because `tsconfig.json` was outside the allowed Batch 2 file set.
- Tests were not added or run because this batch was install/build validation only.

## Generated Artifacts

- `node_modules/`: present, ignored.
- `.next/`: present, ignored.
- `next-env.d.ts`: present, ignored.
- `tsconfig.tsbuildinfo`: present, ignored by the new `*.tsbuildinfo` rule.
- `.next/cache/.tsbuildinfo`: present under ignored `.next/`.
- `package-lock.json`: present, not ignored, intended to be tracked.

## Next Recommended Micro-Batch

Add API contract validation/type-generation tooling in a scoped batch with OpenAPI as the source of truth before writing route handlers, database code, auth, or product runtime logic.
