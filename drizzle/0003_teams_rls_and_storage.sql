-- 문서 2.2 "한 사람은 하나의 팀만 생성 가능" — 대표(owner) 멤버십은 사용자당 최대 1건.
-- 위임(F-03-06)으로 대표에서 내려오거나 팀이 삭제되면(팀원 일괄 removed) 자동으로 해제된다.
CREATE UNIQUE INDEX "team_members_one_active_owner_per_user"
  ON "team_members" ("user_id")
  WHERE "role" = 'owner' AND "status" = 'active';
--> statement-breakpoint

-- 한 팀의 대표도 1명이어야 한다. 위임(F-03-06)은 기존 대표를 먼저 내린 뒤 대상을 올린다.
CREATE UNIQUE INDEX "team_members_one_active_owner_per_team"
  ON "team_members" ("team_id")
  WHERE "role" = 'owner' AND "status" = 'active';
--> statement-breakpoint

-- 문서 16.1: 모든 테이블에 updated_at 유지 (set_updated_at 은 0001 에서 생성)
CREATE TRIGGER "teams_set_updated_at"
  BEFORE UPDATE ON "teams"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint

CREATE TRIGGER "team_members_set_updated_at"
  BEFORE UPDATE ON "team_members"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint

CREATE TRIGGER "team_join_requests_set_updated_at"
  BEFORE UPDATE ON "team_join_requests"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint

CREATE TRIGGER "team_join_links_set_updated_at"
  BEFORE UPDATE ON "team_join_links"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint

-- 모든 쓰기는 서버(Drizzle/서비스 키)를 거친다. 아래 정책은 anon/authenticated 키로
-- PostgREST 를 직접 호출하는 경우에 대한 방어선이며, 읽기만 허용한다.
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_join_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "team_join_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- 팀 프로필은 공유 URL 로 비로그인 조회가 가능해야 한다 (Phase 2 확인 체크리스트).
CREATE POLICY "teams_select_not_deleted" ON "teams"
  FOR SELECT TO anon, authenticated
  USING ("status" <> 'deleted');
--> statement-breakpoint

CREATE POLICY "team_members_select_authenticated" ON "team_members"
  FOR SELECT TO authenticated
  USING ("status" = 'active');
--> statement-breakpoint

-- 가입 신청 내역은 신청 당사자만. 팀 관리자용 조회는 서버에서만 수행한다.
CREATE POLICY "team_join_requests_select_own" ON "team_join_requests"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = "user_id");
--> statement-breakpoint

-- team_join_links 는 정책 없음 = 클라이언트 키로 토큰을 열람할 수 없다.

-- 문서 F-02-01 팀 로고 저장소. 로고는 팀 프로필과 함께 공개되므로 public 버킷을 쓴다.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
  'team-logos',
  'team-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- 업로드/삭제는 서버 액션이 서비스 키로 수행하므로(RLS 우회) 읽기 정책만 둔다.
DROP POLICY IF EXISTS "team_logos_public_read" ON "storage"."objects";
--> statement-breakpoint

CREATE POLICY "team_logos_public_read" ON "storage"."objects"
  FOR SELECT TO anon, authenticated
  USING ("bucket_id" = 'team-logos');
