"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error: string | null };

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const nickname = String(formData.get("nickname") ?? "").trim();
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return { error: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해주세요.` };
  }

  // 문서 2.1 — 이용약관 및 개인정보 수집·이용 동의는 필수
  if (formData.get("terms") !== "on") {
    return { error: "이용약관 및 개인정보 수집·이용에 동의해주세요." };
  }

  await db
    .update(users)
    .set({ nickname, termsAgreedAt: new Date() })
    .where(eq(users.id, authUser.id));

  redirect("/");
}
