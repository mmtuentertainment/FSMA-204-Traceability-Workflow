# Batch 37 - Exception-Review PATCH Test Gate

## Summary

Made the existing fixture-only exception-review PATCH focused test part of the official local and CI gate without changing runtime behavior.

This batch:

- adds `npm run test:exception-review:patch`;
- wires that script into `.github/workflows/contract-gate.yml`;
- aligns the declared Node.js precondition with the retained `--experimental-strip-types` command;
- updates active testing and handoff truth surfaces;
- preserves historical deltas as provenance.

No production auth provider, database, persistence, supplier workflow, lot/event workflow, export, CSV generation, or broader Phase 4-8 runtime work was added.

## Files Changed

- `package.json`
- `package-lock.json`
- `.github/workflows/contract-gate.yml`
- `README.md`
- `AGENTS.md`
- `.planning/HANDOFF.json`
- `.planning/codebase/TESTING.md`
- `ops/memory/product.md`
- `ops/deltas/0037-exception-review-patch-test-gate.md`

## Contract Impact

None. `api/openapi.yaml` and `lib/api/generated/openapi-types.ts` were not edited.

## Runtime Impact

None. Runtime logic under `app/api` and `lib` was not edited, and test behavior was not changed.

## Package / CI Impact

`package.json` now includes:

```json
"test:exception-review:patch": "node --experimental-strip-types tests/exception-review-patch.test.ts"
```

The GitHub Actions contract gate now runs:

```yaml
- name: Check exception-review PATCH focused test
  run: npm run test:exception-review:patch
```

The Node.js engine declaration is now `>=22.6` because the official test script retains Node's type-stripping flag. No dependency was added.

## Known Warning Posture

The focused direct TypeScript test may print Node's current experimental type-stripping warning and module-type warning. Those warnings are accepted for this no-test-runner fixture gate and were not silenced by adding dependencies or changing package module type.

## Verification Commands And Results

- `git status --short --branch --untracked-files=all` - PASS; branch is `review/phase-3-batches-32-35...origin/review/phase-3-batches-32-35`, tracked changes are limited to this package/CI/docs/delta batch, and local-only `INTEL.md` plus `.audit/` remain untracked.
- `npm ci` - PASS; added/audited 229 packages and reported 2 moderate npm audit findings.
- `npm run api:check` - PASS; Redocly validated `api/openapi.yaml`, and `openapi-typescript --check` completed.
- `npm run typecheck` - PASS; `tsc --noEmit` completed.
- `npm run build` - PASS; Next.js production build completed.
- `npm run test:mock-recall:contract` - PASS; `MockRecall contract smoke check passed.`
- `npm run test:exception-review:patch` - PASS; all 10 focused exception-review PATCH checks passed. Node printed the expected experimental type-stripping and module-type warnings.
- `git diff --check` - PASS; no whitespace or conflict-marker errors.
- `git diff --exit-code -- app/api lib tests api/openapi.yaml lib/api/generated/openapi-types.ts` - PASS; no runtime logic, test behavior, OpenAPI, or generated-type diffs.

## Rollback Path

Revert this delta plus the package script, lockfile engine metadata, CI workflow step, and active docs truth-surface updates. No runtime API route, library logic, OpenAPI contract, generated type, test file, package dependency, database, or production auth rollback is needed.
