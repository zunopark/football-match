import {
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

/** 문서 F-04-01 — 매칭 구함 / 매칭 안 구함 */
export const matchStatusEnum = pgEnum("match_condition_status", ["seeking", "not_seeking"]);

/** 문서 16.3 — cost_type (무료 / 구장비분담 / 상대부담 / 협의 / 기타) */
export const costTypeEnum = pgEnum("cost_type", [
  "free",
  "split",
  "opponent",
  "negotiable",
  "other",
]);

/**
 * 문서 16.3 `match_conditions` (F-04)
 *
 * ERD 는 "팀당 활성 조건 1건" 을 열어 뒀지만, 8.1 의 날짜 탭이 2주치를 보여주므로
 * 한 팀이 여러 날짜를 올릴 수 있게 한다. 대신 같은 날짜에 두 건을 올리지는 못한다.
 */
export const matchConditions = pgTable(
  "match_conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    status: matchStatusEnum("status").notNull().default("seeking"),
    desiredDate: date("desired_date").notNull(),
    desiredTime: time("desired_time").notNull(),
    /** 경기가 실제로 열리는 장소 (F-04-02) */
    locationText: text("location_text").notNull(),
    /**
     * location_text 를 카카오 로컬 API 로 지오코딩한 좌표 (7.1 GPS 반경 추천용).
     * 지오코딩에 실패해도 조건 등록은 막지 않는다 — 좌표가 없으면
     * F-05-02 의 "활동 지역(시/군) 일치" 조건으로만 노출된다.
     */
    locationLat: doublePrecision("location_lat"),
    locationLng: doublePrecision("location_lng"),
    /** 원하는 상대 팀 레벨 범위 (teams.level 1~5 기준) */
    opponentLevelMin: integer("opponent_level_min").notNull().default(1),
    opponentLevelMax: integer("opponent_level_max").notNull().default(5),
    costType: costTypeEnum("cost_type").notNull().default("negotiable"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("match_conditions_team_id_desired_date_unique").on(table.teamId, table.desiredDate),
    index("match_conditions_desired_date_status_idx").on(table.desiredDate, table.status),
    index("match_conditions_team_id_idx").on(table.teamId),
  ],
);

export type MatchCondition = typeof matchConditions.$inferSelect;
export type CostType = (typeof costTypeEnum.enumValues)[number];
