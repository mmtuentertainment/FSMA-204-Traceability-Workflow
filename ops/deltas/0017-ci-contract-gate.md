# Batch 17 - CI Contract Gate Verification

## Goal

Confirm the minimal GitHub Actions CI gate for the current OpenAPI-first scaffold and synchronize stale planning notes that still described CI and smoke coverage as missing.

## Files changed

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/HANDOFF.json`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/INTEGRATIONS.md`
- `.planning/codebase/TESTING.md`
- `README.md`
- `ops/memory/product.md`
- `ops/deltas/0017-ci-contract-gate.md`

## Existing CI workflow

The existing `.github/workflows/contract-gate.yml` already runs on `pull_request` and `push` events and uses the repo's npm lockfile/package-script path.

The workflow already includes:

- `npm ci`
- `npm run api:check`
- `npm run typecheck`
- `npm run build`
- `npm run test:mock-recall:contract`

No duplicate workflow was added and no workflow edit was needed.

## Planning sync

Checked and updated README, planning state, handoff, codebase-map, product-memory, and delta truth surfaces that still understated the existing CI gate or committed MockRecall contract smoke check. README now documents the current local/CI gate sequence and notes that `api:check` wraps `api:lint` plus `api:types:check`.

## Runtime/API impact

None. This batch did not change runtime route handlers, API behavior, OpenAPI contract content, generated OpenAPI types, dependencies, package scripts, package manager files, auth, tenanting, storage, audit behavior, imports, exports, UI, or production workflow logic.

## Local verification

- `Get-Location` - PASS; repo path was `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- `git status --short` before repair edits - PASS; showed existing uncommitted planning/codebase-map edits plus untracked `ops/deltas/0017-ci-contract-gate.md`.
- `git remote -v` - PASS; `origin` points to `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- `node -v` - PASS; `v22.12.0`.
- `npm -v` - PASS; `10.9.0`.
- `Get-Content` inspection - PASS; reviewed `AGENTS.md`, `README.md`, `package.json`, `.github/workflows/contract-gate.yml`, `tests/mock-recall-contract-smoke.mjs`, planning truth surfaces, product memory, and this delta.
- `npm ci` - PASS; installed 228 packages, reported 2 moderate audit advisories, and no audit repair was run.
- `npm run api:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS; build listed both MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; MockRecall contract smoke check passed.
- `git diff --check` - PASS.
- Stale-phrase searches - PASS; no matches for the requested stale phrases in README, `ops/memory`, `.planning`, or this delta.
- Out-of-scope diff check - PASS; no tracked diffs in `.github/workflows/contract-gate.yml`, `api/openapi.yaml`, `lib/api/generated/openapi-types.ts`, `package.json`, `package-lock.json`, `tests/mock-recall-contract-smoke.mjs`, or `app/`.
- Final `git status --short` - PASS; only documentation/planning/product-memory edits plus untracked `ops/deltas/0017-ci-contract-gate.md`.

## Rollback path

Revert the documentation and delta edits from this batch only. No workflow, runtime, OpenAPI contract, generated-type, dependency, package-script, or package-manager rollback is required because those files were not changed in this batch.
