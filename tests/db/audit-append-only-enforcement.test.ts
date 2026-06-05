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
