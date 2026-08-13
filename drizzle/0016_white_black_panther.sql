CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."sourcing_quality" AS ENUM('premium', 'standard', 'budget');--> statement-breakpoint
CREATE TYPE "public"."sourcing_status" AS ENUM('new', 'payment_pending', 'paid', 'sourcing', 'quoted', 'approved', 'ordered', 'completed');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"visitor_id" text,
	"session_id" text,
	"path" text,
	"referrer" text,
	"country" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_profile_id" uuid,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"seo_title" text,
	"meta_description" text,
	"category" text,
	"featured_image_url" text,
	"video_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "image_search_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"source_path" text,
	"visitor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_search_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "sourcing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"image_search_request_id" uuid,
	"status" "sourcing_status" DEFAULT 'payment_pending' NOT NULL,
	"product_name" text NOT NULL,
	"product_link" text,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"quality_preference" "sourcing_quality" DEFAULT 'standard' NOT NULL,
	"target_budget" numeric(14, 2),
	"target_budget_currency" text DEFAULT 'USD' NOT NULL,
	"destination_country" text NOT NULL,
	"destination_city" text,
	"destination_port" text,
	"private_labeling" boolean DEFAULT false NOT NULL,
	"brand_name" text,
	"special_requirements" text,
	"client_name" text NOT NULL,
	"business_name" text,
	"whatsapp" text NOT NULL,
	"email" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"activation_fee" numeric(10, 2) DEFAULT '100' NOT NULL,
	"activation_currency" text DEFAULT 'USD' NOT NULL,
	"payment_provider" text DEFAULT 'flutterwave' NOT NULL,
	"payment_reference" text NOT NULL,
	"payment_transaction_id" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sourcing_requests_reference_unique" UNIQUE("reference"),
	CONSTRAINT "sourcing_requests_payment_reference_unique" UNIQUE("payment_reference")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sourcing_requests" ADD CONSTRAINT "sourcing_requests_image_search_request_id_image_search_requests_id_fk" FOREIGN KEY ("image_search_request_id") REFERENCES "public"."image_search_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_event_idx" ON "analytics_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "analytics_events_created_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_visitor_idx" ON "analytics_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "image_search_requests_created_idx" ON "image_search_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sourcing_requests_status_idx" ON "sourcing_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sourcing_requests_email_idx" ON "sourcing_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "sourcing_requests_created_idx" ON "sourcing_requests" USING btree ("created_at");--> statement-breakpoint

-- Public forms are handled by trusted server actions. Direct browser access is
-- intentionally denied; service-role and the database owner can still operate.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.image_search_requests ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.sourcing_requests ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Private media buckets. Downloads are signed server-side for authorized admins.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('sourcing-attachments', 'sourcing-attachments', false, 26214400,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('blog-media', 'blog-media', true, 26214400,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
