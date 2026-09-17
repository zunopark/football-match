import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";

import { SocialLoginButtons } from "./social-login-buttons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(isOnboarded(user) ? "/" : "/onboarding");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>
            11인제 축구 경기 상대 매칭 플랫폼입니다. 소셜 계정으로 시작하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SocialLoginButtons />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
