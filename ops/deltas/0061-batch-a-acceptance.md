# Batch 0061 - Batch A Acceptance (provider-backed test slice complete)

## Summary

Declares **Phase 3 Batch A accepted**. Batch A is the provider-backed repository/service
test slice for the exception-review PATCH (scoped by Batch 50, criterion #2 "must not be
waived"): run the real provider (`lib/db/exception-review-provider.ts`) against a real
PostgreSQL test database, with **no live route wiring**. Across PRs #12-#18 the slice grew
from a1 to a5 and all five suites now execute in CI; this delta records the inventory,
confirms the acceptance criteria are met, and de-stales the truth surfaces so the next
session reads correct state.

This is a **docs + CI-config batch only**: it adds this delta, de-stales the truth
surfaces from "a1/a2/a3" to "a1-a5", and renames the CI provider-DB database to a neutral
name. **No runtime, OpenAPI, generated-type, schema, migration, or runtime-dependency
change.** The provider stays staged-but-unwired; the runtime stays fixture-only. Accepting
Batch A is the gate that unblocks **Batch B** (route wiring + runtime hardening) as a
separately-approved code batch.

## Files Changed

- `ops/deltas/0061-batch-a-acceptance.md` - this report (new).
- `.github/workflows/contract-gate.yml` - renamed the `db-provider-tests` Postgres database
  `fsma204_a1a2_test` -> `fsma204_provider_test` across `POSTGRES_DB`, `DATABASE_URL`, and
  `TEST_DATABASE_URL` (3 references, kept consistent), and de-staled the two suite-name
  comments ("Batch A1/A2/A3 suites" / "(a1/a2/a3)") to "Batch A suites (a1-a5)" / "(a1-a5)".
- `coverage/provider/README.md` - "a1/a2/a3" -> "a1-a5" (4 spots) and added the two files
  the A5 suite brought into the snapshot (`lib/api/problem.ts` `rateLimitedResponse`,
  `lib/security/rate-limit.ts` `RateLimiter` seam) to "What it covers".
- `.planning/codebase/TESTING.md` - de-staled the `test:db` definition (now a1..a5), the
  test-tree, and four "a1/a2/a3" references to "a1-a5".
- `.planning/codebase/CONCERNS.md`, `STRUCTURE.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md` -
  de-staled every remaining codebase-map surface that still listed the provider test set as
  two suites (a1 + a2): the "must run sequentially" note, the file tree, the fallow
  entry-point list, the "consumed only by tests" / "exercised only by" provider
  descriptions, the coverage-path note, and the `TEST_DATABASE_URL` consumer table -> a1-a5.
- `README.md` - "Current State" now reads Batch A accepted (a1-a5) with Batch B as the
  gated next code batch; added a Setup note that `npm run test:db` needs a Postgres
  `TEST_DATABASE_URL` and runs in CI.
- `.planning/STATE.md` - refreshed Current focus, Recent Decisions (Batches 43-62 + this
  acceptance), and Next Step (the hardened Batch-B bundle + deferred entry criteria).
- `ops/memory/product.md` - appended Batches 51-62 and the Batch A acceptance; updated the
  "next code batch" line to Batch B.
- `INTEL.md` (local, untracked) - refreshed the stale status (was at `main` 5cd987b / PR #12
  pending / Batch 51 uncommitted) to `main` 8f58d08 with Batch A accepted.

## Batch A inventory (what is accepted)

All against a real PostgreSQL test database, provider imported by tests only (no route):

| Area | Suite | Coverage | Landed |
|---|---|---|---|
| A1 | `tests/db/exception-review-provider-a1.test.ts` | idempotency resource-scope; `not_found` leaves no orphan reservation | Batch 51 `5fe9524` + Batch 59 `f49596a` (PR #12 `c230bef`) |
| A2 | `...-a2.test.ts` | request-hash mismatch, cross-resource isolation, audit conflicts; different-actor-same-key -> conflict + audit | Batch 52 `711165d` + Batch 59 `f49596a` (PR #12) |
| A3 | `...-a3.test.ts` | append-only audit surface proofs A4-18/19/20 (structural guard + behavioral non-enforcement) | Batch 60 `86b67d4`/`761c4ce` (PR #15 `a281851`), delta 0060 |
| A4 | `...-a4.test.ts` | T1 atomicity forced-fault rollback A3-15/16, A4-17 (UPDATE + audit INSERT + idempotency completion roll back together) | Batch 61 `94f147b`/`ba0417e` (PR #17 `a93685c`) - no standalone delta; recorded here |
| A5 | `...-a5.test.ts` | rate-limit posture Area 5 (A5-02..06, A5-12) + A5-07 limiter-scope pin; optional fail-closed checkpoint seam | Batch 62 `045d546`/`55ef0db` (PR #18 `8f58d08`) - no standalone delta; recorded here |

Supporting infrastructure accepted in the same window (so the suites run + gate honestly in
CI): fallow codebase intelligence + CI audit (PR #13 `cbb39b0`, deltas 0053/0054), the
codebase-map refresh (PR #14 `275161a`), runtime coverage wired into the fallow gate at
`maxCrap 30` (Batch 57, delta 0057), and reproducible provider-DB tests + coverage in CI
(Batch 58, delta 0058).

Batches 61 and 62 merged as test-only PRs without their own delta files; this acceptance
delta is their record of completion.

## CI provider-DB rename (why it is safe)

`fsma204_a1a2_test` was misleading once a3-a5 existed. Renamed to `fsma204_provider_test`.
Each suite refuses to run unless its `TEST_DATABASE_URL` database name matches a per-suite
fence: a1 `/(^|[_-])(test|a1)([_-]|$)/i`, ... a5 `/(^|[_-])(test|a5)([_-]|$)/i`. Every fence
also accepts the shared `test` token; `fsma204_provider_test` ends in `_test`, so it
satisfies all five (a1-a5). The new name also matches the example already documented in
`coverage/provider/README.md`. The three references in the workflow were changed together,
so `POSTGRES_DB` (the database CI creates) and both connection URLs stay consistent.

## Acceptance criteria (Batch 50 criterion #2) - met

- Provider-backed suites a1-a5 run the real provider against a real PostgreSQL test
  database and **execute in CI** under the `db-provider-tests` job (a failing suite fails
  the job), proven green on the merged PRs #12, #15, #17, and #18.
- The committed `coverage/provider/coverage-final.json` is **fresh and gate-equivalent**:
  CI's strict freshness guard fails the job if the committed snapshot's `fallow` verdict
  diverges from a freshly regenerated one, or if fresh coverage does not clear the gate.
- The load-bearing clusters are all present: idempotency resource-scope + concurrency
  (a1/a2), append-only audit surface (a3), atomicity rollback (a4), and rate-limit posture
  (a5).
- No route wiring; the runtime stays fixture-only; the provider is imported only by tests.

## Contract and runtime impact

None. No `api/openapi.yaml`, `lib/api/generated/**`, `app/api/**` route, `lib/db/schema.ts`,
migration (still `0000` + `0001`), or runtime-dependency change. The CI database-name rename
changes only the name CI provisions and connects to; it does not change any behavior, and
both the old and new names pass the suite fences. The provider remains unwired.

## Verification (evidence)

This batch is docs + CI-config only and needs **no local database**:

- Truth-surface de-stale is internally consistent: a repo-wide search for `a1/a2/a3`,
  `a1a2`, and `fsma204_a1a2_test` finds no remaining hits in tracked, non-historical truth
  surfaces (immutable `ops/deltas/0051-0060`, which were accurate when written, and
  untracked scratch handoffs are intentionally left as historical record).
- `.github/workflows/contract-gate.yml` uses `fsma204_provider_test` consistently in all
  three places; the name passes the a1-a5 fences (see above).
- `git diff --check` clean (LF / UTF-8 / no-BOM, per `.gitattributes`).
- `fallow audit` verdict is unchanged by this batch: the edits touch Markdown and YAML, not
  TypeScript, so they do not move the structural/coverage gate.
- The a1-a5 suites' **green** status is the already-merged CI of PRs #12/#15/#17/#18 (the
  `db-provider-tests` job + coverage-freshness guard ran on each); this acceptance does not
  re-run the DB suites locally. Re-running them needs a disposable Postgres per
  `coverage/provider/README.md` (use `127.0.0.1`, db name containing `test`).

## Deferred to Batch B (entry criteria when a real limiter / live route is wired)

- **errors-1**: decide fail-closed vs try/catch-fail-open at the rate-limit checkpoint when a
  real limiter is injected (currently documented as intentionally fail-closed).
- **errors-2**: add a `Number.isFinite` guard for `Retry-After` (`Math.ceil(NaN)` -> `"NaN"`)
  in `problem.ts` + the provider checkpoint, with NaN/Infinity assertions.
- **types-3 / C2**: optionally centralize the Retry-After clamps in one
  `toRetryAfterSeconds()` helper (integer>=1 is not encodable in `number`).
- **A5-DENIED-ATTEMPT-AUDIT**: decide whether throttled (429) attempts emit a security/ops
  log vs the `audit_events` table.
- **A5-VALIDATION-BEFORE-LIMITER** (optional A5-16): pin `validation_error` precedence over
  the limiter.
- Tighten `.fallowrc.jsonc` `unused-*` rules back to `error` once the staged provider
  exports are wired by Batch B.

## Scope compliance

Forbidden and confirmed absent from the diff: any `app/api/**` change; any route import of
`lib/db/client.ts`; any `api/openapi.yaml` / generated-type / `lib/db/schema.ts` / migration
change; any new runtime dependency; any delta renumber/deletion. Only Markdown, one YAML
CI-config rename, and this new delta were changed. Conservative FSMA language preserved (no
compliance-certification / legal / FDA-endorsement / automated-exemption claims).

## Rollback (named)

Docs + CI-name only; non-destructive:

1. Revert `.github/workflows/contract-gate.yml` to `fsma204_a1a2_test` (cosmetic; CI passes
   either way - both names contain the `test` token).
2. Revert the truth-surface wording edits (`coverage/provider/README.md`,
   `.planning/codebase/TESTING.md` + `CONCERNS.md` + `STRUCTURE.md` + `ARCHITECTURE.md` +
   `INTEGRATIONS.md`, `README.md`, `.planning/STATE.md`, `ops/memory/product.md`).
3. Delete `ops/deltas/0061-batch-a-acceptance.md`.

No migration, schema, route, or runtime-dependency change to revert.

## Definition of done

- [x] Batch A inventory (a1-a5) recorded with PR/commit provenance, including the
      delta-less Batches 61 and 62.
- [x] Acceptance criteria (Batch 50 #2) confirmed met against merged-CI evidence.
- [x] CI provider-DB renamed to a neutral name, consistent across all three references, and
      proven to pass every suite fence.
- [x] Truth surfaces de-staled "a1/a2/a3" -> "a1-a5"; coverage README "What it covers"
      lists all four covered files.
- [x] `git diff --check` clean; no contract/schema/migration/route/runtime-dependency change.
- [x] No AI co-author trailer (Matt sole author).

## Next

**Batch B** (route wiring + runtime hardening for `PATCH /api/traceability/exceptions/{exceptionId}`
only) is unblocked, as a hardened non-splittable bundle: repoint the route's DB connection to
a restricted non-owner role, install DB-level append-only enforcement (`ENABLE ALWAYS`
trigger) as the first DDL, invert the a3/A4-20 non-enforcement asserts to enforcement
asserts (REVOKE-only forbidden), wire the provider against a live `DATABASE_URL`, add
persistent rate limiting, and activate PATCH success - clearing the deferred entry criteria
above as it goes.
