# Batch 54 - Fallow CI Audit Gate

## Summary

Wires `fallow audit` into the Contract Gate workflow and adds a local `fallow:ci` script. Extends Batch 53; lands on `chore/fallow-setup` (PR #13). (Exit-code handling corrected in Batch 55 after review — see `ops/deltas/0055-pr13-review-fixes.md`.)

## Files Changed

- `package.json` - adds `"fallow:ci": "fallow audit --fail-on-issues"`.
- `.github/workflows/contract-gate.yml` - adds `fetch-depth: 0` to checkout and appends a "Run fallow CI audit" step after the exception-review test. No existing step removed or reordered.

## Behavior

The CI step passes `--base origin/main` (auto-detect needs a local `main`, absent on CI checkout) and verifies `fallow` is installed. fallow exit codes: pass/warn -> 0, verdict fail -> 1, runtime error -> 2; the step lets them propagate, so warn-level findings pass while error-severity findings and runtime errors fail the job - mirroring the local hook.

## Rollback

Revert this commit.
