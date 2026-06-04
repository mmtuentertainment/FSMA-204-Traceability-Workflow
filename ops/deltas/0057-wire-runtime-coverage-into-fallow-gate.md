# Batch 0057 - Wire runtime coverage into the fallow gate (restore maxCrap: 30)

## Summary

Replaces the interim `maxCrap: 500` workaround from Batch 0056 with **real runtime coverage**, so
the fallow complexity gate scores CRAP against actual test coverage instead of an assumed ~0%. The
provider integration tests' coverage is captured once as a **committed Istanbul snapshot**
(`coverage/provider/coverage-final.json`) and fed to `fallow audit` via the `FALLOW_COVERAGE` env in
**both** gate contexts (the CI `verify` step and the local `PreToolUse` commit hook). With true
coverage the three phase-3 provider functions score CRAP < 15, so `.fallowrc.jsonc`
`health.maxCrap` returns to the strict default **30**. No OpenAPI, route, runtime-product, schema,
or dependency change; no new npm dependency (the one-time capture used `npx c8`).

This is the deferred coverage follow-up named in `ops/deltas/0056-pr12-reconcile.md`. Matt chose the
**committed-snapshot + config-pointed** mechanism: one artifact keeps both the CI gate and the
local commit hook honest at `maxCrap: 30` with no cross-job artifact plumbing.

## Why a committed snapshot is safe (fails closed)

fallow matches coverage to a function by **content hash**. Editing a covered function changes its
hash, the stale coverage stops matching, the function reads as 0%, CRAP re-inflates, and the gate
**fails** — forcing a refresh. A stale snapshot can only "pass" while the covered source is
byte-unchanged (where the old coverage is still valid). Paths are stored **repo-relative + POSIX**
so the same file matches on Windows (local hook) and Linux (CI). Provenance + regen recipe live in
`coverage/provider/README.md`.

## Changes

### 1. Committed coverage snapshot (`coverage/provider/`)
- `coverage-final.json` (new) — Istanbul coverage for `lib/db/exception-review-provider.ts` +
  `lib/shared/canonical-json.ts`, captured from the A1/A2 provider suites under `NODE_V8_COVERAGE`,
  converted V8 -> Istanbul via `c8`, then normalized: absolute path keys + inner `.path` rewritten
  to repo-relative POSIX, and c8's `-1` sentinels replaced with `0` (fallow's parser rejects `-1`:
  "invalid value: integer -1, expected u32").
- `README.md` (new) — provenance, the "fails closed" rationale, and the regen recipe.

### 2. `.fallowrc.jsonc` — restore `health.maxCrap: 30`
Reverted the `500` interim value and replaced the long workaround comment with a short note pointing
at the coverage snapshot + the `FALLOW_COVERAGE` wiring. `maxCyclomatic: 20` / `maxCognitive: 15`
stay strict (unchanged).

### 3. `.github/workflows/contract-gate.yml` — feed coverage to the CI audit
Added a step-level `env: { FALLOW_COVERAGE: coverage/provider/coverage-final.json }` on the
"Run fallow CI audit" step so `npm run fallow:ci -- --base origin/main` scores CRAP with real
coverage. The audit command itself is unchanged.

### 4. `.claude/hooks/fallow-gate.sh` — feed coverage to the local commit gate
The hook now appends `--coverage <file>` to its `fallow audit` invocation, honoring an explicit
`FALLOW_COVERAGE` and otherwise defaulting to the committed snapshot when present (coverage-blind
fallback preserved if absent — fails closed, never open). Empty-array expansion guarded for
`set -u` (`${COV_ARGS[@]+"${COV_ARGS[@]}"}`). Stays LF per `.gitattributes`. This is an additive
local hardening of the generated hook (like the Batch 0053 commit/push regex) — re-apply after any
`fallow hooks install --target agent --force`.

### 5. `.gitignore` — ignore coverage scratch
Added `.coverage-tmp/` (raw V8 + intermediate Istanbul output from regeneration). The committed
snapshot under `coverage/provider/` stays tracked.

## Files Changed
- `coverage/provider/coverage-final.json` (new), `coverage/provider/README.md` (new)
- `.fallowrc.jsonc`, `.github/workflows/contract-gate.yml`, `.claude/hooks/fallow-gate.sh`, `.gitignore`
- `ops/deltas/0057-wire-runtime-coverage-into-fallow-gate.md` (this report)

## Contract / runtime impact
None. No `api/openapi.yaml`, `lib/api/generated/**`, route, schema, migration, package, or
dependency change. CI/agent gate config + a committed coverage artifact only.

## Verification

Disposable Postgres (`postgres:16-alpine`, port 55432, `127.0.0.1`), migrated via
`drizzle-kit migrate`; A1 + A2 provider suites green.

- **A/B proof at `--max-crap 30`, `--base origin/main`:**
  - WITHOUT coverage -> `verdict: fail`, 4 complexity findings:
    `reviewTraceabilityExceptionWithProvider` (182, introduced), `reserveIdempotencyRecord`
    (156, introduced), `applyTenantScopedExceptionReview` (56, introduced), and
    `readExceptionPatch` (`lib/api/exception-review.ts`, 182, **inherited**).
  - WITH the committed coverage -> `verdict: warn`; the 3 **introduced** provider findings clear
    (`complexity_introduced: 3 -> 0`); only the inherited `readExceptionPatch` warn remains.
  - `--fail-on-issues` exit codes: without coverage **1** (blocks), with coverage **0** (passes).
- **CI gate form:** `FALLOW_COVERAGE=… npm run fallow:ci -- --base origin/main` -> **exit 0**.
- **Local commit hook form:** a synthetic `git commit` piped through `.claude/hooks/fallow-gate.sh`
  -> **exit 0** (allow) at `maxCrap: 30`.
- **Full baseline gate green:** `api:check`, `typecheck`, `db:check`, `test:mock-recall:contract`,
  `test:exception-review:patch`, `build` all exit 0.
- **Hygiene:** `bash -n` on the hook OK; `git ls-files --eol` shows `w/lf` for the hook / yml /
  jsonc; 0 CR bytes in the hook; `git diff --check` clean.

## Known residual (documented, not fixed here)
`lib/api/exception-review.ts:readExceptionPatch` (cyclomatic 13, coverage-blind CRAP 182) is a
**pre-existing** function reported as an **inherited** warn under the default `new-only` gate — it
does not fail CI or the PR. It is outside this batch's provider-coverage scope. Options for a later
batch: broaden the snapshot to the fixture-tested surface (it is covered by
`test:exception-review:patch`, no Postgres needed), or refactor the function.

## Rollback
Revert this commit. Equivalently: set `.fallowrc.jsonc` `health.maxCrap` back to `500` (restoring
the 0056 interim comment), remove the `FALLOW_COVERAGE` env from the contract-gate step, revert the
`--coverage` injection in `.claude/hooks/fallow-gate.sh`, drop `coverage/provider/`, and remove the
`.coverage-tmp/` gitignore line. No runtime/contract/schema/dependency rollback needed.

## Next micro-batch (0058)
Land a Postgres-backed `db-provider-tests` CI job (`services: postgres` + `drizzle-kit migrate` +
run `tests/db/*` under coverage) that **regenerates** the snapshot and **freshness-checks** it
against the committed copy, plus a committed normalizer script + the `c8` devDep (so regeneration is
reproducible in CI, not a documented manual recipe). This also closes the gap that the A1/A2 tests
do not yet execute in CI at all. Separately deferred (per the handoff): tighten `unused-*` rules
back to `error` once the staged provider exports are wired into the PATCH route.
