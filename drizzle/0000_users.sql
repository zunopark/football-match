CREATE TYPE "public"."social_provider" AS ENUM('google', 'kakao');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'withdrawn');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nickname" text,
	"social_provider" "social_provider" NOT NULL,
	"profile_image_url" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"terms_agreed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
