-- 문서 16.1: users.id 는 auth.users.id 를 그대로 참조한다.
ALTER TABLE "users"
  ADD CONSTRAINT "users_id_auth_users_id_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- 본인 레코드만 조회/수정 가능. 레코드 생성은 서버(서비스 키/DB 접속)에서만 수행한다.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "users_select_own" ON "users"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = "id");
--> statement-breakpoint

CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = "id")
  WITH CHECK ((SELECT auth.uid()) = "id");
--> statement-breakpoint

-- 문서 16.1: 모든 테이블에 updated_at 유지
CREATE OR REPLACE FUNCTION "set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER "users_set_updated_at"
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
