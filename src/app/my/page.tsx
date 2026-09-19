import Link from "next/link";
import { redirect } from "next/navigation";

import { ErrorBanner } from "@/components/error-banner";
import { TeamLogo } from "@/components/team-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, isOnboarded } from "@/lib/auth/user";
import { formatRegion } from "@/lib/regions";
import { formatLevel } from "@/lib/teams/level";
import { ROLE_LABEL } from "@/lib/teams/permissions";
import { getMyPendingRequests, getMyTeams, getOwnedTeam } from "@/lib/teams/queries";

export default async function MyPage({ searchParams }: PageProps<"/my">) {
  const { error } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmy");
  if (!isOnboarded(user)) redirect("/onboarding");

  // 문서 2.4 — 한 사용자는 여러 팀에 소속될 수 있고, 팀마다 역할이 다르다.
  const [myTeams, pendingRequests, ownedTeam] = await Promise.all([
    getMyTeams(user.id),
    getMyPendingRequests(user.id),
    getOwnedTeam(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <ErrorBanner message={typeof error === "string" ? error : undefined} />

      <h1 className="font-heading text-lg">{user.nickname}님</h1>

      <Card>
        <CardHeader>
          <CardTitle>내 팀 {myTeams.length}개</CardTitle>
          <CardDescription>
            {/* 문서 2.2 — 한 사람은 한 팀의 대표만 맡을 수 있다. */}
            {ownedTeam
              ? "이미 대표를 맡고 있어 새 팀을 만들 수 없습니다."
              : "팀을 만들면 자동으로 대표가 됩니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {myTeams.length ? (
            <ul className="flex flex-col gap-3">
              {myTeams.map(({ team, role }) => (
                <li key={team.id}>
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRegion(team.regionSido, team.regionSigungu)} · {formatLevel(team.level)}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {ROLE_LABEL[role]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">아직 소속된 팀이 없습니다.</p>
          )}

          {ownedTeam ? null : (
            <Button asChild className="self-start">
              <Link href="/teams/new">팀 만들기</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {pendingRequests.length ? (
        <Card>
          <CardHeader>
            <CardTitle>승인 대기 중인 가입 신청</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {pendingRequests.map(({ id, team }) => (
                <li key={id}>
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
                    <span className="text-sm">{team.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">대기 중</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
