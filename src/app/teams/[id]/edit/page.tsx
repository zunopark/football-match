import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guard";
import { canManageTeamProfile } from "@/lib/teams/permissions";
import { getMembership, getTeam } from "@/lib/teams/queries";

import { updateTeam } from "../../actions";
import { TeamForm } from "../../team-form";

/** 문서 F-02-03 팀 정보 수정 — 대표 또는 운영진 */
export default async function EditTeamPage({ params }: PageProps<"/teams/[id]/edit">) {
  const { id } = await params;

  const user = await requireUser(`/teams/${id}/edit`);
  const team = await getTeam(id);
  if (!team) notFound();

  const membership = await getMembership(id, user.id);
  if (!membership || !canManageTeamProfile(membership.role)) redirect(`/teams/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <Link href={`/teams/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {team.name}
        </Link>
      </div>

      {/* 지역 검색 결과 드롭다운이 카드 밖으로 떠야 해서 Card 의 overflow-hidden 을 푼다. */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>팀 정보 수정</CardTitle>
          <CardDescription>팀명, 로고, 활동 지역, 소개를 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamForm
            action={updateTeam}
            submitLabel="저장"
            defaults={{
              id: team.id,
              name: team.name,
              regionSido: team.regionSido,
              regionSigungu: team.regionSigungu,
              description: team.description ?? "",
              level: team.level,
              logoUrl: team.logoUrl,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
