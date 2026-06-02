import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const jsonbObjectDefault = sql`'{}'::jsonb`;
const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    tenantId: text("tenant_id").notNull(),
    authSubjectId: text("auth_subject_id").notNull(),
    role: text("role").notNull(),
    createdAt: now(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => [
    unique("tenant_memberships_tenant_subject_unique").on(
      table.tenantId,
      table.authSubjectId,
    ),
    index("tenant_memberships_tenant_role_idx").on(table.tenantId, table.role),
    check(
      "tenant_memberships_role_check",
      sql`${table.role} in ('tenant_admin', 'quality_reviewer', 'read_only')`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    tenantId: text("tenant_id").notNull(),
    actorAuthSubjectId: text("actor_auth_subject_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    source: text("source").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(jsonbObjectDefault),
    createdAt: now(),
  },
  (table) => [
    index("audit_events_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("audit_events_resource_idx").on(
      table.tenantId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const traceabilityExceptions = pgTable(
  "traceability_exceptions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    lotId: text("lot_id"),
    eventId: text("event_id"),
    message: text("message"),
    reviewReason: text("review_reason"),
    humanReviewRequired: boolean("human_review_required").notNull().default(true),
    reviewNotes: text("review_notes"),
    sourceDocumentRef: text("source_document_ref"),
    reviewedByAuthSubjectId: text("reviewed_by_auth_subject_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: now(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("traceability_exceptions_tenant_status_idx").on(
      table.tenantId,
      table.status,
    ),
    index("traceability_exceptions_review_reason_idx").on(
      table.tenantId,
      table.reviewReason,
    ),
    check(
      "traceability_exceptions_type_check",
      sql`${table.type} in ('missing_kde', 'ambiguous_lot_code', 'bol_invoice_mismatch', 'missing_supplier_document', 'missing_shipping_linkage', 'human_review_required')`,
    ),
    check(
      "traceability_exceptions_status_check",
      sql`${table.status} in ('open', 'in_review', 'resolved', 'deferred')`,
    ),
    check(
      "traceability_exceptions_review_reason_check",
      sql`${table.reviewReason} is null or ${table.reviewReason} in ('ambiguous_exemption', 'kill_step_review', 'imported_food_review', 'partial_exemption_review', 'ambiguous_lot_code', 'other')`,
    ),
  ],
);

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    tenantId: text("tenant_id").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
    replayStatus: integer("replay_status"),
    replayContentType: text("replay_content_type"),
    replayBody: jsonb("replay_body").$type<Record<string, unknown>>(),
    replayHeaders: jsonb("replay_headers")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(jsonbObjectDefault),
    auditEventId: bigint("audit_event_id", { mode: "number" }).references(
      () => auditEvents.id,
    ),
    createdAt: now(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("idempotency_records_tenant_operation_key_unique").on(
      table.tenantId,
      table.operation,
      table.idempotencyKey,
    ),
    index("idempotency_records_tenant_lifecycle_idx").on(
      table.tenantId,
      table.operation,
      table.lifecycleStatus,
    ),
    index("idempotency_records_expires_idx").on(table.expiresAt),
    check(
      "idempotency_records_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('reserved', 'completed', 'failed', 'expired')`,
    ),
  ],
);
