"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { POST_LOGIN_REDIRECT_COOKIE } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_CLASS = "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100";
const KAKAO_CLASS = "bg-[#FEE500] text-[#191600] hover:bg-[#F0D800]";

export function SocialLoginButtons({ next }: { next: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    // 구글은 Supabase 가 redirectTo 를 등록된 URL 과 정확히 대조하므로 쿼리스트링을 붙일 수 없다.
    // 대신 돌아갈 경로를 쿠키에 남겨 /auth/callback 이 읽게 한다. (값은 같은 출처 경로뿐)
    if (next) {
      document.cookie = `${POST_LOGIN_REDIRECT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        className={GOOGLE_CLASS}
        disabled={pending}
        onClick={signInWithGoogle}
      >
        {pending ? "이동 중…" : "구글로 시작하기"}
      </Button>

      {/*
        카카오는 Supabase 기본 플로우가 account_email scope 를 강제해 KOE205 가 발생하므로
        서버 라우트에서 직접 인가 요청을 시작한다. (src/lib/auth/kakao.ts)
        Route Handler 는 클라이언트 라우터로 이동할 수 없어 일반 링크로 둔다.
      */}
      <Button asChild size="lg" className={KAKAO_CLASS}>
        <a href={next ? `/auth/kakao?next=${encodeURIComponent(next)}` : "/auth/kakao"}>
          카카오로 시작하기
        </a>
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
