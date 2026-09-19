import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/guard";
import { canDeleteTeam } from "@/lib/teams/permissions";
import { getMembership, getTeam, getTeamMemberCount } from "@/lib/teams/queries";

import { deleteTeam, setTeamActive } from "../../actions";

/** 문서 F-02-04 팀 삭제 및 비활성화 — 대표만 */
export default async function TeamSettingsPage({
  params,
  searchParams,
}: PageProps<"/teams/[id]/settings">) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await requireUser(`/teams/${id}/settings`);
  const team = await getTeam(id);
  if (!team) notFound();

  const membership = await getMembership(id, user.id);
  if (!membership || !canDeleteTeam(membership.role)) redirect(`/teams/${id}`);

  const memberCount = await getTeamMemberCount(id);
  const isActive = team.status === "active";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <Link href={`/teams/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {team.name}
        </Link>
      </div>

      <ErrorBanner message={typeof error === "string" ? error : undefined} />

      <Card>
        <CardHeader>
          <CardTitle>팀 비활성화</CardTitle>
          <CardDescription>
            비활성화하면 매칭 상대 탐색 화면에 팀이 노출되지 않습니다. 팀원과 기록은 그대로 남습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setTeamActive} className="flex items-center gap-3">
            <input type="hidden" name="teamId" value={id} />
            {/* 현재 상태의 반대 값을 보내 토글한다. */}
            {isActive ? null : <input type="hidden" name="active" value="on" />}
            <span className="text-sm">
              현재 상태: <strong>{isActive ? "활성" : "비활성"}</strong>
            </span>
            <Button type="submit" variant="outline" size="sm" className="ml-auto">
              {isActive ? "비활성화하기" : "다시 활성화하기"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">팀 삭제</CardTitle>
          <CardDescription>
            팀과 팀원 정보가 모두 정리되며 되돌릴 수 없습니다. 삭제 후에는 새 팀을 만들 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {memberCount > 1 ? (
            <p className="text-sm text-muted-foreground">
              현재 팀원이 {memberCount}명입니다. 팀을 넘기려면 삭제 대신{" "}
              <Link href={`/teams/${id}/members`} className="underline underline-offset-2">
                대표 권한 위임
              </Link>
              을 사용하세요.
            </p>
          ) : null}

          <form action={deleteTeam} className="flex flex-col gap-3">
            <input type="hidden" name="teamId" value={id} />
            <input type="hidden" name="teamName" value={team.name} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmName">
                확인을 위해 팀명 <strong>{team.name}</strong> 을(를) 입력하세요.
              </Label>
              <Input id="confirmName" name="confirmName" autoComplete="off" required />
            </div>
            <Button type="submit" variant="destructive" className="self-start">
              팀 삭제하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
