import { NextResponse } from "next/server";

import { consumePostLoginRedirect } from "@/lib/auth/guard";
import { isOnboarded, syncUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

function loginWithError(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) return loginWithError(origin, oauthError);

  const code = searchParams.get("code");
  if (!code) return loginWithError(origin, "인증 코드를 받지 못했습니다.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return loginWithError(origin, error?.message ?? "로그인에 실패했습니다.");
  }

  const user = await syncUser(data.user);
  const next = await consumePostLoginRedirect();

  // 문서 2.1 — 최초 로그인 시 최소 회원정보 입력 화면으로 보낸다.
  if (!isOnboarded(user)) return NextResponse.redirect(`${origin}/onboarding`);
  return NextResponse.redirect(`${origin}${next ?? "/"}`);
}
