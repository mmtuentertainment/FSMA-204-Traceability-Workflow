ALTER TABLE "idempotency_records" DROP CONSTRAINT "idempotency_records_tenant_operation_key_unique";--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "resource_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD COLUMN "resource_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_operation_resource_key_unique" UNIQUE("tenant_id","operation","resource_type","resource_id","idempotency_key");