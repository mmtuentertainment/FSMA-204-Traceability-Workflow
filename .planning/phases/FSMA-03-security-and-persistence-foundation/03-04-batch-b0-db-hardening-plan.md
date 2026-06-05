# Batch B0 — `audit_events` Append-Only DB Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce append-only on `audit_events` at the database layer — a `BEFORE UPDATE OR DELETE … ENABLE ALWAYS`
trigger (backstops owner/superuser + replica) plus a least-privilege runtime role whose grants deny the same mutations
one layer earlier — and prove all three layers (grant deny, trigger reject, replica reject) in CI, without wiring the
provider onto any live route.

**Architecture:** HYBRID DDL. The trigger + function ship as a versioned **custom** Drizzle migration
(`lib/db/migrations/0002_…`) so `db:check` stays green. Roles + per-table grants + `REVOKE TRUNCATE` ship as a
**separate** idempotent `lib/db/roles/runtime-roles.sql`, applied by a new CI step after `drizzle-kit migrate` (no prod
creds in committed migrations). Enforcement is proven by inverting the existing a3/A4-20 non-enforcement assert (owner
rejection) and a new 6-proof suite connecting as two TEST-ONLY roles + the owner. The provider stays unwired → no
mutable-in-prod window → this B0 slice is as-safe as the prior non-splittable bundle.

**Tech Stack:** PostgreSQL 16 (trigger/plpgsql, role grants, column-scoped privileges, `session_replication_role`),
Drizzle Kit 0.31 (`generate --custom`, `migrate`, `check`), `node --experimental-strip-types` test harness (top-level
`await` over a `tests[]` array; a thrown assert exits non-zero → gates CI), `node-pg` (`err.code` = SQLSTATE), GitHub
Actions Contract Gate.

**Spec:** `.planning/phases/FSMA-03-security-and-persistence-foundation/03-03-batch-b0-db-hardening-design.md`
(DESIGN LOCKED + APPROVED, grounded 48/48). This plan is the execution contract for that spec.

---

## Task-grouping note (refinement of spec §6 — please read)

Spec §6 lists three tasks: (1) trigger migration, (2) roles + CI, (3) tests + truth surfaces — with "invert A4-20"
under Task 3. This plan keeps **the same three deliverables and every approved decision** (same migration, same
SQLSTATE `99001`, same grant matrix, same 6 proofs, same truth surfaces) but moves **one** boundary so every commit is
independently CI-green and each task is a genuine red→green cycle:

| Plan task | Contents | Why this boundary |
|---|---|---|
| **Task 1** | Trigger migration **+ invert the a3/A4-20 assert** | Applying the migration *breaks* a3/A4-20 (owner UPDATE/DELETE now rejected). Migration + its directly-coupled regression guard land together → the commit is green; the migration's red→green is observable on the existing test. |
| **Task 2** | `runtime-roles.sql` + 6-proof enforcement suite + CI wiring + `package.json` script | The suite *needs* the roles to connect; roles + their proof + their CI gate are one coherent, independently-green deliverable. |
| **Task 3** | Truth surfaces (delta 0062 + `STATE.md` de-stale + `CONCERNS.md`/`03-02` reconciliation) | Docs-only; no code. |

If you prefer the spec's exact §6 split (migration alone in T1, a3 inversion in T3), it is a trivial re-split — but
note that splitting leaves the `db-provider-tests` CI job **red between T1 and T3** on two counts: (a) a3 asserts the
old non-enforcement behavior the migration just removed, and (b) §6-T2 wires a "Run append-only enforcement" CI step
that invokes `test:db:enforcement` — whose npm script *and* test file don't exist until §6-T3. The pairing above keeps
every commit green and avoids both.

---

## Prerequisites — local environment (needed for Tasks 1 & 2 red→green)

Tasks 1 and 2 verify against a real Postgres. Provision a disposable one matching the CI service
(`coverage/provider/README.md` is the canonical reference; local port `55432` avoids clashing with a system Postgres):

```bash
# Disposable Postgres (mirrors the CI service: postgres:16-alpine, scram auth, db name contains "test").
docker run -d --name fsma204-b0-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=fsma204_provider_test \
  -p 55432:5432 postgres:16-alpine

# Owner/superuser connection (a1–a5 + owner legs use this).
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/fsma204_provider_test"
export TEST_DATABASE_URL="$DATABASE_URL"        # db name contains "test" → passes every provider fence

npx drizzle-kit migrate --config drizzle.config.ts   # applies 0000, 0001 (and 0002 once Task 1 exists)

# Restricted-role connection strings (used by the Task 2 enforcement suite; roles created by Task 2's runtime-roles.sql).
export TEST_APP_RUNTIME_DATABASE_URL="postgresql://fsma204_app_runtime:fsma204_app_runtime@127.0.0.1:55432/fsma204_provider_test"
export TEST_AUDIT_MUTATOR_DATABASE_URL="postgresql://fsma204_audit_mutator:fsma204_audit_mutator@127.0.0.1:55432/fsma204_provider_test"
```

Use `127.0.0.1`, never `localhost` (IPv6 `::1` → `pg.Pool` ECONNRESET against a published Docker port). Tear down with
`docker rm -f fsma204-b0-pg` when done. The committed `coverage/provider/coverage-final.json` is **not** regenerated by
B0: the inverted a3 still exercises the same provider lines, so its `lib/**` coverage (and the snapshot) is unchanged.

**Carry constraints (all tasks):** No AI co-author trailer (Matt is sole author). LF / no-BOM
(`git diff --cached --check` must be clean). The fallow agent gate runs on every `git commit`/`git push` and blocks on
`verdict: fail`. Use `;`/`&&` for sequential shell (a bare `&` backgrounds). Context7 first for any library docs.

---

## File Structure

| Path | New/Modify | Responsibility |
|---|---|---|
| `lib/db/migrations/0002_audit_events_append_only_trigger.sql` | **New** (via `drizzle-kit generate --custom`) | The append-only function + `BEFORE UPDATE OR DELETE … FOR EACH STATEMENT` trigger + `ENABLE ALWAYS`. SQLSTATE `99001`. |
| `lib/db/migrations/meta/_journal.json`, `meta/0002_snapshot.json` | **Modify/New** (auto, by `generate --custom`) | Drizzle journal/snapshot bookkeeping so `db:check` stays green. Do not hand-edit. |
| `tests/db/exception-review-provider-a3.test.ts` | **Modify** | Invert the A4-20 proof: owner raw UPDATE/DELETE now expect `99001` + row-unchanged; drop the now-moot FK-NULL juggling. |
| `lib/db/roles/runtime-roles.sql` | **New** | Idempotent bootstrap of `fsma204_app_runtime` (least-privilege) + `fsma204_audit_mutator` (TEST-ONLY over-grant); per-table grants; `REVOKE TRUNCATE`. |
| `tests/db/audit-append-only-enforcement.test.ts` | **New** | 6-proof enforcement suite (grant deny 42501, trigger reject 99001, replica ENABLE ALWAYS, matrix-sufficiency happy-path, TRUNCATE tripwire, role-shape smoke). |
| `package.json` | **Modify** | New `test:db:enforcement` script. `test:db` / `test:db:coverage` / `SUITES` untouched. |
| `.github/workflows/contract-gate.yml` | **Modify** | New "Bootstrap runtime roles" step (after migrate) + new "Run append-only enforcement" step (after coverage) with step-scoped role env. |
| `ops/deltas/0062-batch-b0-db-hardening.md` | **New** | Records the runtime-role-enforcement framing, `99001` vs `09000`, TRUNCATE=REVOKE-not-trigger + reset rationale, P1 CI-creds rationale. |
| `.planning/STATE.md` | **Modify** | De-stale "non-splittable bundle" → B0→B1 split; "Next Step" → B0 in progress. |
| `.planning/codebase/CONCERNS.md` | **Modify** | Clarify "Batch B work" → B1 route wiring; B0 adds DB enforcement without wiring. |
| `.planning/phases/FSMA-03-…/03-02-first-mutating-write-design.md` | **Modify** | Mark decision #9 (one slice vs split) resolved → B0→B1. |

---

## Task 1 — Append-only trigger migration (+ invert a3/A4-20)

**Files:**
- Create: `lib/db/migrations/0002_audit_events_append_only_trigger.sql` (via `drizzle-kit generate --custom`)
- Modify (auto): `lib/db/migrations/meta/_journal.json`, `lib/db/migrations/meta/0002_snapshot.json`
- Modify: `tests/db/exception-review-provider-a3.test.ts` (the second `tests[]` entry, currently a3:216-280)

- [ ] **Step 1: Generate the empty custom migration**

Run (creates the `0002_…` file + appends the journal entry + writes the snapshot — do NOT hand-create these):

```bash
npx drizzle-kit generate --custom --name audit_events_append_only_trigger --config drizzle.config.ts
```

Expected: a new empty `lib/db/migrations/0002_audit_events_append_only_trigger.sql`, a 3rd entry (`idx: 2`) in
`meta/_journal.json`, and a `meta/0002_snapshot.json`. (If the generated filename differs, drizzle used a random name —
re-run with the `--name` flag; the spec mandates exactly `0002_audit_events_append_only_trigger.sql`.)

- [ ] **Step 2: Author the trigger DDL into the generated file**

Replace the empty `0002_audit_events_append_only_trigger.sql` contents with (keep the `--> statement-breakpoint`
markers — drizzle-kit splits statements on them, never on the function body's internal `;`):

```sql
CREATE FUNCTION audit_events_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = '99001';  -- distinctive custom SQLSTATE; tests assert on code + message
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_reject_mutation();
--> statement-breakpoint
ALTER TABLE audit_events ENABLE ALWAYS TRIGGER audit_events_append_only;
```

- [ ] **Step 3: Verify `db:check` stays green (journal/snapshot consistency)**

Run:

```bash
npm run db:check
```

Expected: PASS — `drizzle-kit check` reports no schema↔journal/snapshot drift (the custom migration adds no schema
change, so the snapshot equals 0001's), and the db-client import safety test prints
`DB client import check passed without DATABASE_URL.`

- [ ] **Step 4: Apply the migration locally and watch it BREAK the existing a3/A4-20 (RED)**

With the Prerequisites env exported and the disposable Postgres up:

```bash
npx drizzle-kit migrate --config drizzle.config.ts
node --experimental-strip-types tests/db/exception-review-provider-a3.test.ts
```

Expected: the suite now FAILS at the A4-20 case — the raw `UPDATE audit_events …` no longer returns `rowCount === 1`;
it throws SQLSTATE `99001` (the `ENABLE ALWAYS` trigger fires even for the owner/superuser). This RED proves the trigger
works; Step 5 inverts the assert to GREEN. (Trigger sanity check, optional:
`psql "$DATABASE_URL" -c "SELECT tgname, tgenabled FROM pg_trigger WHERE tgname='audit_events_append_only'"` →
`tgenabled = A` for ENABLE ALWAYS.)

- [ ] **Step 5: Invert the a3/A4-20 proof (make it GREEN)**

In `tests/db/exception-review-provider-a3.test.ts`, replace the **entire second `tests[]` entry** — the one currently
named `"append-only is a convention, not DB-enforced: privileged raw UPDATE and DELETE on audit_events both succeed
(A4-20)"` (a3:216-280, including its trailing `NOTE for Batch B` comment) — with:

```javascript
  {
    name: "audit_events is DB-enforced append-only: privileged raw UPDATE and DELETE are both rejected by the ENABLE ALWAYS trigger (A4-20)",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(outcome);

      const auditId = outcome.auditEventId;
      assert.equal(await countRows("audit_events"), 1);

      // A privileged raw UPDATE is now REJECTED by the BEFORE UPDATE trigger
      // (migration 0002, declared ENABLE ALWAYS) even though this connection is the
      // Postgres owner/superuser. The distinctive custom SQLSTATE 99001 is the
      // assertion target — append-only is enforced at the DB layer, not by COMMENT.
      await assert.rejects(
        async () => {
          await pool.query(`UPDATE audit_events SET reason = $2 WHERE id = $1`, [
            auditId,
            "tampered-by-a3-enforcement-proof",
          ]);
        },
        (error: unknown) => {
          assert.equal((error as { code?: string }).code, "99001");
          return true;
        },
      );
      // The row is unchanged — the trigger fires BEFORE any row is touched.
      const afterUpdate = await pool.query<{ reason: string | null }>(
        `SELECT reason FROM audit_events WHERE id = $1`,
        [auditId],
      );
      assert.equal(afterUpdate.rows[0]?.reason, "ambiguous_lot_code");

      // A privileged raw DELETE is rejected for the same reason. No FK-NULL juggling
      // is needed (the prior test cleared idempotency_records.audit_event_id first):
      // the BEFORE … FOR EACH STATEMENT trigger fires before any referential-integrity
      // check, so the idempotency FK never participates.
      await assert.rejects(
        async () => {
          await pool.query(`DELETE FROM audit_events WHERE id = $1`, [auditId]);
        },
        (error: unknown) => {
          assert.equal((error as { code?: string }).code, "99001");
          return true;
        },
      );
      assert.equal(await countRows("audit_events"), 1);

      // The grant-layer denial (restricted runtime role → 42501) and the replica-mode
      // ENABLE ALWAYS proof live in tests/db/audit-append-only-enforcement.test.ts.
      // This case carries the owner/superuser-DML rejection leg of the 3-way matrix.
    },
  },
```

- [ ] **Step 6: Run a3 to verify GREEN, then the full a1–a5 suite for no regression**

```bash
node --experimental-strip-types tests/db/exception-review-provider-a3.test.ts
npm run test:db
```

Expected: a3 prints `PASS audit_events is DB-enforced append-only…` and
`Provider-backed exception-review Batch A3 tests passed.`; `npm run test:db` runs a1→a5 and prints each suite's pass
line. (a1/a2/a4/a5 perform no raw UPDATE/DELETE on `audit_events`; their owner `TRUNCATE … CASCADE` resets are not a
trigger event, so the trigger does not touch them.)

- [ ] **Step 7: Commit**

```bash
git add lib/db/migrations/0002_audit_events_append_only_trigger.sql lib/db/migrations/meta/_journal.json lib/db/migrations/meta/0002_snapshot.json tests/db/exception-review-provider-a3.test.ts
git commit -m "feat(batch-b0): DB-enforce audit_events append-only via ENABLE ALWAYS trigger (migration 0002); invert a3/A4-20 to enforcement"
```

---

## Task 2 — Runtime roles + grant matrix + 6-proof enforcement suite + CI wiring

**Files:**
- Create: `lib/db/roles/runtime-roles.sql`
- Create: `tests/db/audit-append-only-enforcement.test.ts`
- Modify: `package.json` (add `test:db:enforcement`)
- Modify: `.github/workflows/contract-gate.yml` (bootstrap-roles step + enforcement step)

- [ ] **Step 1: Write the failing enforcement suite (RED — roles don't exist yet)**

Create `tests/db/audit-append-only-enforcement.test.ts` with the complete content below. It connects as three roles
(owner + the two runtime roles), so before `runtime-roles.sql` exists the role connections fail → RED.

```typescript
import assert from "node:assert/strict";

import pg from "pg";
import type { Pool, PoolClient } from "pg";

import { reviewTraceabilityExceptionInTransaction } from "../../lib/db/exception-review-provider.ts";
import type { ProviderExceptionReviewRequest } from "../../lib/db/exception-review-provider.ts";

const { Pool: PgPool } = pg;

const tenant = "provider-enf-tenant";
const reviewer = "provider-enf-reviewer";
const exceptionId = "provider-enf-exception";
const sourceDocumentRef = "source-doc://provider-enf/evidence";
const now = new Date("2026-06-05T12:00:00.000Z");

type TestCase = { name: string; run: () => Promise<void> };

// Owner/superuser (seeds, resets, owner-only legs). The two runtime roles are the
// system under test: app_runtime is least-privilege; audit_mutator is a TEST-ONLY
// over-granted role used only to prove the trigger backstops the grant layer.
const ownerPool: Pool = new PgPool({ connectionString: resolveRoleUrl("TEST_DATABASE_URL"), max: 2 });
const appRuntimePool: Pool = new PgPool({ connectionString: resolveRoleUrl("TEST_APP_RUNTIME_DATABASE_URL"), max: 2 });
const auditMutatorPool: Pool = new PgPool({ connectionString: resolveRoleUrl("TEST_AUDIT_MUTATOR_DATABASE_URL"), max: 2 });

function resolveRoleUrl(envName: string): string {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`${envName} is required for the append-only enforcement suite.`);
  }
  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
    throw new Error(
      `Refusing to run enforcement tests unless ${envName} names an explicit test database.`,
    );
  }
  return value;
}

function code(error: unknown): string | undefined {
  return (error as { code?: string }).code;
}

async function countAuditEvents(): Promise<number> {
  const result = await ownerPool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM audit_events`,
  );
  return Number(result.rows[0]?.count ?? "0");
}

async function resetAll(): Promise<void> {
  // Owner-run reset. TRUNCATE is NOT an UPDATE/DELETE trigger event, and CASCADE
  // clears the idempotency_records → audit_events FK in one shot.
  await ownerPool.query(`
    TRUNCATE TABLE idempotency_records, audit_events, tenant_memberships,
      traceability_exceptions
    RESTART IDENTITY CASCADE
  `);
}

async function ensureTrigger(): Promise<void> {
  const result = await ownerPool.query<{ tgname: string }>(
    `SELECT tgname FROM pg_trigger WHERE tgname = 'audit_events_append_only'`,
  );
  assert.equal(
    result.rows.length,
    1,
    "Expected the audit_events_append_only trigger (migration 0002) to be applied.",
  );
}

// Owner-seeded fixtures (the runtime roles cannot INSERT memberships/exceptions).
async function seedAuditEvent(): Promise<number> {
  const result = await ownerPool.query<{ id: number }>(
    `
      INSERT INTO audit_events (
        tenant_id, actor_auth_subject_id, action, resource_type, resource_id,
        source, reason, metadata
      )
      VALUES ($1, $2, 'exception.review.update', 'traceability_exception', $3,
        'provider-enf-seed', 'ambiguous_lot_code', '{}'::jsonb)
      RETURNING id
    `,
    [tenant, reviewer, exceptionId],
  );
  return result.rows[0]!.id;
}

async function seedMembership(): Promise<void> {
  await ownerPool.query(
    `
      INSERT INTO tenant_memberships (tenant_id, auth_subject_id, role)
      VALUES ($1, $2, 'quality_reviewer')
    `,
    [tenant, reviewer],
  );
}

async function seedException(): Promise<void> {
  await ownerPool.query(
    `
      INSERT INTO traceability_exceptions (
        id, tenant_id, type, status, lot_id, event_id, message,
        review_reason, human_review_required, review_notes, source_document_ref
      )
      VALUES ($1, $2, 'missing_kde', 'open', 'lot-provider-enf', 'event-provider-enf',
        'Provider-backed enforcement exception awaiting review.',
        'ambiguous_lot_code', true, 'Original provider-backed enforcement note.',
        'source-doc://provider-enf/original')
    `,
    [exceptionId, tenant],
  );
}

function request(): ProviderExceptionReviewRequest {
  return {
    tenantId: tenant,
    actorAuthSubjectId: reviewer,
    exceptionId,
    idempotencyKey: "provider-enf-key-0001",
    patch: {
      status: "in_review",
      reviewReason: "ambiguous_lot_code",
      reviewNotes: "Reviewed by the enforcement matrix-sufficiency proof.",
      humanReviewRequired: true,
    },
    source: "provider-backed-enforcement",
    sourceDocumentRef,
    now,
  };
}

const tests: TestCase[] = [
  {
    name: "P1 grant layer: app_runtime raw UPDATE and DELETE on audit_events are DENIED before the trigger (42501)",
    async run() {
      await resetAll();
      const auditId = await seedAuditEvent();

      await assert.rejects(
        async () => {
          await appRuntimePool.query(`UPDATE audit_events SET reason = 'x' WHERE id = $1`, [auditId]);
        },
        (error: unknown) => {
          assert.equal(code(error), "42501"); // insufficient_privilege
          return true;
        },
      );
      await assert.rejects(
        async () => {
          await appRuntimePool.query(`DELETE FROM audit_events WHERE id = $1`, [auditId]);
        },
        (error: unknown) => {
          assert.equal(code(error), "42501");
          return true;
        },
      );
      assert.equal(await countAuditEvents(), 1);
    },
  },
  {
    name: "P2 trigger backstop: over-granted audit_mutator UPDATE/DELETE (even WHERE false) is rejected by the trigger (99001)",
    async run() {
      await resetAll();
      // WHERE false touches zero rows and needs no SELECT (constant SET); the
      // FOR EACH STATEMENT trigger still fires, so this isolates the trigger from
      // both grants and privilege false-positives.
      await assert.rejects(
        async () => {
          await auditMutatorPool.query(`UPDATE audit_events SET action = 'tamper_test' WHERE false`);
        },
        (error: unknown) => {
          assert.equal(code(error), "99001");
          return true;
        },
      );
      await assert.rejects(
        async () => {
          await auditMutatorPool.query(`DELETE FROM audit_events WHERE false`);
        },
        (error: unknown) => {
          assert.equal(code(error), "99001");
          return true;
        },
      );
    },
  },
  {
    name: "P3 ENABLE ALWAYS: owner UPDATE under session_replication_role = replica is still rejected (99001)",
    async run() {
      await resetAll();
      const auditId = await seedAuditEvent();

      const client: PoolClient = await ownerPool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL session_replication_role = replica");
        await assert.rejects(
          async () => {
            await client.query(`UPDATE audit_events SET reason = 'replica-x' WHERE id = $1`, [auditId]);
          },
          (error: unknown) => {
            assert.equal(code(error), "99001");
            return true;
          },
        );
      } finally {
        // The failed statement aborts the txn; ROLLBACK before releasing the client.
        await client.query("ROLLBACK").catch(() => {});
        client.release();
      }
      assert.equal(await countAuditEvents(), 1);
    },
  },
  {
    name: "P4 matrix sufficiency: the full provider happy-path SUCCEEDS as app_runtime (proves SELECT(id) grant ⇒ B1 repoint is a no-op)",
    async run() {
      await resetAll();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(appRuntimePool, request());
      assert.equal(outcome.status, "accepted");
      assert.equal(await countAuditEvents(), 1);

      const idempotency = await ownerPool.query<{ lifecycle_status: string; audit_event_id: number | null }>(
        `SELECT lifecycle_status, audit_event_id FROM idempotency_records`,
      );
      assert.equal(idempotency.rows[0]?.lifecycle_status, "completed");
      assert.notEqual(idempotency.rows[0]?.audit_event_id, null);
    },
  },
  {
    name: "P5 TRUNCATE tripwire: neither runtime role has TRUNCATE on audit_events, and an actual TRUNCATE is denied (42501)",
    async run() {
      await resetAll();

      const appPriv = await ownerPool.query<{ p: boolean }>(
        `SELECT has_table_privilege('fsma204_app_runtime', 'audit_events', 'TRUNCATE') AS p`,
      );
      assert.equal(appPriv.rows[0]?.p, false);
      const mutPriv = await ownerPool.query<{ p: boolean }>(
        `SELECT has_table_privilege('fsma204_audit_mutator', 'audit_events', 'TRUNCATE') AS p`,
      );
      assert.equal(mutPriv.rows[0]?.p, false);

      await assert.rejects(
        async () => {
          await appRuntimePool.query(`TRUNCATE audit_events`);
        },
        (error: unknown) => {
          assert.equal(code(error), "42501");
          return true;
        },
      );
      await assert.rejects(
        async () => {
          await auditMutatorPool.query(`TRUNCATE audit_events`);
        },
        (error: unknown) => {
          assert.equal(code(error), "42501");
          return true;
        },
      );
    },
  },
  {
    name: "P6 role shape: app_runtime is not superuser/bypassrls/createrole, not the table owner, and cannot SET ROLE owner",
    async run() {
      const flags = await ownerPool.query<{
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolcreaterole: boolean;
      }>(
        `SELECT rolsuper, rolbypassrls, rolcreaterole FROM pg_roles WHERE rolname = 'fsma204_app_runtime'`,
      );
      assert.equal(flags.rows[0]?.rolsuper, false);
      assert.equal(flags.rows[0]?.rolbypassrls, false);
      assert.equal(flags.rows[0]?.rolcreaterole, false);

      const member = await ownerPool.query<{ m: boolean }>(
        `SELECT pg_has_role('fsma204_app_runtime', 'postgres', 'MEMBER') AS m`,
      );
      assert.equal(member.rows[0]?.m, false);

      const owner = await ownerPool.query<{ owner: string }>(
        `SELECT pg_get_userbyid(relowner) AS owner FROM pg_class WHERE relname = 'audit_events'`,
      );
      assert.notEqual(owner.rows[0]?.owner, "fsma204_app_runtime");
    },
  },
];

try {
  await ensureTrigger();
  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }
  console.log("Append-only enforcement tests passed.");
} finally {
  await Promise.all([ownerPool.end(), appRuntimePool.end(), auditMutatorPool.end()]);
}
```

- [ ] **Step 2: Run the suite to confirm it FAILS for the right reason (RED)**

With the disposable Postgres up and all three role env vars exported (but `runtime-roles.sql` not yet applied):

```bash
node --experimental-strip-types tests/db/audit-append-only-enforcement.test.ts
```

Expected: FAIL — the `appRuntimePool`/`auditMutatorPool` connections error (roles `fsma204_app_runtime` /
`fsma204_audit_mutator` do not exist yet → `28000` / "role … does not exist"). This is the RED that Step 3's roles fix.

- [ ] **Step 3: Write the role bootstrap SQL (the implementation)**

Create `lib/db/roles/runtime-roles.sql`:

```sql
-- lib/db/roles/runtime-roles.sql — Batch B0 (FSMA-03)
--
-- Idempotent bootstrap of the two TEST-ONLY runtime roles for the append-only
-- enforcement suite (tests/db/audit-append-only-enforcement.test.ts):
--
--   fsma204_app_runtime   — the LEAST-PRIVILEGE runtime role. Its grants are the
--                           durable security artifact: exactly what the provider
--                           (lib/db/exception-review-provider.ts) needs, and NOTHING
--                           on audit_events beyond INSERT + column-scoped SELECT(id).
--                           B1 repoints DATABASE_URL to this role.
--   fsma204_audit_mutator — a TEST-ONLY OVER-GRANTED role (UPDATE/DELETE on
--                           audit_events) that exists only to prove the append-only
--                           TRIGGER backstops the grant layer.
--
-- LOGIN PASSWORDs here are TEST-ONLY placeholders at parity with the existing
-- hard-coded postgres:postgres CI service creds (contract-gate.yml). They guard a
-- disposable 127.0.0.1-only container and protect nothing. PROD password
-- provisioning is B1 (secret-managed ALTER ROLE). See ops/deltas/0062.
--
-- Apply as the owner/superuser AFTER `drizzle-kit migrate`:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/roles/runtime-roles.sql
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fsma204_app_runtime') THEN
    CREATE ROLE fsma204_app_runtime LOGIN PASSWORD 'fsma204_app_runtime';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fsma204_audit_mutator') THEN
    CREATE ROLE fsma204_audit_mutator LOGIN PASSWORD 'fsma204_audit_mutator';
  END IF;
END
$$;

-- Schema access (PUBLIC keeps USAGE on schema public by default in PG16; explicit
-- here for robustness — idempotent).
GRANT USAGE ON SCHEMA public TO fsma204_app_runtime, fsma204_audit_mutator;

-- ── fsma204_app_runtime — least-privilege, derived from the provider's queries ──
-- tenant_memberships: RBAC membership lookup (SELECT only).
GRANT SELECT ON tenant_memberships TO fsma204_app_runtime;
-- traceability_exceptions: SELECT … FOR UPDATE (needs UPDATE priv) + status UPDATE;
-- the SELECT grant also satisfies the UPDATE … RETURNING projection.
GRANT SELECT, UPDATE ON traceability_exceptions TO fsma204_app_runtime;
-- idempotency_records: reserve INSERT, SELECT … FOR UPDATE, reclaim/complete UPDATE,
-- Batch-59 orphan-cleanup DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_records TO fsma204_app_runtime;
-- audit_events: APPEND-ONLY for the runtime role. INSERT + column-scoped SELECT(id)
-- (the only reason SELECT is needed is `INSERT … RETURNING id`; RI checks bypass the
-- caller's SELECT, so the idempotency FK does not force a grant). NO UPDATE/DELETE.
GRANT INSERT ON audit_events TO fsma204_app_runtime;
GRANT SELECT (id) ON audit_events TO fsma204_app_runtime;
-- Defense-in-depth: TRUNCATE is a SEPARATE privilege and a SEPARATE trigger event
-- (the BEFORE UPDATE/DELETE trigger does NOT cover it). Revoke explicitly so the
-- restricted role can never TRUNCATE audit_events even if a future grant slips.
REVOKE TRUNCATE ON audit_events FROM fsma204_app_runtime;

-- ── fsma204_audit_mutator — TEST-ONLY over-grant to prove the trigger backstop ──
-- Deliberately OVER-granted UPDATE/DELETE on audit_events: the suite proves the
-- trigger rejects this role (99001) even though its grants would allow the DML.
GRANT INSERT, SELECT, UPDATE, DELETE ON audit_events TO fsma204_audit_mutator;
REVOKE TRUNCATE ON audit_events FROM fsma204_audit_mutator;
```

- [ ] **Step 4: Bootstrap the roles locally and run the suite to GREEN**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/roles/runtime-roles.sql
node --experimental-strip-types tests/db/audit-append-only-enforcement.test.ts
```

Expected: PASS for all six proofs (`PASS P1 …` through `PASS P6 …`) and `Append-only enforcement tests passed.`
(REVOKE of a never-granted TRUNCATE is a no-op NOTICE, not an error, so `ON_ERROR_STOP=1` does not trip.)

- [ ] **Step 5: Add the `test:db:enforcement` npm script**

In `package.json`, add the script immediately after `"test:db:coverage"` (leave `test:db`, `test:db:coverage`, and the
coverage `SUITES` array untouched):

```json
    "test:db:coverage": "node scripts/run-db-coverage.mjs",
    "test:db:enforcement": "node --experimental-strip-types tests/db/audit-append-only-enforcement.test.ts",
    "fallow:ci": "fallow audit --fail-on-issues"
```

Verify it runs (roles bootstrapped, env exported):

```bash
npm run test:db:enforcement
```

Expected: PASS (same six lines as Step 4).

- [ ] **Step 6: Wire CI — bootstrap-roles step (after migrate) + enforcement step (after coverage)**

In `.github/workflows/contract-gate.yml`, inside the `db-provider-tests` job, insert the **Bootstrap runtime roles**
step immediately after the existing `Apply migrations to the test database` step (currently ending at line 109):

```yaml
      - name: Apply migrations to the test database
        run: npx drizzle-kit migrate --config drizzle.config.ts

      - name: Bootstrap runtime roles
        # Idempotent role + per-table grant + REVOKE TRUNCATE bootstrap, applied as the
        # postgres superuser (job-level DATABASE_URL). Separate from the committed
        # migrations so no prod creds live in version-controlled SQL. psql is preinstalled
        # on ubuntu-latest.
        run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/roles/runtime-roles.sql
```

Then insert the **Run append-only enforcement** step immediately after the existing
`Run provider DB suites under coverage …` step (currently ending at line 115) and before the `Coverage freshness guard`
step:

```yaml
      - name: Run append-only enforcement suite
        # The restricted-role enforcement proofs (grant deny 42501 / trigger reject
        # 99001 / replica ENABLE ALWAYS / matrix-sufficiency / TRUNCATE tripwire /
        # role-shape). A thrown assert exits non-zero → fails the job → blocks the PR,
        # gating exactly like test:db:coverage. The owner leg uses the job-level
        # TEST_DATABASE_URL; the two restricted roles are step-scoped below.
        env:
          TEST_APP_RUNTIME_DATABASE_URL: postgresql://fsma204_app_runtime:fsma204_app_runtime@127.0.0.1:5432/fsma204_provider_test
          TEST_AUDIT_MUTATOR_DATABASE_URL: postgresql://fsma204_audit_mutator:fsma204_audit_mutator@127.0.0.1:5432/fsma204_provider_test
        run: npm run test:db:enforcement
```

(Note the CI port is `5432`, not the local `55432`.) Do not modify the coverage step, the freshness-guard step, or the
job-level `env`/`services`.

- [ ] **Step 7: Commit**

```bash
git add lib/db/roles/runtime-roles.sql tests/db/audit-append-only-enforcement.test.ts package.json .github/workflows/contract-gate.yml
git commit -m "feat(batch-b0): least-privilege runtime roles + 6-proof append-only enforcement suite + CI bootstrap/enforcement steps"
```

---

## Task 3 — Truth-surface reconciliation (delta + de-stale to B0→B1 split)

**Files:**
- Create: `ops/deltas/0062-batch-b0-db-hardening.md`
- Modify: `.planning/STATE.md`
- Modify: `.planning/codebase/CONCERNS.md`
- Modify: `.planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md`

- [ ] **Step 1: Verify the exact stale wording before editing (resolves spec §9)**

Run:

```bash
grep -rn -i "non-splittable\|splittable" .planning/STATE.md .planning/codebase/ .planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md
```

Expected: the only literal `non-splittable` hit is `.planning/STATE.md:57`. (The codebase docs' "bundle" matches are
`moduleResolution: bundler` false positives — STACK.md/CONVENTIONS.md/STRUCTURE.md need **no** B0 edit. `03-02` has no
`non-splittable` framing; it is reconciled in Step 5 via decision #9, not a wording swap. The immutable `ops/deltas/*`
historical records, incl. 0061's "Next" section, are intentionally left as-was.)

- [ ] **Step 2: Author delta 0062**

Create `ops/deltas/0062-batch-b0-db-hardening.md`:

```markdown
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
```

- [ ] **Step 3: De-stale `.planning/STATE.md` — Current focus (line 8)**

Replace (line 8, the trailing sentence):

```
Batch B (route wiring + runtime hardening) is the next approved code batch and remains gated behind this acceptance.
```

with:

```
Batch B is split into **B0** (DB-hardening: an `ENABLE ALWAYS` append-only trigger on `audit_events` + a least-privilege `fsma204_app_runtime` runtime role, proven by an enforcement suite, with **no route wiring**) - implemented on `batch-b0-db-hardening` (design 03-03, delta 0062) - and **B1** (route wiring + runtime hardening), which remains gated.
```

- [ ] **Step 4: De-stale `.planning/STATE.md` — Recent decision (line 53) and Next Step (line 57)**

Replace (line 53, trailing sentence):

```
Batch B (route wiring) is unblocked but gated as its own approved code batch.
```

with:

```
Batch B is split B0 (DB-hardening on `batch-b0-db-hardening`) -> B1 (route wiring), per design 03-03 / delta 0062; B0 wires no route, so the split is as-safe as the prior bundle.
```

Then replace the entire **Next Step** paragraph (line 57, beginning `Batch A is accepted (delta 0061), which unblocks
**Batch B**…`) with:

```
Batch A is accepted (delta 0061). Batch B is split into **B0** (this branch) and **B1**. **B0 - DB hardening (in progress on `batch-b0-db-hardening`, design 03-03 / delta 0062):** ship migration `0002` (a custom Drizzle migration adding a `BEFORE UPDATE OR DELETE … FOR EACH STATEMENT … ENABLE ALWAYS` trigger on `audit_events`, SQLSTATE `99001`); add `lib/db/roles/runtime-roles.sql` (a least-privilege `fsma204_app_runtime` plus a TEST-ONLY over-granted `fsma204_audit_mutator`, per-table grants, `REVOKE TRUNCATE`); invert the a3/A4-20 non-enforcement assert to an enforcement assert; add the 6-proof `audit-append-only-enforcement` suite and gate it in CI. B0 wires **no** route (provider stays imported by tests only), so there is no mutable-in-prod window. **B1 - route wiring + runtime hardening (still gated):** repoint the route's `DATABASE_URL` to the restricted `fsma204_app_runtime` role (a B0-verified no-op), wire the provider into the route against `lib/db/client.ts`, add persistent rate limiting on a separate connection, and activate PATCH success - clearing the deferred review carry-forwards (fail-closed-vs-fail-open limiter (errors-1), the `Number.isFinite` Retry-After guard (errors-2), an optional `toRetryAfterSeconds()` helper (types-3), throttled-attempt audit/observability (A5-DENIED-ATTEMPT-AUDIT), validation-before-limiter precedence (A5-16)) and tightening `.fallowrc.jsonc` `unused-*` back to `error` once the staged provider exports are wired. No production provider, storage, enforcement on non-public tenants, supplier workflow, lot/event workflow, export, CSV generation, or broader Phase 4-8 runtime work is approved beyond Batch B, and the optional `@/*` path alias remains deferred.
```

- [ ] **Step 5: Reconcile `CONCERNS.md` and `03-02`**

In `.planning/codebase/CONCERNS.md`, line 14, replace the trailing sentence:

```
Activating the provider on the route is the gated "Batch B" work.
```

with:

```
Activating the provider on the route is the gated **Batch B1** work; **Batch B0** (design 03-03, delta 0062) adds DB-level append-only enforcement on `audit_events` (an `ENABLE ALWAYS` trigger) plus a least-privilege runtime role **without** wiring the route, so this non-wiring invariant still holds.
```

In `.planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md`, decision #9
(line 160), replace:

```
9. Whether the activation batch is one slice or split (e.g. persistence+auth wiring, then the write).
```

with:

```
9. Whether the activation batch is one slice or split (e.g. persistence+auth wiring, then the write). **Resolved 2026-06-05: split — B0 (DB-hardening: append-only trigger + restricted runtime role, no route) then B1 (route wiring + runtime hardening). See 03-03 / delta 0062.**
```

- [ ] **Step 6: Verify clean diff and commit**

```bash
git diff --cached --check
git add ops/deltas/0062-batch-b0-db-hardening.md .planning/STATE.md .planning/codebase/CONCERNS.md .planning/phases/FSMA-03-security-and-persistence-foundation/03-02-first-mutating-write-design.md
git commit -m "docs(batch-b0): delta 0062 + de-stale truth surfaces to the B0->B1 split"
```

Expected: `git diff --cached --check` prints nothing (no whitespace/CRLF/BOM issues).

---

## Self-Review (run before declaring the plan done)

**1. Spec coverage** — every spec section maps to a task:

| Spec | Task |
|---|---|
| §2 HYBRID DDL (custom migration), a4 DEFERRED | T1 Steps 1-3 (custom migration via `generate --custom`); a4 untouched (trigger fires on UPDATE/DELETE, not a4's index-6 audit INSERT / index-7 idempotency UPDATE). |
| §3 grant matrix (`fsma204_app_runtime`) | T2 Step 3 `runtime-roles.sql` (per-table grants, column-scoped `SELECT (id)`, `REVOKE TRUNCATE`). |
| §4 trigger DDL + `99001` + 3-way matrix | T1 Step 2 DDL; T2 suite P1 (42501) / P2 (99001) / a3 owner leg (99001). |
| §5.1 invert a3 + 6-proof suite + reset harness | T1 Step 5 (a3); T2 Step 1 (P1-P6, owner `TRUNCATE … CASCADE` reset). |
| §5.2 CI wiring | T2 Step 6 (bootstrap-after-migrate + enforcement-after-coverage). |
| §5.3 coverage `SUITES` untouched | T2 Step 5 (script added; `SUITES` left alone); snapshot unchanged. |
| §5.4 `package.json` scripts | T2 Step 5. |
| §5.5 truth surfaces | T3 (delta 0062 + STATE + CONCERNS + 03-02). |
| §9 open items | Prereqs (scram TCP login via `LOGIN PASSWORD`); T2 Step 1 (a3-pattern harness, `err.code`); T3 Step 1 (exact stale wording). |

**2. Placeholder scan** — no "TBD"/"add error handling"/"similar to Task N"; every code/SQL/YAML block is complete and
literal; every command states expected output.

**3. Type/name consistency** — role names `fsma204_app_runtime` / `fsma204_audit_mutator`, env vars
`TEST_APP_RUNTIME_DATABASE_URL` / `TEST_AUDIT_MUTATOR_DATABASE_URL`, SQLSTATEs `99001` (trigger) / `42501` (grant),
trigger `audit_events_append_only`, function `audit_events_reject_mutation`, migration
`0002_audit_events_append_only_trigger`, script `test:db:enforcement` — all identical across every task and match the
spec verbatim.
