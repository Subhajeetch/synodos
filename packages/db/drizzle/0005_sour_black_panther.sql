CREATE TYPE "public"."document_version_kind" AS ENUM('auto', 'named', 'restore', 'pre_restore');--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "kind" "document_version_kind" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "content_hash" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "restored_from_version_id" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "contributors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "document_versions" SET "content_hash" = md5(encode("state", 'base64')), "size_bytes" = octet_length("state");--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "content_hash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "size_bytes" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "document_versions_cursor_idx" ON "document_versions" USING btree ("document_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "document_versions_hash_idx" ON "document_versions" USING btree ("document_id","content_hash","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "document_versions_restored_from_idx" ON "document_versions" USING btree ("restored_from_version_id");