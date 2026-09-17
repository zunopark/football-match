"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_CLASS = "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100";
const KAKAO_CLASS = "bg-[#FEE500] text-[#191600] hover:bg-[#F0D800]";

export function SocialLoginButtons() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

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
        <a href="/auth/kakao">카카오로 시작하기</a>
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
