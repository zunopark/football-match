import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
