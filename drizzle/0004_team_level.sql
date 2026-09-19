ALTER TABLE "teams" ADD COLUMN "level" integer DEFAULT 3 NOT NULL;--> statement-breakpoint

-- 레벨은 1~5 만 허용한다. (세부 기준은 추후 정의)
ALTER TABLE "teams"
  ADD CONSTRAINT "teams_level_range" CHECK ("level" BETWEEN 1 AND 5);
--> statement-breakpoint

-- 팀명은 중복될 수 없다. 대소문자만 다른 이름도 같은 이름으로 본다.
-- 삭제된 팀의 이름은 다시 쓸 수 있어야 하므로 부분 인덱스로 둔다.
CREATE UNIQUE INDEX "teams_name_unique_not_deleted"
  ON "teams" (lower("name"))
  WHERE "status" <> 'deleted';
