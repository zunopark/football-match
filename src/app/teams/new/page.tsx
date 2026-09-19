import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guard";
import { getOwnedTeam } from "@/lib/teams/queries";

import { createTeam } from "../actions";
import { TeamForm } from "../team-form";

export default async function NewTeamPage() {
  // 문서 2.2 — 비로그인 상태로 팀 생성을 누르면 로그인 화면으로 보낸 뒤 여기로 돌려보낸다.
  const user = await requireUser("/teams/new");

  // 문서 2.2 — 한 사람은 하나의 팀만 생성할 수 있다.
  const owned = await getOwnedTeam(user.id);
  if (owned) redirect(`/teams/${owned.id}`);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← 돌아가기
        </Link>
      </div>

      {/* 지역 검색 결과 드롭다운이 카드 밖으로 떠야 해서 Card 의 overflow-hidden 을 푼다. */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>팀 만들기</CardTitle>
          <CardDescription>
            팀을 만들면 자동으로 대표가 되고, 팀원을 초대할 수 있는 링크가 함께 발급됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamForm action={createTeam} submitLabel="팀 만들기" />
        </CardContent>
      </Card>
    </main>
  );
}
