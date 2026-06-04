import { createHash } from "node:crypto";

import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import { stableStringify } from "../shared/canonical-json.ts";

export const EXCEPTION_REVIEW_OPERATION = "exception.review.update";
export const TRACEABILITY_EXCEPTION_RESOURCE_TYPE = "traceability_exception";

const SUCCESS_CONTENT_TYPE = "application/json";
const IDEMPOTENCY_KEY_MIN_LENGTH = 8;
const IDEMPOTENCY_KEY_MAX_LENGTH = 200;
const DEFAULT_RESERVATION_TTL_MS = 5 * 60 * 1000;
const IDEMPOTENCY_CONFLICT_REASON = "idempotency_request_hash_mismatch";
const REPLAY_HEADER_ALLOWLIST = new Set([
  "content-type",
  "location",
  "retry-after",
  "x-request-id",
]);

export type TenantRole = "tenant_admin" | "quality_reviewer" | "read_only";
export type ExceptionStatus = "open" | "in_review" | "resolved" | "deferred";
export type ExceptionReviewReason =
  | "ambiguous_exemption"
  | "kill_step_review"
  | "imported_food_review"
  | "partial_exemption_review"
  | "ambiguous_lot_code"
  | "other";

export interface ProviderDbClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
}

export interface TenantMembership {
  tenantId: string;
  authSubjectId: string;
  role: TenantRole;
}

export interface ProviderExceptionRecord {
  id: string;
  type: string;
  status: ExceptionStatus;
  lot_id?: string;
  event_id?: string;
  message?: string;
  review_reason?: ExceptionReviewReason | null;
  human_review_required: boolean;
  review_notes?: string | null;
  source_document_ref?: string | null;
}

export interface ProviderExceptionPatch {
  status?: ExceptionStatus;
  reviewReason?: ExceptionReviewReason | null;
  reviewNotes?: string | null;
  humanReviewRequired?: boolean;
}

export interface ProviderExceptionReviewRequest {
  tenantId: string;
  actorAuthSubjectId: string;
  exceptionId: string;
  idempotencyKey: string;
  patch: ProviderExceptionPatch;
  source: string;
  sourceDocumentRef?: string | null;
  now?: Date;
  requestHash?: string;
  reservationTtlMs?: number;
  replayHeaders?: Record<string, string | number | undefined>;
}

export interface ProviderProblemDetails {
  type: "about:blank";
  title: "Conflict";
  status: 409;
  detail: string;
  context: {
    operation: string;
    resource_type: string;
    resource_id: string;
    idempotency_key: string;
    reason: typeof IDEMPOTENCY_CONFLICT_REASON;
  };
}

export type ProviderExceptionReviewOutcome =
  | {
      status: "accepted";
      record: ProviderExceptionRecord;
      auditEventId: number;
      idempotencyRecordId: number;
      idempotencyState: "fresh" | "reclaimed";
    }
  | {
      status: "replayed";
      record: ProviderExceptionRecord;
      auditEventId: number | null;
      idempotencyRecordId: number;
    }
  | {
      status: "conflict";
      idempotencyRecordId: number;
      auditEventId: number;
      problem: ProviderProblemDetails;
      storedResponseBody: ProviderExceptionRecord | null;
    }
  | { status: "in_flight"; idempotencyRecordId: number; retryAfterSeconds: number }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "validation_error"; detail: string };

interface ExceptionRow extends QueryResultRow {
  id: string;
  type: string;
  status: ExceptionStatus;
  lot_id: string | null;
  event_id: string | null;
  message: string | null;
  review_reason: ExceptionReviewReason | null;
  human_review_required: boolean;
  review_notes: string | null;
  source_document_ref: string | null;
}

interface TenantMembershipRow extends QueryResultRow {
  tenant_id: string;
  auth_subject_id: string;
  role: TenantRole;
}

interface IdempotencyRecordRow extends QueryResultRow {
  id: number;
  request_hash: string;
  lifecycle_status: "reserved" | "completed" | "failed" | "expired";
  replay_status: number | null;
  replay_content_type: string | null;
  replay_body: ProviderExceptionRecord | null;
  replay_headers: Record<string, unknown>;
  audit_event_id: number | null;
  expires_at: Date;
}

interface AuditEventRow extends QueryResultRow {
  id: number;
}

export async function withProviderExceptionReviewTransaction<T>(
  pool: Pool,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getActiveTenantMembership(
  client: ProviderDbClient,
  args: { tenantId: string; authSubjectId: string },
): Promise<TenantMembership | null> {
  const result = await client.query<TenantMembershipRow>(
    `
      SELECT tenant_id, auth_subject_id, role
      FROM tenant_memberships
      WHERE tenant_id = $1
        AND auth_subject_id = $2
        AND disabled_at IS NULL
      LIMIT 1
    `,
    [args.tenantId, args.authSubjectId],
  );
  const row = result.rows[0];

  return row
    ? {
        tenantId: row.tenant_id,
        authSubjectId: row.auth_subject_id,
        role: row.role,
      }
    : null;
}

export async function applyTenantScopedExceptionReview(
  client: ProviderDbClient,
  args: {
    tenantId: string;
    exceptionId: string;
    actorAuthSubjectId: string;
    patch: ProviderExceptionPatch;
    sourceDocumentRef?: string | null;
    reviewedAt: Date;
  },
): Promise<
  | { status: "applied"; before: ProviderExceptionRecord; record: ProviderExceptionRecord }
  | { status: "not_found" }
> {
  const current = await client.query<ExceptionRow>(
    `
      SELECT id, type, status, lot_id, event_id, message, review_reason,
        human_review_required, review_notes, source_document_ref
      FROM traceability_exceptions
      WHERE tenant_id = $1
        AND id = $2
      FOR UPDATE
    `,
    [args.tenantId, args.exceptionId],
  );
  const beforeRow = current.rows[0];

  if (!beforeRow) {
    return { status: "not_found" };
  }

  const before = toExceptionRecord(beforeRow);
  const updated = await client.query<ExceptionRow>(
    `
      UPDATE traceability_exceptions
      SET status = CASE WHEN $3::boolean THEN $4::text ELSE status END,
        review_reason = CASE WHEN $5::boolean THEN $6::text ELSE review_reason END,
        review_notes = CASE WHEN $7::boolean THEN $8::text ELSE review_notes END,
        human_review_required = CASE WHEN $9::boolean THEN $10::boolean ELSE human_review_required END,
        source_document_ref = CASE WHEN $11::boolean THEN $12::text ELSE source_document_ref END,
        reviewed_by_auth_subject_id = $13,
        reviewed_at = $14,
        updated_at = $14
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id, type, status, lot_id, event_id, message, review_reason,
        human_review_required, review_notes, source_document_ref
    `,
    [
      args.tenantId,
      args.exceptionId,
      args.patch.status !== undefined,
      args.patch.status ?? null,
      args.patch.reviewReason !== undefined,
      args.patch.reviewReason ?? null,
      args.patch.reviewNotes !== undefined,
      args.patch.reviewNotes ?? null,
      args.patch.humanReviewRequired !== undefined,
      args.patch.humanReviewRequired ?? null,
      args.sourceDocumentRef !== undefined,
      args.sourceDocumentRef ?? null,
      args.actorAuthSubjectId,
      args.reviewedAt,
    ],
  );

  return {
    status: "applied",
    before,
    record: toExceptionRecord(updated.rows[0] as ExceptionRow),
  };
}

export function computeExceptionReviewRequestHash(
  value: unknown,
): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export async function reserveIdempotencyRecord(
  client: ProviderDbClient,
  args: {
    tenantId: string;
    operation: string;
    resourceType: string;
    resourceId: string;
    idempotencyKey: string;
    requestHash: string;
    now: Date;
    expiresAt: Date;
  },
): Promise<
  | { status: "fresh"; idempotencyRecordId: number }
  | { status: "replayed"; idempotencyRecordId: number; replay: IdempotencyReplay }
  | {
      status: "conflict";
      idempotencyRecordId: number;
      storedResponseBody: ProviderExceptionRecord | null;
    }
  | { status: "in_flight"; idempotencyRecordId: number; retryAfterSeconds: number }
  | { status: "reclaimed"; idempotencyRecordId: number }
> {
  const inserted = await client.query<IdempotencyRecordRow>(
    `
      INSERT INTO idempotency_records (
        tenant_id, operation, resource_type, resource_id, idempotency_key,
        request_hash, lifecycle_status, replay_headers, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'reserved', '{}'::jsonb, $7)
      ON CONFLICT ON CONSTRAINT idempotency_records_tenant_operation_resource_key_unique
      DO NOTHING
      RETURNING id, request_hash, lifecycle_status, replay_status, replay_content_type,
        replay_body, replay_headers, audit_event_id, expires_at
    `,
    [
      args.tenantId,
      args.operation,
      args.resourceType,
      args.resourceId,
      args.idempotencyKey,
      args.requestHash,
      args.expiresAt,
    ],
  );
  const insertedRow = inserted.rows[0];

  if (insertedRow) {
    return { status: "fresh", idempotencyRecordId: insertedRow.id };
  }

  const locked = await client.query<IdempotencyRecordRow>(
    `
      SELECT id, request_hash, lifecycle_status, replay_status, replay_content_type,
        replay_body, replay_headers, audit_event_id, expires_at
      FROM idempotency_records
      WHERE tenant_id = $1
        AND operation = $2
        AND resource_type = $3
        AND resource_id = $4
        AND idempotency_key = $5
      FOR UPDATE
    `,
    [
      args.tenantId,
      args.operation,
      args.resourceType,
      args.resourceId,
      args.idempotencyKey,
    ],
  );
  const row = locked.rows[0];

  if (!row) {
    return reserveIdempotencyRecord(client, args);
  }

  if (row.request_hash !== args.requestHash) {
    return {
      status: "conflict",
      idempotencyRecordId: row.id,
      storedResponseBody: row.replay_body,
    };
  }

  if (row.lifecycle_status === "completed") {
    if (!row.replay_body) {
      throw new Error("Completed idempotency record is missing its replay body.");
    }

    return {
      status: "replayed",
      idempotencyRecordId: row.id,
      replay: {
        status: row.replay_status ?? 200,
        contentType: row.replay_content_type ?? SUCCESS_CONTENT_TYPE,
        body: row.replay_body,
        headers: row.replay_headers ?? {},
        auditEventId: row.audit_event_id,
      },
    };
  }

  if (row.expires_at.getTime() <= args.now.getTime()) {
    const reclaimed = await client.query<IdempotencyRecordRow>(
      `
        UPDATE idempotency_records
        SET request_hash = $2,
          lifecycle_status = 'reserved',
          replay_status = NULL,
          replay_content_type = NULL,
          replay_body = NULL,
          replay_headers = '{}'::jsonb,
          audit_event_id = NULL,
          completed_at = NULL,
          expires_at = $3
        WHERE id = $1
        RETURNING id
      `,
      [row.id, args.requestHash, args.expiresAt],
    );

    return {
      status: "reclaimed",
      idempotencyRecordId: reclaimed.rows[0]?.id ?? row.id,
    };
  }

  return {
    status: "in_flight",
    idempotencyRecordId: row.id,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((row.expires_at.getTime() - args.now.getTime()) / 1000),
    ),
  };
}

export interface IdempotencyReplay {
  status: number;
  contentType: string;
  body: ProviderExceptionRecord;
  headers: Record<string, unknown>;
  auditEventId: number | null;
}

export async function completeIdempotencyRecord(
  client: ProviderDbClient,
  args: {
    idempotencyRecordId: number;
    replayStatus: number;
    replayContentType: string;
    replayBody: unknown;
    replayHeaders: Record<string, string | number | undefined>;
    auditEventId: number;
    completedAt: Date;
  },
): Promise<void> {
  const result = await client.query(
    `
      UPDATE idempotency_records
      SET lifecycle_status = 'completed',
        replay_status = $2,
        replay_content_type = $3,
        replay_body = $4::jsonb,
        replay_headers = $5::jsonb,
        audit_event_id = $6,
        completed_at = $7
      WHERE id = $1
        AND lifecycle_status = 'reserved'
    `,
    [
      args.idempotencyRecordId,
      args.replayStatus,
      args.replayContentType,
      JSON.stringify(args.replayBody),
      JSON.stringify(sanitizeReplayHeaders(args.replayHeaders)),
      args.auditEventId,
      args.completedAt,
    ],
  );

  if (result.rowCount !== 1) {
    throw new Error("Expected one reserved idempotency record to complete.");
  }
}

export async function deleteIdempotencyRecord(
  client: ProviderDbClient,
  args: { idempotencyRecordId: number },
): Promise<void> {
  const result = await client.query(
    `
      DELETE FROM idempotency_records
      WHERE id = $1
        AND lifecycle_status = 'reserved'
    `,
    [args.idempotencyRecordId],
  );

  if (result.rowCount !== 1) {
    throw new Error("Expected one reserved idempotency record to delete.");
  }
}

export async function appendExceptionReviewAuditEvent(
  client: ProviderDbClient,
  args: {
    tenantId: string;
    actorAuthSubjectId: string;
    resourceId: string;
    source: string;
    reason?: ExceptionReviewReason | null;
    idempotencyKey: string;
    before: ProviderExceptionRecord;
    after: ProviderExceptionRecord;
  },
): Promise<number> {
  const metadata = exceptionReviewAuditMetadata(args);
  const result = await client.query<AuditEventRow>(
    `
      INSERT INTO audit_events (
        tenant_id, actor_auth_subject_id, action, resource_type, resource_id,
        source, reason, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING id
    `,
    [
      args.tenantId,
      args.actorAuthSubjectId,
      EXCEPTION_REVIEW_OPERATION,
      TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
      args.resourceId,
      args.source,
      args.reason ?? null,
      JSON.stringify(metadata),
    ],
  );

  return result.rows[0]?.id as number;
}

export async function appendExceptionReviewErrorAuditEvent(
  client: ProviderDbClient,
  args: {
    tenantId: string;
    actorAuthSubjectId: string;
    resourceId: string;
    source: string;
    idempotencyKey: string;
    status: "conflict" | "error";
    errorReason: typeof IDEMPOTENCY_CONFLICT_REASON;
    problem: ProviderProblemDetails;
    storedResponseBody: ProviderExceptionRecord | null;
  },
): Promise<number> {
  const result = await client.query<AuditEventRow>(
    `
      INSERT INTO audit_events (
        tenant_id, actor_auth_subject_id, action, resource_type, resource_id,
        source, reason, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING id
    `,
    [
      args.tenantId,
      args.actorAuthSubjectId,
      EXCEPTION_REVIEW_OPERATION,
      TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
      args.resourceId,
      args.source,
      args.errorReason,
      JSON.stringify(exceptionReviewErrorAuditMetadata(args)),
    ],
  );

  return result.rows[0]?.id as number;
}

export async function reviewTraceabilityExceptionWithProvider(
  client: ProviderDbClient,
  request: ProviderExceptionReviewRequest,
): Promise<ProviderExceptionReviewOutcome> {
  if (!isValidIdempotencyKey(request.idempotencyKey)) {
    return {
      status: "validation_error",
      detail: "Idempotency-Key is required and must be between 8 and 200 characters.",
    };
  }

  const membership = await getActiveTenantMembership(client, {
    tenantId: request.tenantId,
    authSubjectId: request.actorAuthSubjectId,
  });

  if (!membership || !canReviewExceptions(membership.role)) {
    return { status: "forbidden" };
  }

  const now = request.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + (request.reservationTtlMs ?? DEFAULT_RESERVATION_TTL_MS),
  );
  const requestHash =
    request.requestHash ??
    computeExceptionReviewRequestHash({
      patch: request.patch,
      sourceDocumentRef: request.sourceDocumentRef ?? null,
      // The actor is part of the request identity: idempotency scope is
      // tenant/actor/action/key (design 03-02; matches lib/security/idempotency-audit.ts).
      // Without the actor, a second authorized reviewer reusing the first's key +
      // identical payload would silently replay the first result with no audit of
      // the replaying actor — undercutting the append-only audit invariant.
      actorAuthSubjectId: request.actorAuthSubjectId,
    });
  const reservation = await reserveIdempotencyRecord(client, {
    tenantId: request.tenantId,
    operation: EXCEPTION_REVIEW_OPERATION,
    resourceType: TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
    resourceId: request.exceptionId,
    idempotencyKey: request.idempotencyKey,
    requestHash,
    now,
    expiresAt,
  });

  if (reservation.status === "replayed") {
    return {
      status: "replayed",
      record: reservation.replay.body as ProviderExceptionRecord,
      auditEventId: reservation.replay.auditEventId,
      idempotencyRecordId: reservation.idempotencyRecordId,
    };
  }

  if (reservation.status === "conflict") {
    const problem = idempotencyConflictProblem({
      idempotencyKey: request.idempotencyKey,
      resourceId: request.exceptionId,
    });
    const auditEventId = await appendExceptionReviewErrorAuditEvent(client, {
      tenantId: request.tenantId,
      actorAuthSubjectId: request.actorAuthSubjectId,
      resourceId: request.exceptionId,
      source: request.source,
      idempotencyKey: request.idempotencyKey,
      status: "conflict",
      errorReason: IDEMPOTENCY_CONFLICT_REASON,
      problem,
      storedResponseBody: reservation.storedResponseBody,
    });

    return {
      status: "conflict",
      idempotencyRecordId: reservation.idempotencyRecordId,
      auditEventId,
      problem,
      storedResponseBody: reservation.storedResponseBody,
    };
  }

  if (reservation.status === "in_flight") {
    return {
      status: "in_flight",
      idempotencyRecordId: reservation.idempotencyRecordId,
      retryAfterSeconds: reservation.retryAfterSeconds,
    };
  }

  const update = await applyTenantScopedExceptionReview(client, {
    tenantId: request.tenantId,
    exceptionId: request.exceptionId,
    actorAuthSubjectId: request.actorAuthSubjectId,
    patch: request.patch,
    sourceDocumentRef: request.sourceDocumentRef,
    reviewedAt: now,
  });

  if (update.status === "not_found") {
    // The reservation was taken before the tenant-scoped load. A missing (or
    // wrong-tenant) exception must not leave a `reserved` row behind, or a later
    // legitimate retry with the same key would read in_flight until the TTL.
    await deleteIdempotencyRecord(client, {
      idempotencyRecordId: reservation.idempotencyRecordId,
    });
    return { status: "not_found" };
  }

  const auditEventId = await appendExceptionReviewAuditEvent(client, {
    tenantId: request.tenantId,
    actorAuthSubjectId: request.actorAuthSubjectId,
    resourceId: request.exceptionId,
    source: request.source,
    reason: request.patch.reviewReason,
    idempotencyKey: request.idempotencyKey,
    before: update.before,
    after: update.record,
  });

  await completeIdempotencyRecord(client, {
    idempotencyRecordId: reservation.idempotencyRecordId,
    replayStatus: 200,
    replayContentType: SUCCESS_CONTENT_TYPE,
    replayBody: update.record,
    replayHeaders: {
      "Content-Type": SUCCESS_CONTENT_TYPE,
      ...(request.replayHeaders ?? {}),
    },
    auditEventId,
    completedAt: now,
  });

  return {
    status: "accepted",
    record: update.record,
    auditEventId,
    idempotencyRecordId: reservation.idempotencyRecordId,
    idempotencyState: reservation.status,
  };
}

export async function reviewTraceabilityExceptionInTransaction(
  pool: Pool,
  request: ProviderExceptionReviewRequest,
): Promise<ProviderExceptionReviewOutcome> {
  return withProviderExceptionReviewTransaction(pool, (client) =>
    reviewTraceabilityExceptionWithProvider(client, request),
  );
}

function canReviewExceptions(role: TenantRole): boolean {
  return role === "quality_reviewer" || role === "tenant_admin";
}

function isValidIdempotencyKey(key: string): boolean {
  return (
    key.length >= IDEMPOTENCY_KEY_MIN_LENGTH &&
    key.length <= IDEMPOTENCY_KEY_MAX_LENGTH
  );
}

function toExceptionRecord(row: ExceptionRow): ProviderExceptionRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    lot_id: row.lot_id ?? undefined,
    event_id: row.event_id ?? undefined,
    message: row.message ?? undefined,
    review_reason: row.review_reason,
    human_review_required: row.human_review_required,
    review_notes: row.review_notes,
    source_document_ref: row.source_document_ref,
  };
}

function exceptionReviewAuditMetadata(args: {
  idempotencyKey: string;
  before: ProviderExceptionRecord;
  after: ProviderExceptionRecord;
}): Record<string, unknown> {
  return {
    operation: EXCEPTION_REVIEW_OPERATION,
    resource_type: TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
    status: "success",
    from_status: args.before.status,
    to_status: args.after.status,
    from_review_reason: args.before.review_reason ?? null,
    to_review_reason: args.after.review_reason ?? null,
    human_review_required: args.after.human_review_required,
    source_document_ref: args.after.source_document_ref ?? null,
    review_notes_present: Boolean(args.after.review_notes),
    idempotency_key: args.idempotencyKey,
  };
}

function exceptionReviewErrorAuditMetadata(args: {
  idempotencyKey: string;
  status: "conflict" | "error";
  errorReason: typeof IDEMPOTENCY_CONFLICT_REASON;
  problem: ProviderProblemDetails;
  storedResponseBody: ProviderExceptionRecord | null;
}): Record<string, unknown> {
  return {
    operation: EXCEPTION_REVIEW_OPERATION,
    resource_type: TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
    status: args.status,
    error_reason: args.errorReason,
    idempotency_key: args.idempotencyKey,
    problem: args.problem,
    stored_response_present: args.storedResponseBody !== null,
  };
}

function idempotencyConflictProblem(args: {
  idempotencyKey: string;
  resourceId: string;
}): ProviderProblemDetails {
  return {
    type: "about:blank",
    title: "Conflict",
    status: 409,
    detail:
      "Idempotency-Key was already used with a different request hash for this resource.",
    context: {
      operation: EXCEPTION_REVIEW_OPERATION,
      resource_type: TRACEABILITY_EXCEPTION_RESOURCE_TYPE,
      resource_id: args.resourceId,
      idempotency_key: args.idempotencyKey,
      reason: IDEMPOTENCY_CONFLICT_REASON,
    },
  };
}

function sanitizeReplayHeaders(
  headers: Record<string, string | number | undefined>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const normalized = name.toLowerCase();

    if (value === undefined || !REPLAY_HEADER_ALLOWLIST.has(normalized)) {
      continue;
    }

    sanitized[normalized] = String(value);
  }

  return sanitized;
}
