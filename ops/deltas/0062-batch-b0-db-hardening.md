# Batch 0062 - Batch B0: audit_events append-only DB hardening (no route wiring)

## Summary

Implements **Phase 3 Batch B0** - the DB-hardening half of the Batch B split (design
`03-03`). It enforces append-only on `audit_events` at the database layer and proves it,
**without** wiring the provider onto any live route. Because no route is activated, there
is no mutable-in-prod window, so splitting B0 out of the prior "non-splittable bundle" is
as-safe as the bundle while honoring the <=3-task batch rule.

Three layers, all proven in CI:

1. A `BEFORE UPDATE OR DELETE ON audit_events FOR EACH STATEMENT` trigger declared
   `ENABLE ALWAYS` (fires for the owner/superuser AND under
   `session_replication_role = replica`), raising custom SQLSTATE `99001` (migration
   `0002`, a custom Drizzle migration so `db:check` stays green).
2. A least-privilege runtime role `fsma204_app_runtime` whose grants deny
   `UPDATE`/`DELETE`/`TRUNCATE` on `audit_events` one layer earlier (`42501`), with a
   `REVOKE TRUNCATE` defense-in-depth (TRUNCATE is a separate privilege and a separate
   trigger event the BEFORE UPDATE/DELETE trigger does not cover).
3. A TEST-ONLY over-granted role `fsma204_audit_mutator` that proves the trigger
   backstops the grant layer (rejected `99001` even though its grants would allow the DML).

This is **NOT** full DB-level immutability: a malicious superuser doing DDL
(`ALTER TABLE … DISABLE TRIGGER`, `DROP TRIGGER`) is explicitly out of scope.

## Files Changed

- `lib/db/migrations/0002_audit_events_append_only_trigger.sql` (new) + drizzle
  `meta/_journal.json` / `meta/0002_snapshot.json` - the custom trigger migration.
- `tests/db/exception-review-provider-a3.test.ts` - inverted the A4-20 proof from
  "privileged raw UPDATE/DELETE succeed (append-only is a convention)" to
  "…are rejected by the ENABLE ALWAYS trigger (99001) + row unchanged"; dropped the
  now-moot FK-NULL juggling (the BEFORE … FOR EACH STATEMENT trigger fires before any RI
  check).
- `lib/db/roles/runtime-roles.sql` (new) - idempotent role + per-table grant +
  REVOKE TRUNCATE bootstrap.
- `tests/db/audit-append-only-enforcement.test.ts` (new) - the 6-proof enforcement suite.
- `package.json` - new `test:db:enforcement` script (`test:db` / `test:db:coverage` /
  coverage `SUITES` untouched).
- `.github/workflows/contract-gate.yml` - new "Bootstrap runtime roles" step (after
  migrate) and "Run append-only enforcement suite" step (after coverage, step-scoped role
  env), gating exactly like `test:db:coverage`.
- `ops/deltas/0062-batch-b0-db-hardening.md` (this report) + truth-surface de-stale
  (`.planning/STATE.md`, `.planning/codebase/CONCERNS.md`, `03-02-first-mutating-write-design.md`).

## Decisions recorded

- **SQLSTATE `99001` (custom, distinctive), not the standard `09000 triggered_action_exception`.**
  B0's requirement is unambiguous TEST ASSERTION; `99001` is maximally distinctive and owned
  by this invariant. `node-pg` surfaces `err.code` verbatim, so B1+ handlers match the
  code/message by design rather than inferring from class.
- **TRUNCATE is blocked by REVOKE, not by the trigger.** TRUNCATE is a separate privilege and
  a separate trigger event; the BEFORE UPDATE/DELETE trigger does not cover it. Owner
  `TRUNCATE … CASCADE` is retained as the sanctioned between-case test reset (a plain owner
  `TRUNCATE audit_events` alone fails on the `idempotency_records.audit_event_id` FK, so the
  reset truncates the full set with `CASCADE`/`RESTART IDENTITY`).
- **P1 (CI role passwords hard-coded) - declined moving to GH secrets; documented.** The
  `127.0.0.1`-only disposable service container's creds guard nothing and are at parity with
  the existing hard-coded `postgres:postgres`. `runtime-roles.sql` splits concerns: the
  grants/revokes are the durable security artifact; `LOGIN PASSWORD` is a TEST-ONLY
  placeholder; prod password provisioning is B1 (secret-managed `ALTER ROLE`).
- **The enforcement suite is excluded from coverage `SUITES` but still GATES.** It adds no new
  `lib/**` coverage (its value is DB trigger/grant proofs); it runs as its own CI step whose
  thrown assert fails the job. The committed coverage snapshot is unchanged (the inverted a3
  still exercises the same provider lines).

## Contract and runtime impact

None. No `api/openapi.yaml`, `lib/api/generated/**`, `app/api/**` route, or `lib/db/schema.ts`
change. The only migration added is the append-only trigger (`0002`); the table shape is
unchanged. The provider remains imported by tests only - no route wiring (the a1 route-guard
assertion still holds). Deferred to B1: route activation, `DATABASE_URL` repoint to
`fsma204_app_runtime`, persistent limiter, the carry-forward review items, and prod role
passwords.

## Verification (evidence)

- `npm run db:check` green (custom migration keeps journal/snapshot consistent).
- Against a disposable `postgres:16-alpine` (`127.0.0.1`, db name contains `test`):
  `npx drizzle-kit migrate` → `psql -f lib/db/roles/runtime-roles.sql` → `npm run test:db`
  (a1-a5 green, a3 now proves enforcement) → `npm run test:db:enforcement` (P1-P6 green).
- `git diff --check` clean (LF / UTF-8 / no-BOM).
- CI `db-provider-tests` job runs migrate → bootstrap roles → coverage (a1-a5) →
  enforcement (P1-P6) → freshness guard, all green.

## Rollback (named)

1. `git revert` the Task 2 commit (CI steps + roles + enforcement suite + script).
2. `git revert` the Task 1 commit (migration `0002` + a3 inversion). On an existing database,
   also `DROP TRIGGER audit_events_append_only ON audit_events; DROP FUNCTION
   audit_events_reject_mutation();` (fresh CI databases need nothing).
3. Delete this delta + revert the truth-surface wording.

## Next

**Batch B1** (route wiring + runtime hardening for `PATCH /api/traceability/exceptions/{exceptionId}`):
repoint `DATABASE_URL` to `fsma204_app_runtime` (a verified no-op per B0 proof P4), wire the
provider via `getDb()`, add the persistent rate limiter on a separate connection, clear the
deferred review carry-forwards (fail-closed limiter, `Number.isFinite` Retry-After guard,
pool tuning), and activate PATCH success behind the deferred T5 auth.
