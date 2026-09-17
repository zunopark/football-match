import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isOnboarded(user)) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>회원정보 입력</CardTitle>
          <CardDescription>서비스 이용을 위해 최소 정보만 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultNickname={user.nickname ?? ""} />
        </CardContent>
      </Card>
    </main>
  );
}
