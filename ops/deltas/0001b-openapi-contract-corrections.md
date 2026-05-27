# 0001b OpenAPI Contract Corrections

Date: 2026-05-27

## What Changed

- Added stable `operationId` values to all 12 OpenAPI operations.
- Removed YAML anchors, aliases, merge keys, and the `x-response-sets` helper block.
- Inlined reusable error response references while preserving shared `components.responses`.

## Why

Prepare the contract for OpenAPI tooling, future handler generation, and client generation before dependency install or implementation work.

## Files Changed

- `api/openapi.yaml`
- `ops/deltas/0001b-openapi-contract-corrections.md`

## Commands Run

- `pwd`
- `git status --short`
- `git remote -v`
- `Test-Path api/openapi.yaml`
- `Test-Path .gitignore`
- `Test-Path .git.zip`
- `Test-Path .next`
- `Test-Path node_modules`
- `Test-Path next-env.d.ts`
- `Test-Path package-lock.json`
- `python -c "import yaml, pathlib; data=yaml.safe_load(...); ..."`
- `rg -n "operationId:" api/openapi.yaml`
- `rg -n "x-response-sets|&readErrors|&writeErrors|\\*readErrors|\\*writeErrors|<<" api/openapi.yaml`
- `rg -n "tenant_id|tenantId|certification|FDA approved|legal advice|exemption determination" api/openapi.yaml`
- `rg -n "Idempotency-Key|Retry-After|application/problem\\+json|text/csv" api/openapi.yaml`
- Python operationId uniqueness and expected-name audit
- Local OpenAPI linter availability check for `yamllint`, `spectral`, and `redocly`

## Validation Results

- `api/openapi.yaml` parses as YAML and reports OpenAPI `3.1.0`.
- The contract still has 9 path objects covering the 12 required operations.
- Exactly 12 `operationId` entries exist, all unique, and all match the requested names.
- No `x-response-sets`, YAML anchors, aliases, or merge keys remain.
- No `tenant_id` or `tenantId` fields were found.
- The only `certification` / `legal advice` match is the intended negative disclaimer.
- `Idempotency-Key`, `Retry-After`, `application/problem+json`, and `text/csv` remain present.
- `.git.zip`, `.next/`, `node_modules/`, `next-env.d.ts`, and `package-lock.json` remain absent.

## What Failed or Was Skipped

- Dependency install, build, and typecheck were skipped by design.
- OpenAPI lint was skipped because no local `yamllint`, `spectral`, or `redocly` command is installed.
- No handlers, DB, auth, UI, imports, exports, or runtime product logic were added.

## Next Recommended Micro-Batch

After validation passes, run dependency install in a separate batch that creates `package-lock.json`, then run build and typecheck validation.
