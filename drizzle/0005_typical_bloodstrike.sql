ALTER TABLE "application_files" DROP CONSTRAINT "application_files_kind_valid";--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "social_media_consent" boolean;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "gift_price_cap" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_kind_valid" CHECK (kind in ('idp_certificate', 'letter_photo', 'child_with_letter_photo', 'confirmation', 'attachment'));