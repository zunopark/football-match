import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { SITE } from "@/lib/site";

/** 메인 탐색 화면과 내 팀 사이를 오갈 최소한의 내비게이션. 알림(F-15)은 Phase 9 에서 붙인다. */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="font-heading text-base">
          {SITE.name}
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">경기 찾기</Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/my">내 팀</Link>
              </Button>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
