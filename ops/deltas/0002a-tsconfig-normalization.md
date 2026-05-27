# 0002A Tsconfig Normalization

Date: 2026-05-27

## What Changed

- Accepted the narrow `tsconfig.json` normalization applied by `next build`.
- Added this batch delta documenting the config-only change and validation.

## Why

Batch 2 proved the scaffold can typecheck and build, but Next.js temporarily
rewrote `tsconfig.json` during that build. Batch 2A explicitly accepts only the
framework/TypeScript config normalization so future builds do not keep producing
an unreviewed source diff.

## Files Changed

- `tsconfig.json`
- `ops/deltas/0002a-tsconfig-normalization.md`

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
- `git diff -- tsconfig.json`
- `Get-Content tsconfig.json`
- `npm run build`
- `npm run typecheck`
- `npm run build`
- `git status --short`
- `git status --short --ignored`
- `Test-Path .next`
- `Test-Path next-env.d.ts`
- `Test-Path tsconfig.tsbuildinfo`
- `git check-ignore -v node_modules .next next-env.d.ts tsconfig.tsbuildinfo`

## Tsconfig Diff Summary

- `jsx` changed from `preserve` to `react-jsx`, matching Next.js automatic
  runtime requirements.
- `.next/dev/types/**/*.ts` was added to `include`.
- Existing required includes remain present: `next-env.d.ts`,
  `.next/types/**/*.ts`, `**/*.ts`, and `**/*.tsx`.
- `strict` remains `true`.
- `noEmit` remains `true`.
- Formatting expanded some arrays; no product runtime settings were added.

## Validation Results

- Repository path matched `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- `origin` matched `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- Node.js `v22.12.0` satisfies the `>=20.9` requirement.
- npm `10.9.0` is available.
- `package-lock.json`, `node_modules/`, `.gitignore`, and `api/openapi.yaml`
  were present.
- `.git.zip` was absent.
- `npm run typecheck` passed.
- `npm run build` passed after accepting the normalization.

## What Failed or Was Skipped

- No failures.
- No tests were added or run because this batch is config stabilization only.
- No dependency install, audit fix, OpenAPI tooling install, migration, DB/auth
  work, API handler work, imports, exports, UI product feature work, or runtime
  traceability logic was performed.
- The existing `.planning/HANDOFF.json` was not deleted after resume because it
  is outside the approved Batch 2A file set.

## Generated Artifacts Observed and Ignored Status

- `node_modules/`: present, ignored by `.gitignore`.
- `.next/`: present, ignored by `.gitignore`.
- `next-env.d.ts`: present, ignored by `.gitignore`, and still included in
  `tsconfig.json`.
- `tsconfig.tsbuildinfo`: present, ignored by the `*.tsbuildinfo` rule.

## Next Recommended Micro-Batch

Add API contract validation/type-generation tooling with OpenAPI as the source
of truth before route handlers, database code, authentication, product runtime
logic, imports, exports, or UI product features.
