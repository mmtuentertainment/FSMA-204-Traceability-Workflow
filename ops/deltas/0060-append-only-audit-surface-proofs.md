# Batch 60 - Append-Only Audit Surface Proofs (A4-18/19/20)

## Summary

Adds the first of three load-bearing provider-test clusters required for Batch A
acceptance (Batch 50 criterion #2, "must not be waived"): the **append-only audit
surface** proofs. This is a **pure test slice — zero runtime code**. It proves the
provider exposes only append paths for `audit_events` and documents that append-only is
a convention in this scaffold, not a database-enforced constraint.

It does not wire the live route, does not import the DB client from any route, does not
change the OpenAPI contract or generated types, adds no migration, and adds no runtime
dependency. Batch B (route wiring) remains gated until Batch A is fully accepted.

## Files Changed

- `tests/db/exception-review-provider-a3.test.ts` - **new.** Two provider-backed Batch A3
  cases (A4-18/19 structural surface guard, A4-20 behavioral non-enforcement) against a
  real PostgreSQL test database, following the a1/a2 harness exactly.
- `package.json` - `test:db` now also runs the a3 suite (local parity with the coverage
  regen). No dependency change.
- `scripts/run-db-coverage.mjs` - the `SUITES` array (the coverage-regen input, and the
  exact set the CI `db-provider-tests` job executes via `test:db:coverage`) now includes
  a3, so a3 actually runs in CI and contributes to the committed coverage snapshot.
- `coverage/provider/coverage-final.json` - regenerated with a1+a2+a3. The covered file
  set is unchanged (`lib/db/exception-review-provider.ts`, `lib/shared/canonical-json.ts`);
  hit counts and branch instrumentation shifted (a3 exercises additional idempotency
  reserve/reclaim code paths the a1+a2 set did not — the provider `branchMap` grows 80→81;
  no provider source change). fallow verdict stays `pass`; the transform is byte-deterministic.
- `ops/deltas/0060-append-only-audit-surface-proofs.md` - this report.

## Contract And Runtime Impact

No OpenAPI contract change. `api/openapi.yaml` and the generated types are unchanged.

No live route wiring. `app/api/traceability/exceptions/[exceptionId]/route.ts` remains
fixture-backed and imports neither `lib/db/client.ts` nor the provider module. No
production source in `lib/**` changed — this batch is tests + test tooling only.

## Tests Added

`tests/db/exception-review-provider-a3.test.ts` covers 2 load-bearing A3 cases:

1. **A4-18/19 — append-only audit surface guard (structural).** Imports the provider
   module namespace (TS type-only exports are erased by `--experimental-strip-types`, so
   the runtime namespace is exactly the surface a route could call) and asserts that **no
   exported symbol names both an audit and a mutating verb** (`/audit/i` **and**
   `/(update|delete|remove)/i`). The two append entry points
   (`appendExceptionReviewAuditEvent`, `appendExceptionReviewErrorAuditEvent`) must exist
   as callable functions. The verb-with-audit pairing is what keeps the unrelated
   `deleteIdempotencyRecord` correctly safe. Permanent positive/negative controls assert
   the predicate flags synthetic audit mutators (`deleteAuditEvent`, `updateAuditEvent`,
   …) and rejects the legitimate append fns + `deleteIdempotencyRecord`, so the guard is
   provably non-vacuous; a transient injected `deleteAuditEvent` was confirmed to fail the
   final assertion during development (TDD red), then reverted.
2. **A4-20 — append-only is a convention, not DB-enforced (behavioral).** After an
   accepted transition writes one `audit_events` row, a privileged raw `UPDATE` succeeds
   (`rowCount === 1`, re-read confirms the mutation took effect) and a privileged raw
   `DELETE` succeeds (`rowCount === 1`, count drops to 0). The accepted transition's
   completed idempotency record FK-references the audit row
   (`idempotency_records.audit_event_id`, `ON DELETE no action`); that FK is a
   **referential** constraint, not an append-only guard, so the test clears it before the
   DELETE so the DELETE exercises only the (absent) append-only enforcement on
   `audit_events` itself. This documents the expected non-enforcement — migration `0000`
   declares append-only only via a table `COMMENT`; DB-level enforcement (triggers /
   `REVOKE`) is deferred to Batch B runtime hardening (T6/T9). The test is the regression
   guard that will flip and demand updating the day enforcement is added.

The suite requires an explicit `TEST_DATABASE_URL` whose database name looks like a test
database (`/(^|[_-])(test|a3)([_-]|$)/i`). Local verification used a disposable
`postgres:16-alpine` container on `127.0.0.1` (never `localhost`); migrations were applied
with Drizzle; the container was removed afterward.

## Verification Commands And Results

- `npm run api:check` - passed.
- `npm run db:check` - passed.
- `npm run typecheck` - passed (a3 type-checks clean).
- `npm run build` - passed.
- `npm run test:mock-recall:contract` - passed.
- `npm run test:exception-review:patch` - passed.
- Disposable provider-backed DB (`postgres:16-alpine`, `127.0.0.1:55432`,
  `fsma204_a1a2a3_test`):
  - `npx drizzle-kit migrate` - applied `0000` + `0001` to a fresh database.
  - `node --experimental-strip-types tests/db/exception-review-provider-a3.test.ts` -
    both A3 cases passed.
  - `npm run test:db:coverage` - a1 + a2 + a3 all green; snapshot regenerated; the
    regenerated snapshot is byte-identical to a second independent regen (deterministic).
- fallow gate (`FALLOW_COVERAGE=coverage/provider/coverage-final.json npx --no-install
  fallow audit --base origin/main`) - verdict `pass`.
- Coverage freshness guard (CI semantics, run locally): committed verdict `pass`, fresh
  verdict `pass` (equal, neither `fail`) → guard passes.

## Batch 50 Scope Compliance

- Forbidden, and confirmed absent from the diff: any `app/api/**` change; any route import
  of `lib/db/client.ts`; any `api/openapi.yaml` / generated-type change; any migration;
  any new runtime dependency. `c8` (used by the coverage regen) was already a devDependency
  from Batch 0058 — no dependency was added here.

## Remaining Batch A Inventory Not Covered By A3

This closes the append-only audit surface cluster only. The remaining load-bearing
clusters (the next two approved micro-batches) are:

- **Batch 61 — T1 atomicity forced-fault rollback (A3-15/16, A4-17):** a fault-injection
  `ProviderDbClient` wrapper that throws on the Nth query, proving the exception UPDATE +
  audit INSERT + idempotency completion roll back together (no partial mutation / orphan
  audit / orphan completion). No production change to the provider (already
  single-transaction).
- **Batch 62 — Rate-limit posture (Area 5, load-bearing A5-02..06, A5-12):** a limiter
  seam + `problem.ts` `rateLimited` builder + an optional injected limiter checkpoint in
  the provider after RBAC, before reserve. No OpenAPI edit (the contract already declares
  `RateLimited` / `Retry-After`).

After Batch 62: write the Batch A acceptance delta, update the truth surfaces, and declare
Batch A accepted → which unblocks Batch B (itself a separately-approved code-scope batch).

## Rollback Path

Pure additive test slice; rollback is non-destructive:

- Delete `tests/db/exception-review-provider-a3.test.ts`.
- Revert the `test:db` line in `package.json` (remove the a3 segment).
- Revert the `SUITES` entry in `scripts/run-db-coverage.mjs` (remove the a3 line).
- Regenerate `coverage/provider/coverage-final.json` via `npm run test:db:coverage` with
  only a1 + a2 in `SUITES` (restores the prior counts), or `git checkout` the prior
  committed snapshot.
- Delete `ops/deltas/0060-append-only-audit-surface-proofs.md`.

No migration was added, so no database state needs reverting.
