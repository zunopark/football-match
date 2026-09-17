import type { User as AuthUser } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

/** 문서 2.1 — 구글/카카오 외의 소셜 로그인은 지원하지 않는다. */
function resolveProvider(authUser: AuthUser): "google" | "kakao" {
  const provider = authUser.app_metadata?.provider;
  if (provider === "google" || provider === "kakao") return provider;
  throw new Error(`지원하지 않는 소셜 로그인입니다: ${provider ?? "unknown"}`);
}

function resolveProfileImageUrl(authUser: AuthUser): string | null {
  const metadata = authUser.user_metadata ?? {};
  return metadata.avatar_url ?? metadata.picture ?? null;
}

/** 로그인 시 Supabase Auth 사용자를 users 테이블에 동기화한다(최초 로그인이면 생성). */
export async function syncUser(authUser: AuthUser): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      id: authUser.id,
      socialProvider: resolveProvider(authUser),
      profileImageUrl: resolveProfileImageUrl(authUser),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { profileImageUrl: resolveProfileImageUrl(authUser) },
    })
    .returning();

  return row;
}

/** 현재 세션의 users 레코드. 비로그인이거나 아직 동기화 전이면 null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [row] = await db.select().from(users).where(eq(users.id, authUser.id));
  return row ?? null;
}

/** 문서 2.1 — 최초 로그인 시 최소 회원정보 입력 및 약관 동의가 끝났는지 여부 */
export function isOnboarded(user: User): boolean {
  return Boolean(user.nickname && user.termsAgreedAt);
}
