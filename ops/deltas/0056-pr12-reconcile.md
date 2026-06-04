# Batch 56 - Reconcile PR #12 (phase-3 Batches 44-48 + provider A1/A2) onto fallow-`main`

## Summary

Merges `origin/main` (the fallow codebase-intelligence tooling, PR #13 / Batches 53-55) into
the open phase-3 PR #12 branch and resolves the one real interaction: PR #12's provider code meets
the now-enforcing fallow gate. The git merge is conflict-free (verified); the work is making the
gate green **honestly**. Includes the previously-unpushed local provider-A2 commit (`711165d`). No
OpenAPI, route, or runtime-product behavior changed.

## Re-verified the handoff (it was built from an under-installed audit)

The pre-reconcile handoff (`.planning/HANDOFF-phase3-pr12-reconcile.md`) audited the A1 tip with
`node_modules` missing `pg`/`drizzle`. Re-verified against the true A1+A2 merged state with deps
installed:

- **No git conflicts.** `git merge-tree` and the real merge auto-merge `contract-gate.yml`,
  `package.json`, `package-lock.json` (non-overlapping edits; both edit sets preserved). GitHub
  reported `MERGEABLE / CLEAN`. The handoff's "3 conflict files" was overlap-risk, not real conflicts.
- **No error-severity dead-code finding.** The handoff's `dead_code_has_errors: true` was a
  dependency-state artifact (`pg`/`drizzle` imports unresolved without install). Installed:
  `dead_code_has_errors: false`. The 8 unused-export findings are all **warn** (6 staged provider
  exports + 2 pre-existing `lib/api` fixture exports surfaced because the dedup below touched that file).
- The only `verdict: fail` driver was **complexity CRAP** on 3 provider functions. Duplication and
  dead-code are warn (non-blocking) — confirmed by `--max-crap 999` -> verdict `warn` with the clone
  groups still present.

## Changes

### 1. Merge `origin/main` -> PR #12 branch (conflict-free merge commit)
Brings the fallow config / MCP / CLAUDE.md / HTML wiki / commit gates + the CI fallow step onto the
PR branch. `package.json` / `package-lock.json` union auto-resolved; `npm install` regenerated the
lock (fallow pinned `2.87.0`).

### 2. CRAP gate: keep cyclomatic/cognitive strict, neutralize coverage-blind CRAP (`.fallowrc.jsonc`)
The 3 flagged functions (`reviewTraceabilityExceptionWithProvider`, `reserveIdempotencyRecord`,
`applyTenantScopedExceptionReview`) are **under** the raw thresholds (cyclomatic 13/12/7 <= 20;
cognitive 11/11/6 <= 15). They fail only on `CRAP = CC^2*(1-cov/100)^3 + CC`, which fallow inflates
because no runtime coverage is wired into the gate (it estimates ~0%). These functions are
**empirically 100% covered** by the a1/a2 provider tests (verified — see Verification; true CRAP < 15).
`health` now sets `maxCyclomatic: 20`, `maxCognitive: 15` (explicit, strict) and `maxCrap: 500`
(> `maxCyclomatic^2 + maxCyclomatic` = 420, the largest coverage-blind CRAP a within-ceiling function
can reach) — coverage-blind CRAP becomes non-binding while a genuine cyclomatic breach still fails.
Documented inline; restore `maxCrap: 30` when coverage is wired (follow-up).

### 3. De-duplicate the canonical-JSON helpers (fallow code-duplication)
`isPlainObject` + `stableStringify` were byte-identical in `lib/api/exception-review.ts` and
`lib/db/exception-review-provider.ts` (2 clone groups). Extracted to `lib/shared/canonical-json.ts`
(single source of truth for idempotency request hashing / fingerprinting); both files import it.
Clears both clone groups. (`--max-crap 999` showed dup is warn-level, so this is a quality cleanup,
not strictly gate-required — but it is the honest fix the user chose.)

## Files Changed
- (merge) all of `origin/main`'s fallow tooling onto the PR branch.
- `lib/shared/canonical-json.ts` (new) - shared `isPlainObject` + `stableStringify`.
- `lib/api/exception-review.ts` - import the shared helpers; remove the local copies (keeps `requestFingerprint`).
- `lib/db/exception-review-provider.ts` - import `stableStringify`; remove the local copies.
- `.fallowrc.jsonc` - `health.maxCyclomatic` / `maxCognitive` made explicit + `maxCrap: 500`, documented.
- `package.json` / `package-lock.json` - merge union; lock regenerated (fallow `2.87.0`; the
  exploratory `@fallow-cli/fallow-cov` sidecar was NOT kept — the coverage follow-up uses the
  license-free Istanbul path).

## Verification
- `git merge-tree origin/main <pr>` -> **0 conflicts**; the real merge auto-resolved the 3 union files.
- Full repo gate green: `typecheck`, `api:check`, `db:check`, `test:mock-recall:contract`,
  `test:exception-review:patch`, `build` all pass.
- Provider integration tests pass against a disposable `postgres:16-alpine` (migrated via
  `drizzle-kit migrate`): a1 + a2 green **post-dedup** (confirms the extracted `stableStringify`
  request-hash path is intact).
- `fallow audit` (commit-gate form, no `--base`): **verdict `warn`** (exit 0) - complexity findings 0,
  clone groups 0, `dead_code_has_errors: false`, 0 unresolved-imports / boundary / unlisted findings.
- Coverage proof (local, not committed): a1/a2 under `NODE_V8_COVERAGE` -> all 3 flagged functions
  **100% covered**; sanitized Istanbul `fallow audit --coverage` -> complexity 0 / verdict `warn`,
  confirming the CRAP flags are a coverage-visibility artifact, not real over-complexity.

## Follow-up (next batch)
Wire runtime coverage into the gate so CRAP regains accuracy and `maxCrap` can return to 30:
- Land the planned `db-provider-tests` CI job (`services: postgres` + `drizzle-kit migrate` + run
  `tests/db/*` under `NODE_V8_COVERAGE`). A local PostgreSQL is available for development.
- License-free ingestion: `c8` to convert V8 -> Istanbul `coverage-final.json`, sanitize c8's `-1`
  sentinels (fallow's parser rejects them), feed `fallow audit --coverage`. (The V8
  `--runtime-coverage` sidecar path is license-gated — exit 3 without a trial/team JWT — so avoid it.)
- Then restore `.fallowrc.jsonc` `health.maxCrap: 30` and drop this exception.
- (Separately deferred, per the handoff: tighten `unused-*` rules back to `error` once the staged
  provider exports are wired into the exception-review PATCH route.)

## Rollback
Revert the merge commit (`git revert -m 1 <sha>`), or reset the PR branch to `5fe9524` (origin A1
tip) to drop both the reconcile and the A2 commit.
