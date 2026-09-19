import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ErrorBanner } from "@/components/error-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guard";
import { getTeamConditions } from "@/lib/matching/queries";
import { canManageTeamProfile } from "@/lib/teams/permissions";
import { getMembership, getTeam } from "@/lib/teams/queries";

import { ConditionList, type ConditionRow } from "./condition-list";

/** 문서 F-04 — 매칭 상태 및 조건 설정. 대표 또는 운영진만 접근한다. */
export default async function TeamMatchingPage({
  params,
  searchParams,
}: PageProps<"/teams/[id]/matching">) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await requireUser(`/teams/${id}/matching`);
  const team = await getTeam(id);
  if (!team) notFound();

  const membership = await getMembership(id, user.id);
  if (!membership || !canManageTeamProfile(membership.role)) redirect(`/teams/${id}`);

  const rows = await getTeamConditions(id);
  const conditions: ConditionRow[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    desiredDate: row.desiredDate,
    desiredTime: row.desiredTime,
    locationText: row.locationText,
    hasCoords: row.locationLat !== null,
    opponentLevelMin: row.opponentLevelMin,
    opponentLevelMax: row.opponentLevelMax,
    costType: row.costType,
    notes: row.notes,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <Link href={`/teams/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {team.name}
        </Link>
      </div>

      <ErrorBanner message={typeof error === "string" ? error : undefined} />

      <Card>
        <CardHeader>
          <CardTitle>매칭 구하기</CardTitle>
          <CardDescription>
            경기 희망 날짜별로 조건을 올리면 메인 화면의 해당 날짜 탭에 우리 팀이 노출됩니다.
            한 날짜에 한 건씩 올릴 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConditionList teamId={id} conditions={conditions} />
        </CardContent>
      </Card>
    </main>
  );
}
