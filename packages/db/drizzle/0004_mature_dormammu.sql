ALTER TYPE "public"."notification_type" ADD VALUE 'document_deleted' BEFORE 'document_invitation_accepted';--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_document_id_documents_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;