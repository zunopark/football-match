"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "kakao";

const PROVIDERS: { id: Provider; label: string; className: string }[] = [
  {
    id: "google",
    label: "구글로 시작하기",
    className: "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100",
  },
  {
    id: "kakao",
    label: "카카오로 시작하기",
    className: "bg-[#FEE500] text-[#191600] hover:bg-[#F0D800]",
  },
];

export function SocialLoginButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map(({ id, label, className }) => (
        <Button
          key={id}
          type="button"
          size="lg"
          disabled={pending !== null}
          onClick={() => signIn(id)}
          className={className}
        >
          {pending === id ? "이동 중…" : label}
        </Button>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
