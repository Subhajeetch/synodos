ALTER TABLE "document_versions" ADD COLUMN "operation_id" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_operation_id_unique" UNIQUE("operation_id");