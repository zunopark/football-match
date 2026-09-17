"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { completeOnboarding, type OnboardingState } from "./actions";

const INITIAL_STATE: OnboardingState = { error: null };

export function OnboardingForm({ defaultNickname }: { defaultNickname: string }) {
  const [state, formAction, pending] = useActionState(completeOnboarding, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={defaultNickname}
          maxLength={12}
          placeholder="2~12자"
          required
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="terms" name="terms" className="mt-0.5" required />
        <div className="flex flex-col gap-1">
          <Label htmlFor="terms" className="font-normal leading-snug">
            이용약관 및 개인정보 수집·이용에 동의합니다. (필수)
          </Label>
          <p className="text-xs text-muted-foreground">
            <Link href="/terms" target="_blank" className="underline underline-offset-2">
              이용약관
            </Link>
            {" · "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-2">
              개인정보 처리방침
            </Link>
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "시작하기"}
      </Button>
    </form>
  );
}
