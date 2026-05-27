# 0000 Baseline Scaffold

Date: 2026-05-27

## What Changed

- Added a minimal Next.js App Router + TypeScript + npm scaffold.
- Added repository guidance, README setup notes, and a tiny product memory file.
- Kept Batch 0 to eight scaffold files with no product features.

## Why

Create a clean baseline before the OpenAPI contract, dependency install, database, authentication, or FSMA workflow implementation.

## Files Added

- `package.json`
- `tsconfig.json`
- `app/layout.tsx`
- `app/page.tsx`
- `README.md`
- `AGENTS.md`
- `ops/memory/product.md`
- `ops/deltas/0000-baseline-scaffold.md`

## Commands Run

- `pwd`
- `git status --short`
- `git remote -v`
- `node -v`
- `npm -v`
- `npx ctx7@latest library "Next.js" ...` (quota-limited)
- `npm view ... version`

## Validation

- Repo path and `origin` remote matched the approved repository.
- Node.js `v22.12.0` satisfies the `>=20.9` requirement.
- npm `10.9.0` is available.
- Dependency install, typecheck, and build were skipped because Batch 0 intentionally avoids installs and omits `.gitignore`.
- No generated `.next/`, `node_modules/`, lockfile, or `next-env.d.ts` artifacts were created.

## Next Micro-Batch

Add `.gitignore` and `api/openapi.yaml` before dependency install, database work, authentication, or product code.
