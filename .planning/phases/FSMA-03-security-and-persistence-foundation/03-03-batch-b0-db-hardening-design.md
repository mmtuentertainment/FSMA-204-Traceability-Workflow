# Batch B0 — `audit_events` Append-Only DB Hardening — Design Spec

**Phase:** FSMA-03 Security & Persistence Foundation
**Status:** DESIGN LOCKED — awaiting written-spec review gate → `superpowers:writing-plans`
**Date:** 2026-06-05
**Branch:** `batch-b0-db-hardening` (off `origin/main` @ `41aaec0`)

## Provenance / grounding

Triple-checked design. Do not re-derive the mechanics in §8.

- **Grounded against live code:** `lib/db/exception-review-provider.ts`, `.github/workflows/contract-gate.yml`,
  `scripts/run-db-coverage.mjs`, `package.json`, `tests/db/exception-review-provider-a3.test.ts`.
- **External review #1 (Section 2)** — 5 amendments adopted (see §4).
- **External review #2 (Section 3)** — 5 issues dispositioned (see §7).

---

## 1. Scope & non-goals

**B0 delivers:** *runtime-role append-only enforcement for `audit_events`, with owner-only `TRUNCATE` retained as the
sanctioned test-reset path.* This is **NOT** full DB-level immutability — a malicious superuser doing DDL
(`ALTER TABLE … DISABLE TRIGGER`, `DROP TRIGGER`) is explicitly **out of scope**.

**B0 does NOT wire the route.** The provider stays unwired (imported by tests only) → no mutable-in-prod window →
the B0→B1 split is as-safe as the prior non-splittable bundle.

**In scope, covered by tests:** runtime-role `UPDATE`/`DELETE`/`TRUNCATE` denial (grant layer); owner/superuser
`UPDATE`/`DELETE` rejection (trigger layer); `session_replication_role = replica` bypass closed (`ENABLE ALWAYS`).

**Deferred to B1:** route activation; repoint `DATABASE_URL` → restricted `fsma204_app_runtime`; a4 content-based
fault-injection switch; persistent limiter (C4) on a separate connection; `Number.isFinite` Retry-After guard (C8a);
pool tuning/timeouts (T6/C7b); wire via `getDb()` (C7a); throttles kept OUT of `audit_events` (C9); prod role-password
provisioning (secret-managed); live-route T5 auth (route uses `fixtureAuthContextResolver` → 401 in prod until T5).

**3 tasks** (honors the ≤3-task batch rule):

1. Trigger migration.
2. Role bootstrap + CI wiring.
3. Enforcement tests + truth-surface reconciliation.

---

## 2. Keystone decisions (LOCKED)

- **HYBRID DDL.** Trigger + function → versioned **custom** Drizzle migration
  `lib/db/migrations/0002_audit_events_append_only_trigger.sql`, authored via `drizzle-kit generate --custom` so the
  journal/meta stays consistent and `db:check` (`drizzle-kit check` + `tests/db-client-import.test.ts`) stays green.
  Roles + per-table grants + `REVOKE TRUNCATE` → **separate** idempotent `lib/db/roles/runtime-roles.sql`, applied by a
  **new CI step after** `drizzle-kit migrate`. No prod creds in committed migrations.
- **a4 fault-injection switch DEFERRED to B1.** B0 does not shift a4's numeric query-index map: the trigger fires on
  `UPDATE`/`DELETE`, not the happy-path audit `INSERT` (a4 index 6) or the idempotency-completion `UPDATE` (index 7,
  on `idempotency_records`, no trigger). `tests/db/exception-review-provider-a4.test.ts` stays **UNCHANGED** in B0.

---

## 3. Section 1 — grant matrix for `fsma204_app_runtime` (LOCKED)

Derived by enumerating every query in `lib/db/exception-review-provider.ts`.

| Table | Grants | Why |
|---|---|---|
| `tenant_memberships` | `SELECT` | RBAC membership lookup (`getActiveTenantMembership`, provider:182). |
| `traceability_exceptions` | `SELECT, UPDATE` | `SELECT … FOR UPDATE` lock (provider:218) + status `UPDATE` (provider:236). No INSERT/DELETE. |
| `idempotency_records` | `SELECT, INSERT, UPDATE, DELETE` | reserve `INSERT` (provider:306); `SELECT … FOR UPDATE` (provider:334) + reclaim/complete `UPDATE` (provider:387, :441); **`DELETE`** = Batch-59 `not_found` orphan cleanup (`deleteIdempotencyRecord`, provider:470). |
| `audit_events` | **`INSERT, SELECT (id)`** — no UPDATE / DELETE / TRUNCATE | append-only writes (provider:502, :540). `SELECT (id)` is **required**: `INSERT … RETURNING id` (provider:509, :547) needs `SELECT` on returned columns. |

**Notes:**

- `SELECT … FOR UPDATE` ⇒ requires `UPDATE` privilege on the locked table (Postgres) → why exceptions + idempotency get
  `UPDATE`, not SELECT-only.
- The `audit_events SELECT (id)` reason is **`RETURNING id`**, **not** the FK. RI (foreign-key) checks bypass the
  caller's `SELECT` privilege, so `idempotency_records.audit_event_id → audit_events.id` does not force a grant.
  Column-scoped `SELECT (id)` = least privilege.
- **`REVOKE TRUNCATE ON audit_events`** = defense-in-depth. `TRUNCATE` is a **separate privilege** and a **separate
  trigger event** — the `BEFORE UPDATE OR DELETE` trigger does **not** cover it, so the REVOKE is the actual app-role
  TRUNCATE guard.
- Identity columns (`GENERATED ALWAYS AS IDENTITY`) need **no** separate sequence `USAGE` grant (table `INSERT` suffices).
- `fsma204_app_runtime` is **NOT** superuser / owner / `BYPASSRLS` / `CREATEROLE`, and **not** a member of the owner role
  (cannot `SET ROLE`) — asserted by a role-shape smoke test.
- **De-risking move:** the B0 enforcement suite runs the **full happy-path provider transaction AS `app_runtime`** and
  asserts **SUCCESS** → empirically proves the matrix (incl. `SELECT (id)`) is sufficient → makes **B1's `DATABASE_URL`
  repoint a verified no-op.**

---

## 4. Section 2 — trigger DDL + 3-way enforcement matrix (LOCKED, review #1 amendments folded in)

DDL (inside the `0002` custom migration):

```sql
CREATE FUNCTION audit_events_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = '99001';  -- distinctive custom SQLSTATE; tests assert on code + message
END;
$$;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_reject_mutation();

ALTER TABLE audit_events ENABLE ALWAYS TRIGGER audit_events_append_only;
```

- `FOR EACH STATEMENT` = blanket reject, fires even on **zero-row** statements (`WHERE false`).
- `ENABLE ALWAYS` = fires for owner/superuser **and** under `session_replication_role = replica`. (Must be set via
  `ALTER TABLE … ENABLE ALWAYS TRIGGER`, not expressible inside `CREATE TRIGGER`.)
- `TRUNCATE` is intentionally **not** a trigger event in B0 — it is blocked by `REVOKE` + tripwire tests; owner
  `TRUNCATE … CASCADE` stays as the sanctioned test reset.

**SQLSTATE decision: `99001` (custom, distinctive).** Considered the standard `09000 triggered_action_exception`
(review #2) and deliberately passed: B0's requirement is unambiguous **test assertion**, and `99001` is maximally
distinctive + owned by this invariant. `node-pg` surfaces `err.code` verbatim, so handlers (B1+) match our code/message
by design rather than inferring from class. (Reconciled from the handoff's `P0001`, which is the generic plpgsql default
and not a clean assertion target.)

**3-way enforcement matrix (what proves what):**

| Connection role | `audit_events` grants | raw UPDATE/DELETE `audit_events` | proves |
|---|---|---|---|
| `fsma204_app_runtime` (restricted runtime) | INSERT, SELECT(id) | **permission DENIED — `42501`** (grant layer, before trigger) | grant layer denies runtime tampering |
| `fsma204_audit_mutator` (TEST-ONLY; over-granted UPD/DEL) | + UPDATE, DELETE | **trigger REJECTION — `99001`** | trigger backstops independent of grants (future over-grant) |
| `postgres` owner (= inverted a3 A4-20) | owns table | **trigger REJECTION — `99001`** | trigger fires even for owner/superuser |

Owner UPDATE/DELETE rejection proves the trigger applies to **owner DML**; the **replica-mode** test proves
**`ENABLE ALWAYS`** specifically (an ordinary enabled trigger would not fire under `session_replication_role = replica`).

---

## 5. Section 3 — tests, CI wiring, coverage, truth surfaces (LOCKED)

### 5.1 Test files

**MODIFY `tests/db/exception-review-provider-a3.test.ts`** — invert A4-20 (pre-documented at a3:267-278):

- The raw `UPDATE audit_events SET reason=…` and `DELETE FROM audit_events` (currently asserting success, a3:240-265)
  flip to **expect rejection** — wrap in `assert.rejects`, assert `err.code === '99001'`, and assert the row/reason is
  **unchanged / still present**.
- **Drop** the now-moot FK-NULL juggling (a3:253-256): the `BEFORE … FOR EACH STATEMENT` trigger fires before any FK
  check, so clearing `idempotency_records.audit_event_id` is unnecessary.
- a3 connects as owner via `TEST_DATABASE_URL` (superuser in CI) → it carries the **owner-DML-rejection** leg.

**NEW `tests/db/audit-append-only-enforcement.test.ts`** — own `test`-named-DB safety fence. **6 proofs:**

1. `app_runtime` raw `UPDATE`/`DELETE audit_events` → **`42501`** (grant layer denies, before the trigger).
2. `audit_mutator` (over-granted) `UPDATE audit_events SET action='tamper_test' WHERE false` and
   `DELETE FROM audit_events WHERE false` → **`99001`** (trigger backstop). `WHERE false` + constant `SET` need no
   `SELECT` → immune to privilege false positives (review #1 amendment #4); statement trigger still fires on zero rows.
3. **Replica-mode `ENABLE ALWAYS` proof** — owner conn (`TEST_DATABASE_URL`):
   `BEGIN; SET LOCAL session_replication_role = replica; UPDATE audit_events …` → **`99001`**; `ROLLBACK`.
   (`session_replication_role` is settable only by a superuser (or a role granted `SET` on the parameter); the CI superuser/owner conn satisfies it.)
4. **Matrix-sufficiency** — `app_runtime` runs the **full provider happy-path txn → SUCCEEDS** (proves the grant set
   incl. `SELECT (id)` ⇒ B1 repoint is a verified no-op).
5. **TRUNCATE tripwire** — `has_table_privilege('fsma204_app_runtime', 'audit_events', 'TRUNCATE') = false` and same for
   `audit_mutator`; **and** actual `TRUNCATE audit_events` → **`42501`** for both roles.
6. **Role-shape smoke** — `app_runtime` not superuser/owner/`BYPASSRLS`/`CREATEROLE`; not a member of owner (can't
   `SET ROLE`).

Connects via **new env vars** `TEST_APP_RUNTIME_DATABASE_URL` + `TEST_AUDIT_MUTATOR_DATABASE_URL` (same DB
`fsma204_provider_test`, role-specific creds) plus the existing owner `TEST_DATABASE_URL` for legs 3.

**Reset harness:** owner `TRUNCATE audit_events` **alone fails** — `idempotency_records.audit_event_id` references it.
Between-case reset uses `TRUNCATE … CASCADE` (or truncates the full set
`tenant_memberships, traceability_exceptions, idempotency_records, audit_events RESTART IDENTITY CASCADE`).

### 5.2 CI wiring — `db-provider-tests` job (`.github/workflows/contract-gate.yml`)

The job runs as the `postgres` **superuser** (contract-gate.yml:90-91) — which is *why* a3's A4-20 currently shows owner
UPDATE/DELETE **succeeding** (owner bypasses grants). The `ENABLE ALWAYS` trigger fixes owner-bypass; `app_runtime`
proves the grant layer.

| Position | Step | Notes |
|---|---|---|
| after migrate (:109) | **NEW** Bootstrap runtime roles | `psql … -f lib/db/roles/runtime-roles.sql` as `postgres`. Idempotent (`DO`-block `CREATE ROLE IF NOT EXISTS`; idempotent GRANT/REVOKE). |
| existing (:111-115) | Coverage suites a1–a5 | **UNCHANGED.** Trigger exists but doesn't touch their happy-paths (they only INSERT `audit_events`); a3's inverted asserts run as owner → hit the trigger. |
| **NEW** (after coverage) | Run append-only enforcement | `npm run test:db:enforcement`, **step-scoped** env `TEST_APP_RUNTIME_DATABASE_URL` + `TEST_AUDIT_MUTATOR_DATABASE_URL`. Non-zero exit fails the job → blocks the PR (gating, same as `test:db:coverage`). |
| existing (:117-156) | Coverage freshness guard | **UNCHANGED.** |

### 5.3 Coverage decision (diverges from the handoff — grounded in `run-db-coverage.mjs`)

`scripts/run-db-coverage.mjs` uses an **explicit `SUITES` array** (a1–a5, lines 40-46) that feeds the **committed**
snapshot — **not** auto-discovery. The new enforcement test is **NOT** added to `SUITES`: it adds no new `lib/**`
coverage (a1/a2 already cover those provider lines as owner), and its value is DB trigger/grant proofs. Keeping it out →
snapshot stays pristine, the freshness guard needs no regeneration. a3 **stays** in `SUITES`; inverting its raw-SQL
tampering asserts doesn't change `lib/**` coverage (raw SQL executes no lib code).

### 5.4 `package.json` scripts

- **NEW** `test:db:enforcement`: `node --experimental-strip-types tests/db/audit-append-only-enforcement.test.ts`.
- `test:db` **stays a1–a5** (works with just `TEST_DATABASE_URL`). The enforcement script is documented as requiring the
  role bootstrap + the two role connection strings, so folding it into `test:db` (which would break `npm run test:db`
  for anyone who hasn't bootstrapped roles) is avoided.

### 5.5 Truth-surface reconciliation (part of Task 3)

- **NEW** `ops/deltas/0062-batch-b0-db-hardening.md` — next free delta (last committed = `0061-batch-a-acceptance`;
  PR #20 added none). Documents: the runtime-role-enforcement framing (not DB-immutability); `99001` choice + `09000`
  alternative; the `TRUNCATE … CASCADE` reset rationale + owner-TRUNCATE-test-only scope; the P1 CI-creds rationale.
- De-stale **"non-splittable bundle" → "B0→B1 split"** in: `.planning/STATE.md` (+ "Next Step" → B0 scope) and
  `.planning/codebase/{CONCERNS,STRUCTURE,CONVENTIONS,STACK}.md` and
  `.planning/phases/FSMA-03…/03-02-first-mutating-write-design.md`. (Exact wording verified at plan/execute time.)

---

## 6. Task breakdown (≤3 tasks)

| Task | Files | Contents |
|---|---|---|
| **1 — Trigger migration** | `lib/db/migrations/0002_audit_events_append_only_trigger.sql` (+ drizzle journal/meta) | function + `BEFORE UPDATE OR DELETE … FOR EACH STATEMENT` trigger + `ENABLE ALWAYS`, SQLSTATE `99001`. Via `drizzle-kit generate --custom`; `db:check` stays green. |
| **2 — Role bootstrap + CI** | `lib/db/roles/runtime-roles.sql`; `.github/workflows/contract-gate.yml`; `package.json` | idempotent roles + per-table grants + `REVOKE TRUNCATE`; CI role-bootstrap step + enforcement step + env; new `test:db:enforcement` script. |
| **3 — Enforcement tests + truth surfaces** | `tests/db/exception-review-provider-a3.test.ts` (modify); `tests/db/audit-append-only-enforcement.test.ts` (new); `ops/deltas/0062-batch-b0-db-hardening.md`; `.planning/STATE.md`; `.planning/codebase/*`; `03-02-first-mutating-write-design.md` | invert A4-20; 6-proof enforcement suite; delta + de-stale "bundle" wording. |

---

## 7. Review dispositions (Section 3, external review #2)

- **P1 (CI role passwords hard-coded) — DECLINED moving to GH secrets; documented instead.** Disposable
  `127.0.0.1`-only ephemeral service container; parity with the existing hard-coded `postgres:postgres`
  (contract-gate.yml:90-91); the creds guard nothing. `runtime-roles.sql` splits concerns: grants/revokes are the
  durable security artifact; `LOGIN PASSWORD` is a TEST-ONLY placeholder; prod password provisioning is B1
  (secret-managed `ALTER ROLE`). Recorded in delta 0062.
- **P2 (enforcement-test visibility) — CLARIFIED.** "Excluded from coverage `SUITES`" ≠ "not gating." The suite runs as
  its own CI step; a thrown assert exits non-zero → fails the job → blocks the PR. The Contract Gate is already a
  required check; no badge added.
- **P3 (TRUNCATE-CASCADE + owner-test-only docs) — ACCEPTED.** Delta 0062 documents both.
- **P3 (SQLSTATE) — `99001` kept, deliberate choice documented** with `09000` considered (§4).
- **P3 (spec location + cross-links) — ACCEPTED** (this file + §10).

---

## 8. Verified mechanics (don't re-derive)

- `db:check` = `drizzle-kit check` (schema↔journal/snapshots) + `tests/db-client-import.test.ts`. Custom migration via
  `drizzle-kit generate --custom` maintains journal/meta → check stays green (Context7-verified,
  `/drizzle-team/drizzle-orm-docs`).
- a4 `FaultInjectionPool` injects at **numeric query index**. Success map (a4:82-89): 1 BEGIN, 2 membership SELECT,
  3 idempotency INSERT, 4 exception SELECT FOR UPDATE, 5 exception UPDATE, 6 audit INSERT, 7 idempotency completion
  UPDATE. Faults at 6 & 7. **B0 does not shift this** (trigger is on UPDATE/DELETE of `audit_events`, not these).
- Provider entry: `reviewTraceabilityExceptionInTransaction(pool, req)` → `withProviderExceptionReviewTransaction`
  (`pool.connect` → BEGIN/COMMIT/ROLLBACK). Limiter seam: `request.limiter`, checked AFTER RBAC, BEFORE idempotency
  reserve; a rejecting `check()` propagates → rolls back → **fail-CLOSED** (that's B1).
- DB client (`lib/db/client.ts`): `getDb()` lazy singleton from `DATABASE_URL`; `createDbClient({connectionString,
  poolConfig})` per-call Pool; `closeDbClient()` tears down singleton. `poolConfig` seam = B1's T6 pool tuning. B1
  repoint = set `DATABASE_URL` to the restricted-role connstring (getDb picks it up).
- FKs: `idempotency_records.audit_event_id → audit_events.id` (ON DELETE no action). The FK does **not** force a
  `SELECT` grant on `audit_events` for `app_runtime` (RI checks bypass caller SELECT); the `SELECT (id)` grant is forced
  solely by `RETURNING id`.
- Schema (migration 0000): `audit_events` append-only by COMMENT only today (no trigger). `traceability_exceptions` PK
  is text `id`. All other tables bigint IDENTITY.

---

## 9. Open items for `writing-plans`

- Verify exact stale wording in `STATE.md` + `.planning/codebase/{CONCERNS,STRUCTURE,CONVENTIONS,STACK}.md` +
  `03-02-first-mutating-write-design.md` before editing.
- Confirm `postgres:16-alpine` auth (scram over TCP) for role logins; set role `LOGIN PASSWORD` in `runtime-roles.sql`
  accordingly. Proposed roles/creds: `fsma204_app_runtime` / `fsma204_audit_mutator`, test passwords parity with
  `postgres:postgres` (TEST-ONLY).
- Confirm the new enforcement suite follows the a3 harness pattern (top-level `await` over a `tests[]` array; a thrown
  assert exits the process non-zero) so failures gate CI.
- Confirm `assert.rejects` shape: `node-pg` exposes SQLSTATE as `err.code`.

---

## 10. Cross-links

- Delta: `ops/deltas/0062-batch-b0-db-hardening.md` (authored in Task 3).
- State: `.planning/STATE.md` (de-stale "non-splittable bundle" → B0→B1 split; "Next Step" → B0).
- This design: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-03-batch-b0-db-hardening-design.md`.
- Predecessor design: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md`.
