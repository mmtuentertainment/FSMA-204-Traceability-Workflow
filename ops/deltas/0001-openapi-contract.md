# 0001 OpenAPI Contract

Date: 2026-05-27

## What Changed

- Added repository ignore rules for dependency, Next.js, local env, and package-manager debug artifacts.
- Added the first compact OpenAPI 3.1 contract for FSMA 204 traceability readiness endpoints.
- Modeled ambiguous exemption, kill-step, imported-food, partial-exemption, and lot-code issues as review reasons.
- Kept the batch contract-only: no handlers, DB, auth, UI, imports, exports, or runtime workflow logic.

## Why

Define the machine-readable API boundary before dependency install or implementation. The contract supports fresh-cut produce mock recall readiness with human-reviewed lots, trace events, exceptions, supplier requests, mock recall status, and a future FDA-style sortable CSV packet.

## Files Changed

- `.gitignore`
- `api/openapi.yaml`
- `ops/deltas/0001-openapi-contract.md`

## Commands Run

- `pwd`
- `git status --short`
- `git remote -v`
- `node -v`
- `npm -v`
- `npm view next@^16.2.6 version`
- `npm view react@^19.2.6 version`
- `npm view react-dom@^19.2.6 version`
- `npm view typescript@^6.0.3 version`
- `npm view next version`
- `npm view react version`
- `npm view react-dom version`
- `npm view typescript version`
- `npm view @types/node@^20.19.41 version`
- `npm view @types/react@^19.2.15 version`
- `npm view @types/react-dom@^19.2.3 version`
- `git status --short`
- blocked-artifact existence check for `.git.zip`, `.next/`, `node_modules/`, `next-env.d.ts`, and `package-lock.json`
- Batch 1 line count
- local YAML linter availability check for `yamllint`, `spectral`, and `redocly`
- `python -c "import yaml; yaml.safe_load(...)"`
- `rg -n "tenant_id|tenantId" api/openapi.yaml`

## Validation Results

- Repo path matched `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- Git origin matched `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- Node.js `v22.12.0` satisfies the `>=20.9` requirement.
- npm `10.9.0` is available.
- Declared package ranges resolved, so `package.json` was not changed.
- Pre-batch blocker artifacts were absent: `.git.zip`, `.next/`, `node_modules/`, `next-env.d.ts`, and `package-lock.json`.
- Post-edit generated artifacts remained absent.
- Batch 1 files total 340 lines.
- `api/openapi.yaml` parsed successfully with local Python/PyYAML.
- No `tenant_id` or `tenantId` strings were found in the OpenAPI contract.

## What Failed or Was Skipped

- Dependency install was skipped by design.
- Build and typecheck were skipped because dependencies are still not installed.
- OpenAPI lint was skipped because no local `yamllint`, `spectral`, or `redocly` command is installed.

## Package Range Correction

None. All checked package ranges resolved through npm.

## Next Recommended Micro-Batch

Run a contract review pass on `api/openapi.yaml`, then install dependencies in a separate batch that creates and commits `package-lock.json` before build/typecheck validation.
