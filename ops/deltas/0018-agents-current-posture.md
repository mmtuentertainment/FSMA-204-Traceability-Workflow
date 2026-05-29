# Batch 18 - AGENTS Current Posture Sync

## Goal

Sync `AGENTS.md` with the current repository posture after the CI contract gate and MockRecall contract smoke check were added.

## Files changed

- `AGENTS.md`
- `ops/deltas/0018-agents-current-posture.md`

## Summary

Updated guardrail wording so `AGENTS.md` no longer describes the repository as Batch 0 scaffold only. It now records the current posture as an OpenAPI-first scaffold with generated contract checks, a CI contract gate, and one MockRecall contract smoke fixture.

The product boundary remains conservative: no compliance certification, legal advice, FDA endorsement, persistence, auth, tenant model, RBAC, audit log, imports, exports, production CSV generation, or production workflow logic is claimed.

## Docs-only impact

Documentation only. This batch did not change workflow files, OpenAPI, generated types, package files, runtime routes, tests, dependencies, lockfiles, or behavior.

## Verification

- `Get-Location` - PASS; repo path was `C:\Users\matth\Desktop\FSMA 204 Workflow Product`.
- `git status --short` before this batch - PASS; showed existing uncommitted batch 17 documentation/planning edits and untracked `ops/deltas/0017-ci-contract-gate.md`.
- `git remote -v` - PASS; `origin` points to `https://github.com/mmtuentertainment/FSMA-204-Traceability-Workflow.git`.
- `node -v` - PASS; `v22.12.0`.
- `npm -v` - PASS; `10.9.0`.
- `git diff --check` - PASS.
- `git grep -n -i "Batch 0 is scaffold only\|No CI workflow exists\|No test files\|before editing contract or CI files" AGENTS.md README.md .planning ops/memory` - PASS; no matches.
- Final sanity grep including `There is no committed test suite` and `contract-only` - PASS; matches were limited to historical/verification text inside delta reports.
- `npm run api:check` - PASS.
- `npm run typecheck` - PASS.
- `npm run build` - PASS; build listed `/`, `/_not-found`, and the two MockRecall API routes.
- `npm run test:mock-recall:contract` - PASS; MockRecall contract smoke check passed.
- Out-of-scope diff check - PASS; no tracked diffs in workflow files, OpenAPI, generated types, package files, runtime routes, tests, dependencies, or lockfiles from this batch.

## Rollback path

Revert `AGENTS.md` and delete `ops/deltas/0018-agents-current-posture.md`. No behavior, contract, dependency, workflow, generated-type, package, route, or test rollback is required.

## Next recommended batch

Keep the next batch small and consultant-approved. The likely next useful batch is contract/example or truth-surface work that builds on the existing CI gate and MockRecall smoke fixture without adding persistence, auth, production export, or workflow logic.
