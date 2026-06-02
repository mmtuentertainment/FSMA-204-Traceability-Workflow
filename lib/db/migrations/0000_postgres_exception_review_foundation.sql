CREATE TABLE "audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text NOT NULL,
	"actor_auth_subject_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"source" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
COMMENT ON TABLE "audit_events" IS 'Append-only audit evidence foundation; initial repository work must not add update or delete paths.';
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "idempotency_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"lifecycle_status" text NOT NULL,
	"replay_status" integer,
	"replay_content_type" text,
	"replay_body" jsonb,
	"replay_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audit_event_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_records_tenant_operation_key_unique" UNIQUE("tenant_id","operation","idempotency_key"),
	CONSTRAINT "idempotency_records_lifecycle_status_check" CHECK ("idempotency_records"."lifecycle_status" in ('reserved', 'completed', 'failed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenant_memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text NOT NULL,
	"auth_subject_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "tenant_memberships_tenant_subject_unique" UNIQUE("tenant_id","auth_subject_id"),
	CONSTRAINT "tenant_memberships_role_check" CHECK ("tenant_memberships"."role" in ('tenant_admin', 'quality_reviewer', 'read_only'))
);
--> statement-breakpoint
CREATE TABLE "traceability_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"lot_id" text,
	"event_id" text,
	"message" text,
	"review_reason" text,
	"human_review_required" boolean DEFAULT true NOT NULL,
	"review_notes" text,
	"source_document_ref" text,
	"reviewed_by_auth_subject_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traceability_exceptions_type_check" CHECK ("traceability_exceptions"."type" in ('missing_kde', 'ambiguous_lot_code', 'bol_invoice_mismatch', 'missing_supplier_document', 'missing_shipping_linkage', 'human_review_required')),
	CONSTRAINT "traceability_exceptions_status_check" CHECK ("traceability_exceptions"."status" in ('open', 'in_review', 'resolved', 'deferred')),
	CONSTRAINT "traceability_exceptions_review_reason_check" CHECK ("traceability_exceptions"."review_reason" is null or "traceability_exceptions"."review_reason" in ('ambiguous_exemption', 'kill_step_review', 'imported_food_review', 'partial_exemption_review', 'ambiguous_lot_code', 'other'))
);
--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_audit_event_id_audit_events_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_tenant_created_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_resource_idx" ON "audit_events" USING btree ("tenant_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idempotency_records_tenant_lifecycle_idx" ON "idempotency_records" USING btree ("tenant_id","operation","lifecycle_status");--> statement-breakpoint
CREATE INDEX "idempotency_records_expires_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tenant_memberships_tenant_role_idx" ON "tenant_memberships" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE INDEX "traceability_exceptions_tenant_status_idx" ON "traceability_exceptions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "traceability_exceptions_review_reason_idx" ON "traceability_exceptions" USING btree ("tenant_id","review_reason");
