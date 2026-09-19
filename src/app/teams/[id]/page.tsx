import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyLink } from "@/components/copy-link";
import { ErrorBanner } from "@/components/error-banner";
import { LevelBadge } from "@/components/level-badge";
import { TeamLogo } from "@/components/team-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth/user";
import { formatRegion } from "@/lib/regions";
import { getOrigin } from "@/lib/site";
import { formatLevel, LEVEL_DESCRIPTION } from "@/lib/teams/level";
import {
  canDeleteTeam,
  canManageMembers,
  canManageTeamProfile,
  ROLE_LABEL,
} from "@/lib/teams/permissions";
import {
  getJoinLinkToken,
  getMembership,
  getMyPendingJoinRequest,
  getPendingJoinRequestCount,
  getTeam,
  getTeamMemberCount,
  getTeamMembers,
} from "@/lib/teams/queries";

import { cancelJoinRequest, leaveTeam, requestJoin } from "../actions";

/**
 * 문서 F-02-02 팀 프로필.
 * 공유 링크로 들어온 비로그인 사용자도 볼 수 있어야 해서 로그인 검사를 두지 않는다.
 *
 * 경기 이력 / 신뢰도 지표 / 매칭 상태는 각각 Phase 7 / Phase 7 / Phase 3 에서 붙인다.
 */
export default async function TeamPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;

  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getCurrentUser();
  const membership = user ? await getMembership(id, user.id) : null;
  const pendingRequest = user ? await getMyPendingJoinRequest(id, user.id) : null;
  // 가입 링크 토큰은 팀원에게만 내려보낸다 — 이 화면은 비로그인도 열 수 있다.
  const canManage = membership ? canManageMembers(membership.role) : false;
  const [memberCount, members, joinToken, origin, pendingCount] = await Promise.all([
    getTeamMemberCount(id),
    membership ? getTeamMembers(id) : Promise.resolve([]),
    membership ? getJoinLinkToken(id) : Promise.resolve(null),
    membership ? getOrigin() : Promise.resolve(""),
    canManage ? getPendingJoinRequestCount(id) : Promise.resolve(0),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <ErrorBanner message={typeof error === "string" ? error : undefined} />

      {/* 문서 F-15 알림이 붙기 전까지, 대표·운영진이 여기서 신규 가입 신청을 알아챌 수 있게 한다. */}
      {pendingCount > 0 ? (
        <Link
          href={`/teams/${team.id}/members`}
          className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3 text-sm hover:bg-primary/15"
        >
          <Badge>{pendingCount}</Badge>
          <span>새로운 가입 신청이 있습니다.</span>
          <span className="ml-auto text-muted-foreground">확인하기 →</span>
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size="lg" />
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatRegion(team.regionSido, team.regionSigungu)} · 팀원 {memberCount}명
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <LevelBadge level={team.level} />
                {membership ? <Badge variant="secondary">{ROLE_LABEL[membership.role]}</Badge> : null}
                {team.status === "inactive" ? <Badge variant="outline">비활성화</Badge> : null}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {team.description ? (
            <p className="text-sm whitespace-pre-wrap">{team.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">등록된 팀 소개가 없습니다.</p>
          )}

          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">활동 지역</dt>
            <dd>{formatRegion(team.regionSido, team.regionSigungu)}</dd>
            <dt className="text-muted-foreground">팀 레벨</dt>
            <dd>
              {formatLevel(team.level)}
              {/* 툴팁이 열리지 않는 터치 기기를 위해 설명을 글로도 둔다. */}
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {LEVEL_DESCRIPTION[team.level]}
              </span>
            </dd>
            <dt className="text-muted-foreground">팀 생성일</dt>
            <dd>{team.createdAt.toLocaleDateString("ko-KR")}</dd>
          </dl>

          {/* 문서 2.3 — 역할에 따라 보이는 메뉴가 달라진다. */}
          <div className="flex flex-wrap gap-2">
            {membership && canManageTeamProfile(membership.role) ? (
              <>
                <Button asChild size="sm">
                  <Link href={`/teams/${team.id}/matching`}>매칭 구하기</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teams/${team.id}/edit`}>팀 정보 수정</Link>
                </Button>
              </>
            ) : null}
            {canManage ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/teams/${team.id}/members`}>
                  팀원 관리
                  {pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Link>
              </Button>
            ) : null}
            {membership && canDeleteTeam(membership.role) ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/teams/${team.id}/settings`}>팀 설정</Link>
              </Button>
            ) : null}
            {/* 팀원이면 역할과 무관하게 가입 링크를 공유할 수 있다. */}
            {membership && joinToken ? (
              <CopyLink url={`${origin}/join/${joinToken}`} />
            ) : null}
            {membership && membership.role !== "owner" ? (
              <form action={leaveTeam}>
                <input type="hidden" name="teamId" value={team.id} />
                <Button type="submit" variant="destructive" size="sm">
                  팀 나가기
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 문서 F-03 — 팀원이 아닌 사람에게만 가입 신청을 노출한다. */}
      {!membership ? (
        <Card>
          <CardHeader>
            <CardTitle>가입 신청</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequest ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  가입 신청이 접수되었습니다. 대표 또는 운영진의 승인을 기다리는 중입니다.
                </p>
                <form action={cancelJoinRequest}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="requestId" value={pendingRequest.id} />
                  <Button type="submit" variant="outline" size="sm">
                    신청 취소
                  </Button>
                </form>
              </div>
            ) : (
              <form action={requestJoin} className="flex flex-col gap-3">
                <input type="hidden" name="teamId" value={team.id} />
                <Textarea
                  name="message"
                  rows={3}
                  maxLength={200}
                  placeholder="간단한 자기소개나 하고 싶은 말을 남겨주세요. (선택)"
                />
                <Button type="submit" className="self-start">
                  가입 신청하기
                </Button>
                {!user ? (
                  <p className="text-xs text-muted-foreground">
                    신청하려면 로그인이 필요합니다. 로그인 후 이 페이지로 돌아옵니다.
                  </p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* 팀원 목록은 문서 2.3 의 "팀 정보 조회" 권한에 맞춰 소속 팀원에게만 보인다. */}
      {membership ? (
        <Card>
          <CardHeader>
            <CardTitle>팀원 {members.length}명</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center gap-3">
                  <TeamLogo
                    name={member.nickname ?? "?"}
                    logoUrl={member.profileImageUrl}
                    size="sm"
                  />
                  <span className="text-sm">{member.nickname}</span>
                  <Badge variant="outline" className="ml-auto">
                    {ROLE_LABEL[member.role]}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
