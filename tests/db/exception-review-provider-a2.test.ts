import assert from "node:assert/strict";

import pg from "pg";
import type { Pool } from "pg";

import {
  EXCEPTION_REVIEW_OPERATION,
  TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
  reviewTraceabilityExceptionInTransaction,
  type ProviderExceptionPatch,
  type ProviderExceptionReviewRequest,
  type ProviderProblemDetails,
} from "../../lib/db/exception-review-provider.ts";

const { Pool: PgPool } = pg;

const tenantA = "provider-a2-tenant-a";
const tenantB = "provider-a2-tenant-b";
const reviewer = "provider-a2-reviewer";
const reviewerB = "provider-a2-reviewer-b";
const exceptionId = "provider-a2-exception";
const secondExceptionId = "provider-a2-exception-two";
const tenantBExceptionId = "provider-a2-tenant-b-exception";
const sourceDocumentRef = "source-doc://provider-a2/evidence";
const now = new Date("2026-06-03T15:00:00.000Z");

const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A2 test.",
  humanReviewRequired: true,
};

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const pool: Pool = new PgPool({
  connectionString: resolveTestDatabaseUrl(),
  max: 4,
});

function resolveTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required for provider-backed Batch A2 tests.",
    );
  }

  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const looksLikeTestDatabase = /(^|[_-])(test|a2)([_-]|$)/i.test(
    databaseName,
  );

  if (!looksLikeTestDatabase) {
    throw new Error(
      "Refusing to run provider-backed tests unless TEST_DATABASE_URL names an explicit test database.",
    );
  }

  return value;
}

async function resetTables(): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE idempotency_records, audit_events, tenant_memberships,
      traceability_exceptions
    RESTART IDENTITY CASCADE
  `);
}

async function ensureMigrated(): Promise<void> {
  const columns = await pool.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'idempotency_records'
        AND column_name IN ('resource_type', 'resource_id')
    `,
  );

  assert.deepEqual(
    columns.rows.map((row) => row.column_name).sort(),
    ["resource_id", "resource_type"],
    "Expected provider idempotency resource-scope migration to be applied.",
  );
}

async function seedMembership(args: {
  tenantId?: string;
  authSubjectId?: string;
} = {}): Promise<void> {
  await pool.query(
    `
      INSERT INTO tenant_memberships (tenant_id, auth_subject_id, role)
      VALUES ($1, $2, 'quality_reviewer')
    `,
    [args.tenantId ?? tenantA, args.authSubjectId ?? reviewer],
  );
}

async function seedException(args: {
  id?: string;
  tenantId?: string;
} = {}): Promise<void> {
  await pool.query(
    `
      INSERT INTO traceability_exceptions (
        id, tenant_id, type, status, lot_id, event_id, message,
        review_reason, human_review_required, review_notes, source_document_ref
      )
      VALUES ($1, $2, 'missing_kde', 'open', 'lot-provider-a2',
        'event-provider-a2', 'Provider-backed A2 exception awaiting review.',
        'ambiguous_lot_code', true, 'Original provider-backed A2 note.',
        'source-doc://provider-a2/original')
    `,
    [args.id ?? exceptionId, args.tenantId ?? tenantA],
  );
}

function request(
  overrides: Partial<ProviderExceptionReviewRequest> = {},
): ProviderExceptionReviewRequest {
  return {
    tenantId: tenantA,
    actorAuthSubjectId: reviewer,
    exceptionId,
    idempotencyKey: "provider-a2-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a2",
    sourceDocumentRef,
    now,
    ...overrides,
  };
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}`,
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function readExceptionStatus(id = exceptionId): Promise<string> {
  const result = await pool.query<{ status: string }>(
    `
      SELECT status
      FROM traceability_exceptions
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0]?.status as string;
}

async function readAuditRows(): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    `
      SELECT *
      FROM audit_events
      ORDER BY id
    `,
  );

  return result.rows as Record<string, unknown>[];
}

async function readIdempotencyRows(): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    `
      SELECT *
      FROM idempotency_records
      ORDER BY id
    `,
  );

  return result.rows as Record<string, unknown>[];
}

function assertAccepted(
  outcome: Awaited<ReturnType<typeof reviewTraceabilityExceptionInTransaction>>,
): asserts outcome is Extract<typeof outcome, { status: "accepted" }> {
  if (outcome.status !== "accepted") {
    assert.fail(`Expected accepted outcome, received ${outcome.status}.`);
  }
}

function assertConflict(
  outcome: Awaited<ReturnType<typeof reviewTraceabilityExceptionInTransaction>>,
): asserts outcome is Extract<typeof outcome, { status: "conflict" }> {
  if (outcome.status !== "conflict") {
    assert.fail(`Expected conflict outcome, received ${outcome.status}.`);
  }
}

function expectedConflictProblem(
  resourceId = exceptionId,
  key = "provider-a2-key-0001",
): ProviderProblemDetails {
  return {
    type: "about:blank",
    title: "Conflict",
    status: 409,
    detail:
      "Idempotency-Key was already used with a different request hash for this resource.",
    context: {
      operation: EXCEPTION_REVIEW_OPERATION,
      resource_type: TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
      resource_id: resourceId,
      idempotency_key: key,
      reason: "idempotency_request_hash_mismatch",
    },
  };
}

const tests: TestCase[] = [
  {
    name: "mismatched_payload_same_key_returns_conflict_and_audit",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(first);

      const conflict = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ patch: { ...reviewPatch, status: "resolved" } }),
      );
      assertConflict(conflict);

      assert.deepEqual(conflict.problem, expectedConflictProblem());
      assert.equal(conflict.storedResponseBody?.id, exceptionId);
      assert.equal(conflict.storedResponseBody?.status, "in_review");
      assert.equal(conflict.idempotencyRecordId, first.idempotencyRecordId);
      assert.equal(await readExceptionStatus(), "in_review");
      assert.equal(await countRows("idempotency_records"), 1);
      assert.equal(await countRows("audit_events"), 2);
    },
  },
  {
    name: "same_key_same_payload_different_resource_is_successful",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException({ id: exceptionId });
      await seedException({ id: secondExceptionId });

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ exceptionId, idempotencyKey: "provider-a2-shared-key" }),
      );
      const second = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          exceptionId: secondExceptionId,
          idempotencyKey: "provider-a2-shared-key",
        }),
      );

      assertAccepted(first);
      assertAccepted(second);
      assert.equal(await countRows("idempotency_records"), 2);
      assert.equal(await countRows("audit_events"), 2);
      assert.deepEqual(
        (await readIdempotencyRows()).map((row) => row.resource_id),
        [exceptionId, secondExceptionId],
      );
    },
  },
  {
    name: "repeated_conflict_returns_same_problem_details",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(first);

      const conflictPatch: ProviderExceptionPatch = {
        ...reviewPatch,
        status: "resolved",
      };
      const conflictOne = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ patch: conflictPatch }),
      );
      const conflictTwo = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ patch: conflictPatch }),
      );

      assertConflict(conflictOne);
      assertConflict(conflictTwo);
      assert.deepEqual(conflictOne.problem, expectedConflictProblem());
      assert.deepEqual(conflictTwo.problem, conflictOne.problem);
      assert.equal(conflictTwo.storedResponseBody?.id, exceptionId);
      assert.equal(await countRows("idempotency_records"), 1);
      assert.equal(await countRows("audit_events"), 3);
    },
  },
  {
    name: "cross_tenant_key_reuse_isolated",
    async run() {
      await resetTables();
      await seedMembership({ tenantId: tenantA });
      await seedMembership({ tenantId: tenantB });
      await seedException({ id: exceptionId, tenantId: tenantA });
      await seedException({ id: tenantBExceptionId, tenantId: tenantB });

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          tenantId: tenantA,
          exceptionId,
          idempotencyKey: "provider-a2-cross-tenant-key",
        }),
      );
      const second = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          tenantId: tenantB,
          exceptionId: tenantBExceptionId,
          idempotencyKey: "provider-a2-cross-tenant-key",
        }),
      );

      assertAccepted(first);
      assertAccepted(second);
      assert.equal(await countRows("idempotency_records"), 2);
      assert.equal(await countRows("audit_events"), 2);
      assert.deepEqual(
        (await readIdempotencyRows()).map((row) => row.tenant_id),
        [tenantA, tenantB],
      );
    },
  },
  {
    name: "error_audit_fields_are_populated",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(first);

      const conflict = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ patch: { ...reviewPatch, status: "resolved" } }),
      );
      assertConflict(conflict);

      const audits = await readAuditRows();
      const errorAudit = audits[1] as Record<string, unknown>;
      const metadata = errorAudit.metadata as Record<string, unknown>;

      assert.equal(errorAudit.tenant_id, tenantA);
      assert.equal(errorAudit.actor_auth_subject_id, reviewer);
      assert.equal(errorAudit.action, EXCEPTION_REVIEW_OPERATION);
      assert.equal(errorAudit.resource_type, TRACEABILITY_EXCEPTION_RESOURCE_TYPE);
      assert.equal(errorAudit.resource_id, exceptionId);
      assert.equal(errorAudit.reason, "idempotency_request_hash_mismatch");
      assert.equal(metadata.status, "conflict");
      assert.equal(metadata.error_reason, "idempotency_request_hash_mismatch");
      assert.equal(metadata.idempotency_key, "provider-a2-key-0001");
      assert.deepEqual(metadata.problem, expectedConflictProblem());
      assert.equal(metadata.stored_response_present, true);
      assert.equal(conflict.auditEventId, errorAudit.id);
    },
  },
  {
    name: "successful_update_still_appends_audit_event",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(outcome);

      const audits = await readAuditRows();
      assert.equal(audits.length, 1);
      assert.equal(audits[0]?.tenant_id, tenantA);
      assert.equal(audits[0]?.actor_auth_subject_id, reviewer);
      assert.equal(audits[0]?.action, EXCEPTION_REVIEW_OPERATION);
      assert.equal(audits[0]?.resource_type, TRACEABILITY_EXCEPTION_RESOURCE_TYPE);
      assert.equal(audits[0]?.resource_id, exceptionId);
      assert.equal(audits[0]?.reason, "ambiguous_lot_code");

      const metadata = audits[0]?.metadata as Record<string, unknown>;
      assert.equal(metadata.status, "success");
      assert.equal(metadata.idempotency_key, "provider-a2-key-0001");
      assert.equal(metadata.source_document_ref, sourceDocumentRef);
    },
  },
  {
    name: "different_actor_same_key_same_payload_conflicts_and_audits_actor",
    async run() {
      await resetTables();
      await seedMembership();
      await seedMembership({ authSubjectId: reviewerB });
      await seedException();

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(first);

      // Actor B reuses actor A's idempotency key with an identical payload. The
      // actor is part of the request identity (design 03-02 scope is
      // tenant/actor/action/key, matching lib/security/idempotency-audit.ts), so
      // this must NOT silently replay A's result with no audit for B — it is a
      // conflict, and B's attempt is recorded in the append-only audit trail.
      const conflict = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ actorAuthSubjectId: reviewerB }),
      );
      assertConflict(conflict);

      assert.deepEqual(conflict.problem, expectedConflictProblem());
      assert.equal(conflict.idempotencyRecordId, first.idempotencyRecordId);
      assert.equal(await countRows("idempotency_records"), 1);
      assert.equal(await countRows("audit_events"), 2);

      const audits = await readAuditRows();
      const errorAudit = audits[1] as Record<string, unknown>;
      assert.equal(errorAudit.actor_auth_subject_id, reviewerB);
      assert.equal(errorAudit.reason, "idempotency_request_hash_mismatch");
      assert.equal(
        (errorAudit.metadata as Record<string, unknown>).status,
        "conflict",
      );
    },
  },
];

try {
  await ensureMigrated();

  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }

  console.log("Provider-backed exception-review Batch A2 tests passed.");
} finally {
  await pool.end();
}
