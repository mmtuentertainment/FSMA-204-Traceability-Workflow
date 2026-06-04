# Batch 0059 - PR #12 Batch-A-remainder: provider correctness + doc/tooling fixes

## Summary

Closes the actionable findings from the 2026-06-04 adversarial review of PR #12
(`.planning/PR12-REVIEW-2026-06-04.md`, Option B) **before** Phase 3 Batch B wires the provider
into the exception-review PATCH route. The provider is still **staged but unwired** (imported only
by tests), so these were latent — not live — but they are cheaper and safer to land while the design
is fresh and no request path depends on the behavior. Scope is exactly the review's Option-B list:
two provider correctness fixes, one script guard, and three documentation softenings. **No route
wiring, no OpenAPI/generated-type/schema/migration change, and no new runtime dependency.**

## Changes

### 1. Idempotency request hash now includes the actor (review finding #1)
`lib/db/exception-review-provider.ts` — `reviewTraceabilityExceptionWithProvider` now folds
`actorAuthSubjectId` into `computeExceptionReviewRequestHash({ patch, sourceDocumentRef, actorAuthSubjectId })`.

- **Before:** the hash covered only `{patch, sourceDocumentRef}` and the unique key is
  `(tenant, operation, resource_type, resource_id, idempotency_key)` — neither carried the actor. A
  *second* authorized reviewer reusing the first reviewer's key + an identical payload hit the
  `replayed` early-return and silently received the first actor's result **with no audit event for
  the replaying actor** — undercutting Phase 3's append-only-audit invariant and diverging from the
  design packet `03-02-first-mutating-write-design.md` (scope `tenant/actor/action/key`, L81/L110)
  and the in-memory seam `lib/security/idempotency-audit.ts` (which keys on `actorId`).
- **After:** a different actor reusing the same key + identical payload now produces a different
  request hash → **`409 conflict`**, which appends an error audit event naming the replaying actor.
  Same actor + same payload still replays (correct dedup). No schema change: the actor becomes part
  of the request fingerprint rather than the DB unique key.
- **Test (a2, new):** `different_actor_same_key_same_payload_conflicts_and_audits_actor` — actor B
  reuses actor A's key with an identical payload, asserts `conflict` + a second audit event named
  for B (`reason: idempotency_request_hash_mismatch`, `metadata.status: conflict`).
- **Fixture sync:** the a1 `requestHash()` helper now mirrors the provider's inputs (adds the actor)
  so the manually pre-seeded `in_flight`/reclaim rows still match the orchestrator's computed hash.

### 2. `not_found` no longer orphans a `reserved` idempotency record (review finding #2)
`lib/db/exception-review-provider.ts` — adds `deleteIdempotencyRecord` and calls it on the
orchestrator's `not_found` branch.

- **Before:** the reservation was committed first; if the tenant-scoped load returned `not_found`
  the function returned without completing or deleting it, so the transaction committed an orphaned
  `reserved` row. A later legitimate retry with the same key then read `in_flight` until the 5-min
  TTL expired. (The committed coverage proved this branch was cold.)
- **After:** `not_found` deletes the just-taken reservation (guarded `WHERE … lifecycle_status =
  'reserved'`, asserts exactly one row) within the same transaction, so it commits with zero rows.
- **Test (a1, new):** `orchestrator not_found leaves no reserved idempotency record` — seeds an
  authorized reviewer but no exception, asserts `not_found` + `idempotency_records` count 0.

### 3. `run-db-coverage.mjs` `parseOut` rejects unknown flags (review finding #low)
Previously a mistyped flag (e.g. `--ouput`) was silently ignored and `--out` fell back to the
committed snapshot path — so a typo in CI could overwrite the committed snapshot. `parseOut` now
throws `unrecognized argument "<token>"` on any unknown token, mirroring `normalize-coverage.mjs`.

### 4. Coverage snapshot regenerated
`coverage/provider/coverage-final.json` — editing covered functions changes their content hash, so
the Batch-0057/0058 snapshot went stale (fails-closed by design). Regenerated deterministically via
`npm run test:db:coverage`; byte-for-byte reproducible on re-run.

### 5. Documentation softening (review findings #3–#5)
- **#3 (`coverage/provider/README.md`):** "all 100% covered" → **function-entry coverage**
  (sufficient for the CRAP gate). Statement/branch coverage is **not** 100% (e.g. the
  `stableStringify` array branch is unexercised; several provider branches are cold).
- **#4 (clarification, here):** 0058's "no new runtime dependency" is **batch-local and correct for
  0058** (`c8` is dev-only). At the PR level, `pg ^8.21.0` **is** a runtime dependency — added in
  Batch 46 (`d8c7926`), backing the explicitly-allowed `lib/db/client.ts` seam, imported only by
  `client.ts` + the provider + tests (no route). This batch adds no runtime dependency.
- **#5 (clarification, here):** 0058's "verify job unchanged" is batch-local. At the PR level the
  `verify` job gained `db:check` (Batch 44) and the `FALLOW_COVERAGE` env (Batch 57); no live DB
  runs in `verify` (the import test deletes `DATABASE_URL`), so its invariants still hold.

## Out of scope (deferred, per the review)

The review's other non-blocking hardening items are **not** in this micro-batch: migration-0001
emptiness-guard comment, `withProviderExceptionReviewTransaction` ROLLBACK try/catch +
`client.release(error)`, the two `as number` casts, `--no-install` parity, the unfiltered `on: push`,
the freshness-guard canary/coverage-floor (#6/#7), and the additional untested branches. These stay
tracked for Batch B / later.

## Contract / runtime impact

None. No `api/openapi.yaml`, `lib/api/generated/**`, `app/api/**` route, `lib/db/schema.ts`,
migration (still `0000` + `0001`), or runtime-dependency change. Provider remains unwired.

## Verification (evidence)

Disposable Postgres (`postgres:16-alpine`, `127.0.0.1:55432`, fresh DB, `drizzle-kit migrate` 0000+0001):

- **Suites green:** `npm run test:db` → A1 (13 cases, incl. the new `not_found` test) + A2 (7 cases,
  incl. the new different-actor conflict test) all `PASS`.
- **TDD:** each new test was watched failing for the intended reason before the fix (orphan count 1→0;
  different-actor `replayed`→`conflict`).
- **Reproducible snapshot:** `npm run test:db:coverage` then a second regen to a temp `--out` →
  `cmp` byte-identical (deterministic; CI freshness guard stays gate-equivalent).
- **fallow verdict `warn`** (committed snapshot) **== `warn`** (fresh) at `maxCrap 30`, `--base
  origin/main`; sole critical remains the **inherited** `readExceptionPatch` (out of scope). No new
  introduced finding.
- **Baseline gate green:** `api:check`, `typecheck`, `db:check`, `test:mock-recall:contract`,
  `test:exception-review:patch`, `next build`.
- **Hygiene:** `git diff --check` clean; `git ls-files --eol` → `i/lf w/lf` for all changed files.

## Rollback (named)

Provider-logic + tests + tooling/docs only; no contract/schema/migration/route/runtime-dependency
rollback needed.

1. Revert the `actorAuthSubjectId` hash inclusion and the `deleteIdempotencyRecord` call/function in
   `lib/db/exception-review-provider.ts`.
2. Remove the two new tests and the a1 `requestHash()` actor parameter.
3. Revert the `parseOut` else-throw in `scripts/run-db-coverage.mjs`.
4. Regenerate `coverage/provider/coverage-final.json` against the reverted source.
5. Revert the `coverage/provider/README.md` wording.

## Definition of done

- [x] Finding #1 fixed + a2 test (different actor → conflict + audit).
- [x] Finding #2 fixed + a1 test (`not_found` → idempotency count 0).
- [x] Finding #low: `parseOut` rejects unknown flags.
- [x] Findings #3–#5 doc softening / clarifications.
- [x] Coverage snapshot regenerated (deterministic); fallow gate `warn` at `maxCrap 30`.
- [x] Full baseline gate + both provider suites green; LF hygiene clean.
- [x] No AI trailer (Matt sole author).

## Next

Phase 3 **Batch B** (route wiring) can now wire the provider into
`app/api/traceability/exceptions/[exceptionId]/route.ts` with the two correctness gaps closed. Tighten
`.fallowrc.jsonc` `unused-*` rules back to `error` once the staged exports are wired.
