ALTER TABLE "application_files" DROP CONSTRAINT "application_files_kind_valid";--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "contact" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "contact_method" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "gift_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "social_media_consent" boolean;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "gift_price_cap" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_kind_valid" CHECK (kind in ('idp_certificate', 'letter_photo', 'child_with_letter_photo', 'confirmation', 'attachment'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_contact_method_valid" CHECK (contact_method is null or contact_method in ('telegram', 'phone'));