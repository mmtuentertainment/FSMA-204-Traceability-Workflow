import assert from "node:assert/strict";

import pg from "pg";
import type { Pool } from "pg";

import {
  EXCEPTION_REVIEW_OPERATION,
  TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
  reviewTraceabilityExceptionInTransaction,
  type ProviderExceptionPatch,
  type ProviderExceptionReviewRequest,
} from "../../lib/db/exception-review-provider.ts";
import {
  FixtureFixedWindowRateLimiter,
  type RateLimitScope,
} from "../../lib/security/rate-limit.ts";
import { rateLimitedResponse } from "../../lib/api/problem.ts";

// Batch 62 — rate-limit posture (Area 5). Verifies that an OPTIONAL injected limiter,
// checked AFTER RBAC and BEFORE the idempotency reservation, can deny a fully-valid
// review with a `rate_limited` outcome that touches NO database state, while keeping the
// limiter-absent path byte-identical to a1-a4. Load-bearing IDs: A5-02..06, A5-12.

const { Pool: PgPool } = pg;

const tenantA = "provider-a5-tenant-a";
const reviewer = "provider-a5-reviewer";
const exceptionId = "provider-a5-exception";
const sourceDocumentRef = "source-doc://provider-a5/evidence";
const originalSourceDocumentRef = "source-doc://provider-a5/original";
const originalReviewNotes = "Original provider-backed A5 note.";
const now = new Date("2026-06-04T15:00:00.000Z");

const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A5 test.",
  humanReviewRequired: true,
};

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

type ExceptionState = {
  status: string;
  review_reason: string | null;
  human_review_required: boolean;
  review_notes: string | null;
  source_document_ref: string | null;
  reviewed_by_auth_subject_id: string | null;
  reviewed_at: Date | null;
};

const pool: Pool = new PgPool({
  connectionString: resolveTestDatabaseUrl(),
  max: 4,
});

function resolveTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required for provider-backed Batch A5 tests.",
    );
  }

  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const looksLikeTestDatabase = /(^|[_-])(test|a5)([_-]|$)/i.test(databaseName);

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

async function seedMembership(
  args: { tenantId?: string; authSubjectId?: string } = {},
): Promise<void> {
  await pool.query(
    `
      INSERT INTO tenant_memberships (tenant_id, auth_subject_id, role)
      VALUES ($1, $2, 'quality_reviewer')
    `,
    [args.tenantId ?? tenantA, args.authSubjectId ?? reviewer],
  );
}

async function seedException(
  args: { id?: string; tenantId?: string } = {},
): Promise<void> {
  await pool.query(
    `
      INSERT INTO traceability_exceptions (
        id, tenant_id, type, status, lot_id, event_id, message,
        review_reason, human_review_required, review_notes, source_document_ref
      )
      VALUES ($1, $2, 'missing_kde', 'open', 'lot-provider-a5',
        'event-provider-a5', 'Provider-backed A5 exception awaiting review.',
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
    idempotencyKey: "provider-a5-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a5",
    sourceDocumentRef,
    now,
    ...overrides,
  };
}

function reviewScope(): RateLimitScope {
  return {
    tenantId: tenantA,
    actorId: reviewer,
    action: "exception.review.update",
    resourceRef: exceptionId,
  };
}

// A deny-everything limiter: limit 0 over a fixed 60s window with a frozen clock. The
// first check in any scope exceeds the limit, so a fully-valid review is denied with a
// deterministic Retry-After of 60 seconds.
function denyLimiter(): FixtureFixedWindowRateLimiter {
  return new FixtureFixedWindowRateLimiter(0, 60_000, () => 0);
}

// An allow limiter with headroom: the single review under test is well under the limit.
function allowLimiter(): FixtureFixedWindowRateLimiter {
  return new FixtureFixedWindowRateLimiter(5, 60_000, () => 0);
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

const unreviewedState: ExceptionState = {
  status: "open",
  review_reason: "other",
  human_review_required: false,
  review_notes: originalReviewNotes,
  source_document_ref: originalSourceDocumentRef,
  reviewed_by_auth_subject_id: null,
  reviewed_at: null,
};

const tests: TestCase[] = [
  {
    name: "A5-01 under-limit limiter allows a valid review (accepted, normal writes)",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: allowLimiter() }),
      );

      assert.equal(outcome.status, "accepted");
      assert.equal((await readException()).status, "in_review");
      assert.equal(await countRows("audit_events"), 1);
      assert.equal(await countRows("idempotency_records"), 1);
    },
  },
  {
    name: "A5-02 limiter denies a valid review with a rate_limited outcome (integer Retry-After >= 1)",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: denyLimiter() }),
      );

      assert.equal(outcome.status, "rate_limited");
      if (outcome.status !== "rate_limited") {
        return;
      }
      assert.ok(
        Number.isInteger(outcome.retryAfterSeconds),
        "retryAfterSeconds must be an integer",
      );
      assert.ok(
        outcome.retryAfterSeconds >= 1,
        "retryAfterSeconds must be >= 1",
      );
      assert.equal(outcome.retryAfterSeconds, 60);
    },
  },
  {
    name: "A5-04 a rate-limited review leaves the exception unmutated",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: denyLimiter() }),
      );

      assert.equal(outcome.status, "rate_limited");
      assert.deepEqual(await readException(), unreviewedState);
    },
  },
  {
    name: "A5-05 a rate-limited review appends no audit event",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: denyLimiter() }),
      );

      assert.equal(outcome.status, "rate_limited");
      assert.equal(await countRows("audit_events"), 0);
    },
  },
  {
    name: "A5-06 a rate-limited review reserves no idempotency record",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: denyLimiter() }),
      );

      assert.equal(outcome.status, "rate_limited");
      assert.equal(await countRows("idempotency_records"), 0);
    },
  },
  {
    name: "A5-15 RBAC runs before the limiter (unauthorized actor is forbidden, not rate_limited)",
    async run() {
      await resetTables();
      // No membership seeded: the actor is not an authorized reviewer.
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request({ limiter: denyLimiter() }),
      );

      assert.equal(
        outcome.status,
        "forbidden",
        "RBAC must deny before the limiter is consulted",
      );
      assert.equal(await countRows("idempotency_records"), 0);
    },
  },
  {
    name: "A5-13 limiter-absent review is byte-identical to the a1-a4 accepted path",
    async run() {
      await resetTables();
      await seedMembership();
      await seedException();

      const outcome = await reviewTraceabilityExceptionInTransaction(
        pool,
        request(),
      );

      assert.equal(outcome.status, "accepted");
      assert.equal((await readException()).status, "in_review");
      assert.equal(await countRows("audit_events"), 1);
      assert.equal(await countRows("idempotency_records"), 1);
    },
  },
  {
    name: "A5-03 rateLimitedResponse emits a 429 problem+json with an integer Retry-After >= 1",
    async run() {
      const instance = "/api/traceability/exceptions/provider-a5-exception";
      const response = rateLimitedResponse(instance, "Rate limit exceeded", 60);

      assert.equal(response.status, 429);
      assert.equal(response.headers.get("Retry-After"), "60");
      assert.equal(
        response.headers.get("Content-Type"),
        "application/problem+json",
      );

      const body = (await response.json()) as Record<string, unknown>;
      assert.equal(body.status, 429);
      assert.equal(body.title, "Too Many Requests");
      assert.equal(body.type, "about:blank");
      assert.equal(body.detail, "Rate limit exceeded");
      assert.equal(body.instance, instance);

      // The Retry-After header is clamped to a whole number of seconds >= 1.
      assert.equal(
        rateLimitedResponse(instance, "d", 0).headers.get("Retry-After"),
        "1",
        "non-positive retry must clamp up to 1",
      );
      assert.equal(
        rateLimitedResponse(instance, "d", 2.4).headers.get("Retry-After"),
        "3",
        "fractional retry must ceil to a whole second",
      );
    },
  },
  {
    name: "A5-12 fixed-window boundary burst is documented, not prevented",
    async run() {
      const clock = { ms: 0 };
      const limiter = new FixtureFixedWindowRateLimiter(
        2,
        1_000,
        () => clock.ms,
      );
      const scope = reviewScope();

      // Window 1 = [0, 1000): two allowed, the limit.
      clock.ms = 0;
      assert.equal((await limiter.check(scope)).status, "allow");
      assert.equal((await limiter.check(scope)).status, "allow");

      // The limit IS enforced within a window: a 3rd call in window 1 is denied.
      clock.ms = 999;
      assert.equal((await limiter.check(scope)).status, "deny");

      // Crossing the boundary into window 2 grants a fresh full quota immediately.
      // Combined with window 1, up to 2x the limit passes in a sub-window span. This
      // documents the fixed-window burst weakness; it must NOT assert prevention.
      clock.ms = 1_000;
      assert.equal((await limiter.check(scope)).status, "allow");
      assert.equal((await limiter.check(scope)).status, "allow");
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

    console.log("Provider-backed exception-review Batch A5 tests passed.");
  } finally {
    await pool.end();
  }
}

await run().catch((error: unknown) => {
  console.error(error);
  throw error;
});
