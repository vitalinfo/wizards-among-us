CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "application_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_files_kind_valid" CHECK (kind in ('attachment', 'confirmation'))
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"parent_name" text,
	"child_name" text,
	"child_age" integer,
	"home_town" text,
	"home_region" text,
	"current_town" text,
	"current_region" text,
	"family_story" text,
	"gift_description" text,
	"gift_price" numeric(10, 2),
	"delivery_information" text,
	"type_fields" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"rejection_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_status_valid" CHECK (status in ('draft', 'submitted', 'approved', 'rejected', 'claimed', 'fulfilled')),
	CONSTRAINT "applications_home_region_valid" CHECK (home_region is null or home_region in ('cherkasy', 'chernihiv', 'chernivtsi', 'dnipropetrovsk', 'donetsk', 'ivano_frankivsk', 'kharkiv', 'kherson', 'khmelnytskyi', 'kirovohrad', 'kyiv', 'luhansk', 'lviv', 'mykolaiv', 'odesa', 'poltava', 'rivne', 'sumy', 'ternopil', 'vinnytsia', 'volyn', 'zakarpattia', 'zaporizhzhia', 'zhytomyr', 'crimea')),
	CONSTRAINT "applications_current_region_valid" CHECK (current_region is null or current_region in ('cherkasy', 'chernihiv', 'chernivtsi', 'dnipropetrovsk', 'donetsk', 'ivano_frankivsk', 'kharkiv', 'kherson', 'khmelnytskyi', 'kirovohrad', 'kyiv', 'luhansk', 'lviv', 'mykolaiv', 'odesa', 'poltava', 'rivne', 'sumy', 'ternopil', 'vinnytsia', 'volyn', 'zakarpattia', 'zaporizhzhia', 'zhytomyr', 'crimea'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_actor_type_valid" CHECK (actor_type in ('user', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"accepting_applications" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_type_valid" CHECK (type in ('new_school_year', 'saint_nicholas_day')),
	CONSTRAINT "campaigns_status_valid" CHECK (status in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_application_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_provider_uid_unique" UNIQUE("provider","provider_user_id"),
	CONSTRAINT "identities_provider_valid" CHECK (provider in ('telegram'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"application_id" uuid,
	"volunteer_id" uuid,
	"rating" integer,
	"body" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text[] DEFAULT '{}'::text[] NOT NULL,
	"username" text,
	"phone" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_valid" CHECK ("users"."role" <@ ARRAY['parent','volunteer']::text[])
);
--> statement-breakpoint
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_files_application_idx" ON "application_files" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_campaign_status_idx" ON "applications" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "applications_parent_idx" ON "applications" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_one_active" ON "campaigns" USING btree ("status") WHERE "campaigns"."status" = 'active';