ALTER TABLE "applications" ADD COLUMN "child_gender" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_child_gender_valid" CHECK (child_gender is null or child_gender in ('boy', 'girl'));
