import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeCodeForTokens, KAKAO_STATE_COOKIE } from "@/lib/auth/kakao";
import { isOnboarded, syncUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

function loginWithError(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const kakaoError = searchParams.get("error_description") ?? searchParams.get("error");
  if (kakaoError) return loginWithError(origin, kakaoError);

  const code = searchParams.get("code");
  if (!code) return loginWithError(origin, "인증 코드를 받지 못했습니다.");

  // CSRF 방지 — 인가 요청 시 발급한 state 와 일치해야 한다.
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(KAKAO_STATE_COOKIE)?.value;
  cookieStore.delete(KAKAO_STATE_COOKIE);
  if (!expectedState || expectedState !== searchParams.get("state")) {
    return loginWithError(origin, "로그인 요청이 만료되었습니다. 다시 시도해주세요.");
  }

  try {
    const { idToken, accessToken } = await exchangeCodeForTokens(
      code,
      `${origin}/auth/kakao/callback`,
    );

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "kakao",
      token: idToken,
      access_token: accessToken,
    });
    if (error || !data.user) {
      return loginWithError(origin, error?.message ?? "로그인에 실패했습니다.");
    }

    const user = await syncUser(data.user);
    return NextResponse.redirect(isOnboarded(user) ? `${origin}/` : `${origin}/onboarding`);
  } catch (error) {
    return loginWithError(origin, error instanceof Error ? error.message : "로그인에 실패했습니다.");
  }
}
