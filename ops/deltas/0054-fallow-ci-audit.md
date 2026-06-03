# Batch 54 - Fallow CI Audit Gate

## Summary

Wires `fallow audit` into the Contract Gate workflow and adds a local `fallow:ci` script. Extends Batch 53; lands on `chore/fallow-setup` (PR #13).

## Files Changed

- `package.json` - adds `"fallow:ci": "fallow audit --ci"`.
- `.github/workflows/contract-gate.yml` - adds `fetch-depth: 0` to checkout and appends a "Run fallow CI audit" step after the exception-review test. No existing step removed or reordered.

## Behavior

The CI step passes `--base origin/main` (auto-detect needs a local `main`, absent on CI checkout). It verifies `fallow` is installed, then audits: exit 0/1 (clean / issues) pass; exit 2 or anything else fails - fail-closed, so the gate cannot silently no-op.

## Verification

Wrapper tested under `bash -eo pipefail` (0/1 pass; 2, 127, missing-tool fail); `npm run fallow:ci -- --base origin/main` exits 0 here.

## Rollback

Revert this commit.
