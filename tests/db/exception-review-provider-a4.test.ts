import assert from "node:assert/strict";

import pg from "pg";
import type { Pool, PoolClient } from "pg";

import {
  EXCEPTION_REVIEW_OPERATION,
  TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
  computeExceptionReviewRequestHash,
  reviewTraceabilityExceptionInTransaction,
  type ProviderExceptionPatch,
  type ProviderExceptionReviewRequest,
} from "../../lib/db/exception-review-provider.ts";

const { Pool: PgPool } = pg;

const tenantA = "provider-a4-tenant-a";
const reviewer = "provider-a4-reviewer";
const exceptionId = "provider-a4-exception";
const sourceDocumentRef = "source-doc://provider-a4/evidence";
const originalSourceDocumentRef = "source-doc://provider-a4/original";
const originalReviewNotes = "Original provider-backed A4 note.";
const now = new Date("2026-06-04T14:00:00.000Z");

const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A4 test.",
  humanReviewRequired: true,
};

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

type QueryLogEntry = {
  index: number;
  text: string;
};

type PoolConnectCallback = (
  err: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: any) => void,
) => void;

type ExceptionState = {
  status: string;
  review_reason: string | null;
  human_review_required: boolean;
  review_notes: string | null;
  source_document_ref: string | null;
  reviewed_by_auth_subject_id: string | null;
  reviewed_at: Date | null;
};

type AuditRow = {
  id: unknown;
  tenant_id: string;
  actor_auth_subject_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  source: string;
  reason: string | null;
};

type IdempotencyRow = {
  id: unknown;
  request_hash: string;
  lifecycle_status: string;
  replay_status: number | null;
  audit_event_id: unknown;
};

const pool: Pool = new PgPool({
  connectionString: resolveTestDatabaseUrl(),
  max: 4,
});

// Success-path query index map for FaultInjectionPool:
// 1 BEGIN
// 2 tenant membership SELECT
// 3 idempotency reservation INSERT
// 4 traceability exception SELECT FOR UPDATE
// 5 traceability exception UPDATE
// 6 audit_events INSERT
// 7 idempotency_records completion UPDATE
class FaultInjectionPool extends PgPool {
  readonly queryLog: QueryLogEntry[] = [];
  injectedQueryIndex: number | null = null;
  injectedQueryText: string | null = null;
  private readonly injectionIndex: number;
  private queryCount = 0;

  constructor(injectionIndex: number) {
    super({
      connectionString: resolveTestDatabaseUrl(),
      max: 1,
    });
    this.injectionIndex = injectionIndex;
  }

  connect(): Promise<PoolClient>;
  connect(callback: PoolConnectCallback): void;
  connect(callback?: PoolConnectCallback): Promise<PoolClient> | void {
    if (callback) {
      void this.connectWithInjection()
        .then((client) => {
          callback(
            undefined,
            client,
            client.release.bind(client) as (release?: any) => void,
          );
        })
        .catch((error: unknown) => {
          callback(toError(error), undefined, () => undefined);
        });
      return;
    }

    return this.connectWithInjection();
  }

  private async connectWithInjection(): Promise<PoolClient> {
    const client = await super.connect();
    const originalQuery = client.query.bind(client) as (
      ...args: unknown[]
    ) => unknown;

    client.query = (async (...args: unknown[]) => {
      const text = extractQueryText(args[0]);
      this.queryCount += 1;
      this.queryLog.push({ index: this.queryCount, text });

      if (this.queryCount === this.injectionIndex) {
        this.injectedQueryIndex = this.queryCount;
        this.injectedQueryText = text;
        throw new Error(
          `Injected provider transaction query failure at index ${this.injectionIndex}: ${normalizeSql(
            text,
          )}`,
        );
      }

      return originalQuery(...args);
    }) as PoolClient["query"];

    return client;
  }
}

function resolveTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required for provider-backed Batch A4 tests.",
    );
  }

  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const looksLikeTestDatabase = /(^|[_-])(test|a4)([_-]|$)/i.test(
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
      VALUES ($1, $2, 'missing_kde', 'open', 'lot-provider-a4',
        'event-provider-a4', 'Provider-backed A4 exception awaiting review.',
        'other', false, $3, $4)
    `,
    [
      args.id ?? exceptionId,
      args.tenantId ?? tenantA,
      originalReviewNotes,
      originalSourceDocumentRef,
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
    idempotencyKey: "provider-a4-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a4",
    sourceDocumentRef,
    now,
    ...overrides,
  };
}

function expectedRequestHash(
  patch: ProviderExceptionPatch = reviewPatch,
  ref: string | null = sourceDocumentRef,
  actorAuthSubjectId: string = reviewer,
): string {
  return computeExceptionReviewRequestHash({
    patch,
    sourceDocumentRef: ref,
    actorAuthSubjectId,
  });
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}`,
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function readException(id = exceptionId): Promise<ExceptionState> {
  const result = await pool.query<ExceptionState>(
    `
      SELECT status, review_reason, human_review_required, review_notes,
        source_document_ref, reviewed_by_auth_subject_id, reviewed_at
      FROM traceability_exceptions
      WHERE id = $1
    `,
    [id],
  );

  const row = result.rows[0];
  assert.ok(row, `Expected traceability exception ${id} to exist.`);
  return row;
}

async function readAuditRows(): Promise<AuditRow[]> {
  const result = await pool.query<AuditRow>(
    `
      SELECT id, tenant_id, actor_auth_subject_id, action, resource_type,
        resource_id, source, reason
      FROM audit_events
      ORDER BY id
    `,
  );

  return result.rows;
}

async function readIdempotencyRows(): Promise<IdempotencyRow[]> {
  const result = await pool.query<IdempotencyRow>(
    `
      SELECT id, request_hash, lifecycle_status, replay_status, audit_event_id
      FROM idempotency_records
      ORDER BY id
    `,
  );

  return result.rows;
}

function assertAccepted(
  outcome: Awaited<ReturnType<typeof reviewTraceabilityExceptionInTransaction>>,
): asserts outcome is Extract<typeof outcome, { status: "accepted" }> {
  if (outcome.status !== "accepted") {
    assert.fail(`Expected accepted outcome, received ${outcome.status}.`);
  }
}

async function runFaultedReview(
  injectionIndex: number,
  reviewRequest: ProviderExceptionReviewRequest,
): Promise<FaultInjectionPool> {
  const faultPool = new FaultInjectionPool(injectionIndex);

  try {
    await reviewTraceabilityExceptionInTransaction(faultPool, reviewRequest);
    assert.fail(`Expected injected query failure at index ${injectionIndex}.`);
  } catch (error: unknown) {
    const thrown = toError(error);
    assert.match(
      thrown.message,
      new RegExp(`Injected provider transaction query failure at index ${injectionIndex}`),
    );
    return faultPool;
  } finally {
    await faultPool.end();
  }
}

function assertFaultInjection(
  faultPool: FaultInjectionPool,
  expectedIndex: number,
  expectedQuery: RegExp,
): void {
  assert.equal(faultPool.injectedQueryIndex, expectedIndex);
  assert.match(normalizeSql(faultPool.injectedQueryText ?? ""), expectedQuery);
  assert.equal(
    normalizeSql(faultPool.queryLog.at(-1)?.text ?? ""),
    "ROLLBACK",
    "Faulted provider transaction should issue ROLLBACK after the injected failure.",
  );
}

function assertSuccessPathPrefix(faultPool: FaultInjectionPool): void {
  assert.equal(normalizeSql(queryTextAt(faultPool, 1)), "BEGIN");
  assert.match(
    normalizeSql(queryTextAt(faultPool, 2)),
    /^SELECT tenant_id, auth_subject_id, role FROM tenant_memberships /,
  );
  assert.match(
    normalizeSql(queryTextAt(faultPool, 3)),
    /^INSERT INTO idempotency_records /,
  );
  assert.match(
    normalizeSql(queryTextAt(faultPool, 4)),
    /^SELECT id, type, status, lot_id, event_id, message, review_reason, human_review_required, review_notes, source_document_ref FROM traceability_exceptions /,
  );
  assert.match(
    normalizeSql(queryTextAt(faultPool, 5)),
    /^UPDATE traceability_exceptions SET status = /,
  );
}

async function assertRolledBackState(): Promise<void> {
  assert.deepEqual(await readException(), {
    status: "open",
    review_reason: "other",
    human_review_required: false,
    review_notes: originalReviewNotes,
    source_document_ref: originalSourceDocumentRef,
    reviewed_by_auth_subject_id: null,
    reviewed_at: null,
  });
  assert.equal(await countRows("audit_events"), 0);
  assert.equal(await countRows("idempotency_records"), 0);
}

async function assertCleanAcceptedRetry(): Promise<void> {
  const outcome = await reviewTraceabilityExceptionInTransaction(
    pool,
    request(),
  );
  assertAccepted(outcome);

  assert.deepEqual(await readException(), {
    status: "in_review",
    review_reason: "ambiguous_lot_code",
    human_review_required: true,
    review_notes: reviewPatch.reviewNotes,
    source_document_ref: sourceDocumentRef,
    reviewed_by_auth_subject_id: reviewer,
    reviewed_at: now,
  });

  const audits = await readAuditRows();
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.tenant_id, tenantA);
  assert.equal(audits[0]?.actor_auth_subject_id, reviewer);
  assert.equal(audits[0]?.action, EXCEPTION_REVIEW_OPERATION);
  assert.equal(audits[0]?.resource_type, TRACEABILITY_EXCEPTION_RESOURCE_TYPE);
  assert.equal(audits[0]?.resource_id, exceptionId);
  assert.equal(audits[0]?.source, "provider-backed-exception-review-a4");
  assert.equal(audits[0]?.reason, "ambiguous_lot_code");

  const idempotencyRows = await readIdempotencyRows();
  assert.equal(idempotencyRows.length, 1);
  assert.equal(idempotencyRows[0]?.lifecycle_status, "completed");
  assert.equal(idempotencyRows[0]?.replay_status, 200);
  assert.equal(idempotencyRows[0]?.request_hash, expectedRequestHash());
  assert.equal(idempotencyRows[0]?.audit_event_id, audits[0]?.id);
}

function queryTextAt(faultPool: FaultInjectionPool, index: number): string {
  const entry = faultPool.queryLog.find((query) => query.index === index);
  assert.ok(entry, `Expected fault pool to record query index ${index}.`);
  return entry.text;
}

function extractQueryText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }

  return String(value);
}

function normalizeSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const tests: TestCase[] = [
  {
    name: "A3-15 audit insert failure rolls back exception, audit, and idempotency writes",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const faultPool = await runFaultedReview(6, request());

      assertSuccessPathPrefix(faultPool);
      assertFaultInjection(faultPool, 6, /^INSERT INTO audit_events \(/);
      await assertRolledBackState();
    },
  },
  {
    name: "A3-16 idempotency completion failure rolls back exception and audit writes",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const faultPool = await runFaultedReview(7, request());

      assertSuccessPathPrefix(faultPool);
      assertFaultInjection(
        faultPool,
        7,
        /^UPDATE idempotency_records SET lifecycle_status = 'completed'/,
      );
      await assertRolledBackState();
    },
  },
  {
    name: "A4-17 fault leaves no orphan rows and clean retry succeeds",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const faultPool = await runFaultedReview(7, request());

      assertSuccessPathPrefix(faultPool);
      assertFaultInjection(
        faultPool,
        7,
        /^UPDATE idempotency_records SET lifecycle_status = 'completed'/,
      );
      await assertRolledBackState();

      await assertCleanAcceptedRetry();
    },
  },
];

async function run(): Promise<void> {
  try {
    await ensureMigrated();

    for (const test of tests) {
      await test.run();
      console.log(`PASS ${test.name}`);
    }

    console.log("Provider-backed exception-review Batch A4 tests passed.");
  } finally {
    await pool.end();
  }
}

await run().catch((error: unknown) => {
  console.error(error);
  throw error;
});
