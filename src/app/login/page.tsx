import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeNext } from "@/lib/auth/redirect";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";

import { SocialLoginButtons } from "./social-login-buttons";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const safeNext = sanitizeNext(typeof next === "string" ? next : null);

  const user = await getCurrentUser();
  if (user) redirect(isOnboarded(user) ? (safeNext ?? "/") : "/onboarding");

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
          <SocialLoginButtons next={safeNext} />
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
