import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";

const PROVIDER_LABEL = { google: "구글", kakao: "카카오" } as const;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOnboarded(user)) redirect("/onboarding");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{user.nickname}님, 반갑습니다</CardTitle>
          <CardDescription>Phase 1 — 프로젝트 기반 &amp; 인증</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">사용자 ID</dt>
            <dd className="break-all font-mono text-xs">{user.id}</dd>
            <dt className="text-muted-foreground">로그인 수단</dt>
            <dd>{PROVIDER_LABEL[user.socialProvider]}</dd>
            <dt className="text-muted-foreground">상태</dt>
            <dd>{user.status}</dd>
            <dt className="text-muted-foreground">가입 일시</dt>
            <dd>{user.createdAt.toLocaleString("ko-KR")}</dd>
          </dl>

          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
