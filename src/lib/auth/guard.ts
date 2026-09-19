import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginUrl, POST_LOGIN_REDIRECT_COOKIE, sanitizeNext } from "@/lib/auth/redirect";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";
import type { User } from "@/lib/db/schema";

/** 로그인(+회원정보 입력)을 마친 사용자를 반환하고, 아니면 로그인 화면으로 보낸다. */
export async function requireUser(next?: string | null): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(next));
  if (!isOnboarded(user)) redirect("/onboarding");
  return user;
}

/** 로그인 직후 돌아갈 경로를 꺼내면서 쿠키를 비운다. (OAuth 콜백 라우트 전용) */
export async function consumePostLoginRedirect(): Promise<string | null> {
  const cookieStore = await cookies();
  const next = sanitizeNext(cookieStore.get(POST_LOGIN_REDIRECT_COOKIE)?.value);
  cookieStore.delete(POST_LOGIN_REDIRECT_COOKIE);
  return next;
}
