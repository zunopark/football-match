CREATE TYPE "public"."cost_type" AS ENUM('free', 'split', 'opponent', 'negotiable', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_condition_status" AS ENUM('seeking', 'not_seeking');--> statement-breakpoint
CREATE TABLE "match_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"status" "match_condition_status" DEFAULT 'seeking' NOT NULL,
	"desired_date" date NOT NULL,
	"desired_time" time NOT NULL,
	"location_text" text NOT NULL,
	"location_lat" double precision,
	"location_lng" double precision,
	"opponent_level_min" integer DEFAULT 1 NOT NULL,
	"opponent_level_max" integer DEFAULT 5 NOT NULL,
	"cost_type" "cost_type" DEFAULT 'negotiable' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_conditions_team_id_desired_date_unique" UNIQUE("team_id","desired_date")
);
--> statement-breakpoint
ALTER TABLE "match_conditions" ADD CONSTRAINT "match_conditions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_conditions_desired_date_status_idx" ON "match_conditions" USING btree ("desired_date","status");--> statement-breakpoint
CREATE INDEX "match_conditions_team_id_idx" ON "match_conditions" USING btree ("team_id");--> statement-breakpoint

-- 상대 희망 레벨은 1~5 이고 min <= max 여야 한다.
ALTER TABLE "match_conditions"
  ADD CONSTRAINT "match_conditions_opponent_level_range" CHECK (
    "opponent_level_min" BETWEEN 1 AND 5
    AND "opponent_level_max" BETWEEN 1 AND 5
    AND "opponent_level_min" <= "opponent_level_max"
  );
--> statement-breakpoint

-- 좌표는 둘 다 있거나 둘 다 없어야 한다 (지오코딩 실패 시 NULL).
ALTER TABLE "match_conditions"
  ADD CONSTRAINT "match_conditions_location_coords" CHECK (
    ("location_lat" IS NULL) = ("location_lng" IS NULL)
  );
--> statement-breakpoint

CREATE TRIGGER "match_conditions_set_updated_at"
  BEFORE UPDATE ON "match_conditions"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint

-- 메인 탐색 화면은 비로그인도 열 수 있어야 하므로 공개 읽기만 허용한다.
-- 쓰기는 전부 서버(Drizzle)를 거친다.
ALTER TABLE "match_conditions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "match_conditions_select_seeking" ON "match_conditions"
  FOR SELECT TO anon, authenticated
  USING ("status" = 'seeking');
