# Batch 55 - PR #13 Review Fixes

## Summary

Addresses findings from an adversarial pre-merge review of PR #13 (fallow tooling, Batches 53-54). One material defect plus several doc/accuracy corrections. No runtime/product code, OpenAPI, or routes touched.

## Key fix - CI gate was fail-open on `verdict: fail`

`fallow audit` exit codes are pass/warn -> 0, **fail -> 1**, runtime error -> 2 (cli-reference.md "Verdicts" table; verified empirically). The Batch 54 CI step treated exit 1 as a non-blocking `::warning::` and only failed on exit 2 — so a PR introducing **error-severity** findings (boundary-violation, circular-deps, unresolved-imports, unlisted-deps, duplicate-exports — all `error` in `.fallowrc.jsonc`) would pass CI. Root cause: the exit-1 premise was inverted (exit 1 was read as harmless "issues found"; it is the block-worthy `fail` verdict).

**Fix:** the CI step now lets the exit code propagate — warn-level (0) passes; `fail` (1) and runtime errors (2) fail the job. This mirrors the local hook (which blocks on `verdict: fail`).

## Files Changed

- `package.json` - `fallow:ci`: `fallow audit --ci` -> `fallow audit --fail-on-issues` (drops the SARIF that `--ci` emitted to discarded stdout; keeps the exit-1-on-fail behavior with human-readable output).
- `.github/workflows/contract-gate.yml` - "Run fallow CI audit" step rewritten to fail on any non-zero exit (verdict fail / runtime error) after the install guard; removed the exit-1-as-warning branch.
- `.fallowrc.jsonc` - `ignorePatterns` += `docs/**`: the HTML/CSS wiki is documentation, not analyzable source. Clears the `styles.css` unused-file finding and 9 phantom stale-suppressions that fallow was parsing out of the wiki's own suppression-syntax examples.
- `docs/fallow/mcp-tools.html`, `index.html`, `CLAUDE.md`, `ops/deltas/0053-fallow-setup.md` - MCP tool count `21` -> `22` (the live `fallow-mcp` server and the mcp-tools.html tables list 22).
- `docs/fallow/this-project.html` - added a banner that the findings snapshot reflects the full phase-3 tree (not this tooling-only branch); fixed the false "against this working tree" footer; marked the agent gate (0053) and CI gate (0054) **Done** in the follow-ups table.
- `docs/fallow/decision-tree.html` - fixed a broken reference to a non-existent `docs/fallow-compliance.md` (now points to docs.fallow.tools).
- `CLAUDE.md` - documents both commit gates (agent + CI), their `jq`/`fallow` prerequisites, the disable path, and the exit-code nuance that caused the bug.
- `ops/deltas/0054-fallow-ci-audit.md` - corrected its exit-code/behavior description.

## Verification

- Gate enforces: a forced `unresolved-import` (error rule) -> `verdict: fail` -> `npm run fallow:ci -- --base origin/main` exits **1** (job fails).
- This branch passes: `fallow audit` verdict is now **pass** (docs/** ignore cleared the wiki findings); `npm run fallow:ci` exits 0.
- JSON/YAML valid; gate hook + workflow LF; no existing CI step removed or reordered.

## Rollback

Revert this commit (restores the Batch 54 advisory behavior).
