import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/** 문서 2.1 — 소셜 로그인은 구글/카카오만 지원 */
export const socialProviderEnum = pgEnum("social_provider", ["google", "kakao"]);

/** 문서 16.2 — users.status */
export const userStatusEnum = pgEnum("user_status", ["active", "withdrawn"]);

/**
 * 문서 16.2 `users`
 * id 는 Supabase Auth 의 auth.users.id 를 그대로 사용한다.
 * (auth 스키마 참조 FK 는 drizzle 이 관리하지 않으므로 커스텀 마이그레이션에서 추가)
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  nickname: text("nickname"),
  socialProvider: socialProviderEnum("social_provider").notNull(),
  profileImageUrl: text("profile_image_url"),
  status: userStatusEnum("status").notNull().default("active"),
  /** 문서 2.1 — 이용약관 및 개인정보 수집·이용 동의 시각 */
  termsAgreedAt: timestamp("terms_agreed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

/** 문서 16.2 — teams.status */
export const teamStatusEnum = pgEnum("team_status", ["active", "inactive", "deleted"]);

/** 문서 2.3 — 대표 / 운영진 / 팀원 */
export const teamRoleEnum = pgEnum("team_role", ["owner", "manager", "member"]);

/** 문서 16.2 — team_members.status */
export const teamMemberStatusEnum = pgEnum("team_member_status", ["active", "removed"]);

/** 문서 16.2 — team_join_requests.status */
export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

/** 문서 16.2 `teams` (F-02) */
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  /** 문서 F-02-01 — 활동 지역은 시/도 + 시/군/구 단위까지만 */
  regionSido: text("region_sido").notNull(),
  regionSigungu: text("region_sigungu").notNull(),
  description: text("description"),
  /**
   * 팀 실력 레벨 1~5. 세부 기준은 추후 정의한다.
   * 문서 8.1 의 실력 수준 칩(초급/초중급/중급/중상급/상급) 5단계와 같은 눈금이다.
   */
  level: integer("level").notNull().default(3),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  status: teamStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 문서 16.2 `team_members`
 * (team_id, user_id) 조합은 유니크 — 재가입 시 새 행을 만들지 않고 기존 행을 되살린다.
 */
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("member"),
    status: teamMemberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("team_members_team_id_user_id_unique").on(table.teamId, table.userId),
    index("team_members_team_id_idx").on(table.teamId),
    index("team_members_user_id_idx").on(table.userId),
  ],
);

/** 문서 16.2 `team_join_requests` (F-03) */
export const teamJoinRequests = pgTable(
  "team_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message"),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("team_join_requests_team_id_status_idx").on(table.teamId, table.status)],
);

/** 문서 16.2 `team_join_links` — 외부 공유용 가입 신청 URL */
export const teamJoinLinks = pgTable(
  "team_join_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("team_join_links_team_id_idx").on(table.teamId)],
);

export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;
export type TeamRole = (typeof teamRoleEnum.enumValues)[number];
