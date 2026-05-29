# Batch 14 - MockRecall Contract Smoke CI Wiring

## Goal

Add a lightweight package script and CI invocation for the existing MockRecall contract smoke check. This batch is wiring-only.

## Files Changed

- `package.json`
- `.github/workflows/contract-gate.yml`
- `ops/deltas/0014-mock-recall-contract-smoke-ci.md`

## Preflight

- Repository path: `C:\Users\matth\Desktop\FSMA 204 Workflow Product`
- Branch: `codex/fsma204/ci-contract-gate`
- Remote: `origin https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`
- Node.js: `v22.12.0`
- npm: `10.9.0`
- Prior commits confirmed at branch tip:
  - `326477c Add reproducible CI contract gate`
  - `645186b Reconcile MockRecall contract fixture runtime`
- Initial `git status --short --untracked-files=all` was clean.

## Package Script

Added:

```json
"test:mock-recall:contract": "node tests/mock-recall-contract-smoke.mjs"
```

## CI Workflow Change

Added one GitHub Actions step after `npm run build`:

```yaml
- name: Check MockRecall contract smoke
  run: npm run test:mock-recall:contract
```

The step runs after build because the smoke check starts the built Next.js production server.

## Contract And Runtime Impact

- No MockRecall runtime behavior changed.
- No OpenAPI contract changed.
- No generated OpenAPI types changed.
- No package dependencies changed.
- The existing smoke check is now runnable through npm and the contract gate.

## Verification Commands

- `npm ci` - PASS. Installed 228 packages and reported 2 moderate audit advisories; no audit repair was run because it is outside this batch.
- `npm run api:check` - PASS. Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` reported generated types are current.
- `npm run typecheck` - PASS.
- `npm run build` - PASS. Next.js built successfully and listed both MockRecall API routes as dynamic routes.
- `npm run test:mock-recall:contract` - PASS. The package script ran `node tests/mock-recall-contract-smoke.mjs`, and the smoke check passed.
- `git diff --check` - PASS.
- `git status --short --untracked-files=all` - PASS for inspection; final status is recorded below.

Final status:

```text
 M .github/workflows/contract-gate.yml
 M package.json
?? ops/deltas/0014-mock-recall-contract-smoke-ci.md
```

## Skipped Scope

- No changes to `api/openapi.yaml`.
- No changes to `lib/api/generated/openapi-types.ts`.
- No changes to MockRecall route handlers or fixture runtime behavior.
- No changes to storage, auth, RBAC, tenanting, audit, supplier workflows, UI, or production CSV/export infrastructure.
- No package dependency changes.
- No npm audit remediation.
- No README or product-memory changes; this batch does not change project meaning.

## Risks

- The smoke check depends on `npm run build` completing first because it starts the production server.
- The CI runner must allow the local Next.js server to bind to `127.0.0.1:3227`; the script already supports `MOCK_RECALL_SMOKE_PORT` if that port ever conflicts.

## Rollback Path

Revert only:

- the `test:mock-recall:contract` script in `package.json`
- the MockRecall smoke step in `.github/workflows/contract-gate.yml`
- `ops/deltas/0014-mock-recall-contract-smoke-ci.md`

## Recommended Next Micro-Batch

Add the next smallest MockRecall readiness workflow slice only after this wiring batch is reviewed, keeping OpenAPI as the source of truth and avoiding storage, auth, RBAC, audit, tenanting, or production CSV/export infrastructure unless explicitly approved.
