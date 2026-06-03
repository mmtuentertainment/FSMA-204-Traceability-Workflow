import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import pg from "pg";
import type { Pool } from "pg";

import {
  EXCEPTION_REVIEW_OPERATION,
  TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
  applyTenantScopedExceptionReview,
  computeExceptionReviewRequestHash,
  getActiveTenantMembership,
  reviewTraceabilityExceptionInTransaction,
  type ProviderExceptionPatch,
  type ProviderExceptionReviewRequest,
} from "../../lib/db/exception-review-provider.ts";

const { Pool: PgPool } = pg;

const tenantA = "provider-a1-tenant-a";
const tenantB = "provider-a1-tenant-b";
const reviewer = "provider-a1-reviewer";
const nonMember = "provider-a1-non-member";
const exceptionId = "provider-a1-exception";
const sourceDocumentRef = "source-doc://provider-a1/evidence";
const now = new Date("2026-06-03T12:00:00.000Z");

const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A1 test.",
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
      "TEST_DATABASE_URL is required for provider-backed Batch A1 tests.",
    );
  }

  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const looksLikeTestDatabase = /(^|[_-])(test|a1)([_-]|$)/i.test(
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
    "Expected Batch A1 idempotency resource-scope migration to be applied.",
  );
}

async function seedMembership(args: {
  tenantId?: string;
  authSubjectId?: string;
  role?: "tenant_admin" | "quality_reviewer" | "read_only";
} = {}): Promise<void> {
  await pool.query(
    `
      INSERT INTO tenant_memberships (tenant_id, auth_subject_id, role)
      VALUES ($1, $2, $3)
    `,
    [
      args.tenantId ?? tenantA,
      args.authSubjectId ?? reviewer,
      args.role ?? "quality_reviewer",
    ],
  );
}

async function seedException(args: {
  id?: string;
  tenantId?: string;
  status?: string;
  reviewReason?: string | null;
  reviewNotes?: string | null;
  sourceRef?: string | null;
} = {}): Promise<void> {
  await pool.query(
    `
      INSERT INTO traceability_exceptions (
        id, tenant_id, type, status, lot_id, event_id, message,
        review_reason, human_review_required, review_notes, source_document_ref
      )
      VALUES ($1, $2, 'missing_kde', $3, 'lot-provider-a1', 'event-provider-a1',
        'Provider-backed exception awaiting review.', $4, true, $5, $6)
    `,
    [
      args.id ?? exceptionId,
      args.tenantId ?? tenantA,
      args.status ?? "open",
      args.reviewReason ?? "ambiguous_lot_code",
      args.reviewNotes ?? "Original provider-backed note.",
      args.sourceRef ?? "source-doc://provider-a1/original",
    ],
  );
}

function request(
  overrides: Partial<ProviderExceptionReviewRequest> = {},
): ProviderExceptionReviewRequest {
  return {
    tenantId: tenantA,
    actorAuthSubjectId: reviewer,
    exceptionId,
    idempotencyKey: "provider-a1-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a1",
    sourceDocumentRef,
    now,
    ...overrides,
  };
}

function requestHash(
  patch: ProviderExceptionPatch = reviewPatch,
  ref: string | null = sourceDocumentRef,
): string {
  return computeExceptionReviewRequestHash({
    patch,
    sourceDocumentRef: ref,
  });
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}`,
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function readException(id = exceptionId): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `
      SELECT *
      FROM traceability_exceptions
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] as Record<string, unknown>;
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

function assertAccepted(
  outcome: Awaited<ReturnType<typeof reviewTraceabilityExceptionInTransaction>>,
): asserts outcome is Extract<typeof outcome, { status: "accepted" }> {
  if (outcome.status !== "accepted") {
    assert.fail(`Expected accepted outcome, received ${outcome.status}.`);
  }
}

const tests: TestCase[] = [
  {
    name: "tenant membership lookup accepts an active authorized tenant member",
    async run() {
      await resetTables();
      await seedMembership();

      const membership = await getActiveTenantMembership(pool, {
        tenantId: tenantA,
        authSubjectId: reviewer,
      });

      assert.deepEqual(membership, {
        tenantId: tenantA,
        authSubjectId: reviewer,
        role: "quality_reviewer",
      });
    },
  },
  {
    name: "tenant membership lookup rejects non-member and wrong-tenant access",
    async run() {
      await resetTables();
      await seedMembership({ tenantId: tenantB, authSubjectId: reviewer });
      await seedException();

      assert.equal(
        await getActiveTenantMembership(pool, {
          tenantId: tenantA,
          authSubjectId: nonMember,
        }),
        null,
      );

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ actorAuthSubjectId: reviewer }),
      );

      assert.equal(outcome.status, "forbidden");
      assert.equal((await readException()).status, "open");
      assert.equal(await countRows("audit_events"), 0);
      assert.equal(await countRows("idempotency_records"), 0);
    },
  },
  {
    name: "tenant-scoped exception update cannot update another tenant exception",
    async run() {
      await resetTables();
      await seedException({ tenantId: tenantB });

      const update = await applyTenantScopedExceptionReview(pool, {
        tenantId: tenantA,
        exceptionId,
        actorAuthSubjectId: reviewer,
        patch: reviewPatch,
        sourceDocumentRef,
        reviewedAt: now,
      });

      assert.equal(update.status, "not_found");
      const row = await readException();
      assert.equal(row.tenant_id, tenantB);
      assert.equal(row.status, "open");
      assert.equal(row.reviewed_by_auth_subject_id, null);
    },
  },
  {
    name: "successful update writes allowed review and source-reference fields",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          replayHeaders: {
            Authorization: "Bearer should-not-persist",
            Cookie: "session=should-not-persist",
            "Set-Cookie": "session=should-not-persist",
            "X-Request-Id": "provider-a1-request",
          },
        }),
      );
      assertAccepted(outcome);

      const row = await readException();
      assert.equal(row.status, "in_review");
      assert.equal(row.review_reason, "ambiguous_lot_code");
      assert.equal(row.review_notes, reviewPatch.reviewNotes);
      assert.equal(row.human_review_required, true);
      assert.equal(row.source_document_ref, sourceDocumentRef);
      assert.equal(row.reviewed_by_auth_subject_id, reviewer);
      assert.equal((row.reviewed_at as Date).toISOString(), now.toISOString());

      const replayHeaders = (await readIdempotencyRows())[0]
        ?.replay_headers as Record<string, unknown>;
      assert.equal(replayHeaders["content-type"], "application/json");
      assert.equal(replayHeaders["x-request-id"], "provider-a1-request");
      assert.equal(replayHeaders["authorization"], undefined);
      assert.equal(replayHeaders["cookie"], undefined);
      assert.equal(replayHeaders["set-cookie"], undefined);
    },
  },
  {
    name: "first idempotency request reserves and completes",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(outcome);

      const rows = await readIdempotencyRows();
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.tenant_id, tenantA);
      assert.equal(rows[0]?.operation, EXCEPTION_REVIEW_OPERATION);
      assert.equal(rows[0]?.resource_type, TRACEABILITY_EXCEPTION_RESOURCE_TYPE);
      assert.equal(rows[0]?.resource_id, exceptionId);
      assert.equal(rows[0]?.idempotency_key, "provider-a1-key-0001");
      assert.equal(rows[0]?.lifecycle_status, "completed");
      assert.equal(rows[0]?.audit_event_id, outcome.auditEventId);
      assert.equal((rows[0]?.replay_body as Record<string, unknown>).id, exceptionId);
    },
  },
  {
    name: "exact replay with same resource and request hash returns stored result",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );
      assertAccepted(first);

      const replay = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );

      assert.equal(replay.status, "replayed");
      if (replay.status !== "replayed") {
        assert.fail("Expected replayed outcome.");
      }
      assert.equal(replay.record.id, exceptionId);
      assert.equal(replay.record.status, "in_review");
      assert.equal(replay.idempotencyRecordId, first.idempotencyRecordId);
      assert.equal(await countRows("audit_events"), 1);
      assert.equal(await countRows("idempotency_records"), 1);
    },
  },
  {
    name: "same idempotency key with different request hash returns conflict",
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
        request({
          patch: { ...reviewPatch, status: "resolved" },
          sourceDocumentRef,
        }),
      );

      assert.equal(conflict.status, "conflict");
      assert.equal((await readException()).status, "in_review");
      assert.equal(await countRows("audit_events"), 1);
      assert.equal(await countRows("idempotency_records"), 1);
    },
  },
  {
    name: "same idempotency key on a different resource does not collide after T3",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException({ id: "provider-a1-exception-one" });
      await seedException({ id: "provider-a1-exception-two" });

      const first = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          exceptionId: "provider-a1-exception-one",
          idempotencyKey: "provider-a1-shared-key",
        }),
      );
      const second = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({
          exceptionId: "provider-a1-exception-two",
          idempotencyKey: "provider-a1-shared-key",
        }),
      );

      assertAccepted(first);
      assertAccepted(second);
      assert.equal(await countRows("idempotency_records"), 2);
      assert.equal(await countRows("audit_events"), 2);

      const resources = (await readIdempotencyRows()).map((row) => row.resource_id);
      assert.deepEqual(resources, [
        "provider-a1-exception-one",
        "provider-a1-exception-two",
      ]);
    },
  },
  {
    name: "in-flight duplicate returns the approved in-flight outcome",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      await pool.query(
        `
          INSERT INTO idempotency_records (
            tenant_id, operation, resource_type, resource_id, idempotency_key,
            request_hash, lifecycle_status, replay_headers, expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'reserved', '{}'::jsonb, $7)
        `,
        [
          tenantA,
          EXCEPTION_REVIEW_OPERATION,
          TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
          exceptionId,
          "provider-a1-inflight",
          requestHash(),
          new Date(now.getTime() + 60_000),
        ],
      );

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ idempotencyKey: "provider-a1-inflight" }),
      );

      assert.equal(outcome.status, "in_flight");
      assert.equal((await readException()).status, "open");
      assert.equal(await countRows("audit_events"), 0);
      assert.equal(await countRows("idempotency_records"), 1);
    },
  },
  {
    name: "expired in-flight record can be reclaimed in place",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      await pool.query(
        `
          INSERT INTO idempotency_records (
            tenant_id, operation, resource_type, resource_id, idempotency_key,
            request_hash, lifecycle_status, replay_headers, expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'reserved', '{}'::jsonb, $7)
        `,
        [
          tenantA,
          EXCEPTION_REVIEW_OPERATION,
          TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
          exceptionId,
          "provider-a1-expired",
          requestHash(),
          new Date(now.getTime() - 1_000),
        ],
      );
      const beforeRows = await readIdempotencyRows();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ idempotencyKey: "provider-a1-expired" }),
      );
      assertAccepted(outcome);

      const afterRows = await readIdempotencyRows();
      assert.equal(afterRows.length, 1);
      assert.equal(afterRows[0]?.id, beforeRows[0]?.id);
      assert.equal(afterRows[0]?.lifecycle_status, "completed");
      assert.equal(outcome.idempotencyState, "reclaimed");
    },
  },
  {
    name: "accepted update appends audit event with structured evidence metadata",
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
      assert.equal(audits[0]?.source, "provider-backed-exception-review-a1");
      assert.equal(audits[0]?.reason, "ambiguous_lot_code");
      assert.ok(audits[0]?.created_at instanceof Date);

      const metadata = audits[0]?.metadata as Record<string, unknown>;
      assert.equal(metadata.source_document_ref, sourceDocumentRef);
      assert.equal(metadata.from_status, "open");
      assert.equal(metadata.to_status, "in_review");
      assert.equal(metadata.review_notes_present, true);
      assert.equal(
        JSON.stringify(metadata).includes(reviewPatch.reviewNotes as string),
        false,
      );
    },
  },
  {
    name: "rate-limit persistence and route wiring remain absent in A1",
    async run() {
      await resetTables();

      const tables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('rate_limit', 'rate_limits')
        `,
      );
      assert.deepEqual(tables.rows, []);

      const routePath = path.join(
        process.cwd(),
        "app",
        "api",
        "traceability",
        "exceptions",
        "[exceptionId]",
        "route.ts",
      );
      const routeSource = await readFile(routePath, "utf8");
      assert.doesNotMatch(routeSource, /lib\/db\/client|lib\\db\\client/);
      assert.doesNotMatch(routeSource, /exception-review-provider/);
    },
  },
];

try {
  await ensureMigrated();

  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }

  console.log("Provider-backed exception-review Batch A1 tests passed.");
} finally {
  await pool.end();
}
