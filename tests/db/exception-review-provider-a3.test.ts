import assert from "node:assert/strict";

import pg from "pg";
import type { Pool } from "pg";

import * as providerModule from "../../lib/db/exception-review-provider.ts";
import type {
  ProviderExceptionPatch,
  ProviderExceptionReviewRequest,
} from "../../lib/db/exception-review-provider.ts";

const { Pool: PgPool } = pg;
const { reviewTraceabilityExceptionInTransaction } = providerModule;

const tenantA = "provider-a3-tenant-a";
const reviewer = "provider-a3-reviewer";
const exceptionId = "provider-a3-exception";
const sourceDocumentRef = "source-doc://provider-a3/evidence";
const now = new Date("2026-06-03T18:00:00.000Z");

const reviewPatch: ProviderExceptionPatch = {
  status: "in_review",
  reviewReason: "ambiguous_lot_code",
  reviewNotes: "Reviewed by provider-backed Batch A3 test.",
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
      "TEST_DATABASE_URL is required for provider-backed Batch A3 tests.",
    );
  }

  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const looksLikeTestDatabase = /(^|[_-])(test|a3)([_-]|$)/i.test(
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
      VALUES ($1, $2, 'missing_kde', 'open', 'lot-provider-a3',
        'event-provider-a3', 'Provider-backed A3 exception awaiting review.',
        'ambiguous_lot_code', true, 'Original provider-backed A3 note.',
        'source-doc://provider-a3/original')
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
    idempotencyKey: "provider-a3-key-0001",
    patch: reviewPatch,
    source: "provider-backed-exception-review-a3",
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

function assertAccepted(
  outcome: Awaited<ReturnType<typeof reviewTraceabilityExceptionInTransaction>>,
): asserts outcome is Extract<typeof outcome, { status: "accepted" }> {
  if (outcome.status !== "accepted") {
    assert.fail(`Expected accepted outcome, received ${outcome.status}.`);
  }
}

// A4-18/19 — append-only audit surface guard.
//
// The audit trail must be APPEND-ONLY: the provider may expose append paths
// (`appendExceptionReviewAuditEvent`, `appendExceptionReviewErrorAuditEvent`) but
// must NOT expose any audit mutate/delete/remove path. Proving a negative
// behaviorally is impossible, so this is a structural regression guard: an exported
// runtime symbol whose name names BOTH "audit" AND a mutating verb
// (update|delete|remove) would be an append-only violation. The verb-with-audit
// pairing is what makes the unrelated `deleteIdempotencyRecord` correctly safe.
function isForbiddenAuditMutator(name: string): boolean {
  return /audit/i.test(name) && /(update|delete|remove)/i.test(name);
}

const tests: TestCase[] = [
  {
    name: "append-only audit surface: provider exposes no audit update/delete/remove export (A4-18/19)",
    async run() {
      // TS type-only exports are erased by --experimental-strip-types, so the runtime
      // namespace contains only runtime values (consts + functions) — exactly the
      // surface a route could call.
      const exportedNames = Object.keys(providerModule);

      // Non-vacuity / positive + negative controls: the predicate MUST flag an audit
      // mutator and MUST NOT flag the legitimate append fns or the unrelated
      // idempotency delete. If the predicate ever regresses to always-false, these fail.
      assert.equal(isForbiddenAuditMutator("updateAuditEvent"), true);
      assert.equal(isForbiddenAuditMutator("deleteAuditEvent"), true);
      assert.equal(isForbiddenAuditMutator("removeAuditEvent"), true);
      assert.equal(isForbiddenAuditMutator("auditEventUpdate"), true);
      assert.equal(
        isForbiddenAuditMutator("appendExceptionReviewAuditEvent"),
        false,
      );
      assert.equal(
        isForbiddenAuditMutator("appendExceptionReviewErrorAuditEvent"),
        false,
      );
      assert.equal(isForbiddenAuditMutator("deleteIdempotencyRecord"), false);
      assert.equal(
        isForbiddenAuditMutator("applyTenantScopedExceptionReview"),
        false,
      );

      // The two append entry points exist and are callable (A4-18/19 anchor): the
      // append-only surface must keep offering a way to write audit evidence.
      assert.equal(
        typeof providerModule.appendExceptionReviewAuditEvent,
        "function",
      );
      assert.equal(
        typeof providerModule.appendExceptionReviewErrorAuditEvent,
        "function",
      );

      // The guarantee: NO exported symbol is an audit mutator/deleter/remover.
      const offenders = exportedNames.filter(isForbiddenAuditMutator);
      assert.deepEqual(
        offenders,
        [],
        `Append-only audit surface violated: exported audit mutators ${JSON.stringify(
          offenders,
        )}. The provider must expose only append paths for audit_events (A4-18/19).`,
      );
    },
  },
  {
    name: "append-only is a convention, not DB-enforced: privileged raw UPDATE and DELETE on audit_events both succeed (A4-20)",
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

      // A privileged raw UPDATE succeeds — there is no DB-level trigger / rule / GRANT
      // enforcing append-only on audit_events (migration 0000 documents append-only
      // only as a COMMENT). Re-read to prove the mutation actually took effect.
      const updated = await pool.query(
        `UPDATE audit_events SET reason = $2 WHERE id = $1`,
        [auditId, "tampered-by-a3-non-enforcement-proof"],
      );
      assert.equal(updated.rowCount, 1);
      const afterUpdate = await pool.query<{ reason: string | null }>(
        `SELECT reason FROM audit_events WHERE id = $1`,
        [auditId],
      );
      assert.equal(
        afterUpdate.rows[0]?.reason,
        "tampered-by-a3-non-enforcement-proof",
      );

      // The accepted transition's completed idempotency record FK-references this audit
      // row (idempotency_records.audit_event_id, ON DELETE no action). That FK is a
      // REFERENTIAL constraint, NOT an append-only guard — clear it so the DELETE below
      // exercises only the (absent) append-only enforcement on audit_events itself.
      await pool.query(
        `UPDATE idempotency_records SET audit_event_id = NULL WHERE audit_event_id = $1`,
        [auditId],
      );

      // A privileged raw DELETE succeeds for the same reason: append-only is not
      // enforced at the database layer in this scaffold.
      const deleted = await pool.query(
        `DELETE FROM audit_events WHERE id = $1`,
        [auditId],
      );
      assert.equal(deleted.rowCount, 1);
      assert.equal(await countRows("audit_events"), 0);

      // Documented expectation: append-only audit evidence is a CONVENTION in the
      // current repository/service slice. DB-level enforcement is deferred to Batch B
      // runtime hardening (T6/T9).
      //
      // NOTE for Batch B — this test connects as the Postgres superuser/owner, which
      // BYPASSES grants, so a `REVOKE UPDATE,DELETE` alone would NOT flip this guard
      // (the raw UPDATE/DELETE above would still succeed = silently green). Enforce via
      // a BEFORE UPDATE/DELETE trigger (declare it ENABLE ALWAYS — fires for the
      // owner/superuser too) AND/OR re-run this test as a restricted non-owner role,
      // then invert the rowCount===1 success asserts above to expect rejection. This is
      // the regression guard that must flip — and demand updating — the day enforcement
      // is added.
    },
  },
];

try {
  await ensureMigrated();

  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }

  console.log("Provider-backed exception-review Batch A3 tests passed.");
} finally {
  await pool.end();
}
