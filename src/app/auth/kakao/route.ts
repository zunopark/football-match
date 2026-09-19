import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { POST_LOGIN_REDIRECT_COOKIE, sanitizeNext } from "@/lib/auth/redirect";
import { buildAuthorizeUrl, KAKAO_STATE_COOKIE } from "@/lib/auth/kakao";

/** 카카오 인가 요청 시작 */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const state = randomUUID();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildAuthorizeUrl(`${origin}/auth/kakao/callback`, state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "카카오 로그인을 시작할 수 없습니다.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(KAKAO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  // 문서 2.2 — 액션 도중 로그인으로 밀려난 경우 로그인 후 원래 화면으로 돌려보낸다.
  const next = sanitizeNext(searchParams.get("next"));
  if (next) {
    response.cookies.set(POST_LOGIN_REDIRECT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
