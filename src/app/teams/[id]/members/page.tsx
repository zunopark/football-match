import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CopyLink } from "@/components/copy-link";
import { ErrorBanner } from "@/components/error-banner";
import { TeamLogo } from "@/components/team-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guard";
import { getOrigin } from "@/lib/site";
import { canAssignRoles, canManageMembers, canTransferOwnership, ROLE_LABEL } from "@/lib/teams/permissions";
import {
  getJoinLinkToken,
  getMembership,
  getPendingJoinRequests,
  getTeam,
  getTeamMembers,
} from "@/lib/teams/queries";

import {
  approveJoinRequest,
  changeMemberRole,
  regenerateJoinLink,
  rejectJoinRequest,
  removeMember,
  transferOwnership,
} from "../../actions";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring";

/** 문서 F-03 — 가입 신청 처리와 팀원 관리. 대표 또는 운영진만 접근한다. */
export default async function TeamMembersPage({
  params,
  searchParams,
}: PageProps<"/teams/[id]/members">) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await requireUser(`/teams/${id}/members`);
  const team = await getTeam(id);
  if (!team) notFound();

  const membership = await getMembership(id, user.id);
  if (!membership || !canManageMembers(membership.role)) redirect(`/teams/${id}`);

  const [token, requests, members, origin] = await Promise.all([
    getJoinLinkToken(id),
    getPendingJoinRequests(id),
    getTeamMembers(id),
    getOrigin(),
  ]);

  const others = members.filter((member) => member.userId !== user.id);

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
          <CardTitle>가입 신청 링크</CardTitle>
          <CardDescription>
            이 링크를 받은 사람은 팀 프로필을 열어 가입을 신청할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {token ? (
            <CopyLink url={`${origin}/join/${token}`} showUrl />
          ) : (
            <p className="text-sm">링크가 없습니다.</p>
          )}
          <form action={regenerateJoinLink}>
            <input type="hidden" name="teamId" value={id} />
            <Button type="submit" variant="outline" size="sm">
              링크 재발급
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            재발급하면 이전 링크는 더 이상 열리지 않습니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가입 신청 {requests.length}건</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length ? (
            <ul className="flex flex-col gap-4">
              {requests.map((request) => (
                <li key={request.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <TeamLogo
                      name={request.nickname ?? "?"}
                      logoUrl={request.profileImageUrl}
                      size="sm"
                    />
                    <span className="text-sm">{request.nickname}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {request.createdAt.toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {request.message ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                      {request.message}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <form action={approveJoinRequest}>
                      <input type="hidden" name="teamId" value={id} />
                      <input type="hidden" name="requestId" value={request.id} />
                      <Button type="submit" size="sm">
                        승인
                      </Button>
                    </form>
                    <form action={rejectJoinRequest}>
                      <input type="hidden" name="teamId" value={id} />
                      <input type="hidden" name="requestId" value={request.id} />
                      <Button type="submit" size="sm" variant="outline">
                        거절
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">대기 중인 가입 신청이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>팀원 {members.length}명</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {members.map((member) => {
              const isMe = member.userId === user.id;
              const canEditRole = canAssignRoles(membership.role) && member.role !== "owner";
              const canRemove =
                !isMe &&
                member.role !== "owner" &&
                (membership.role === "owner" || member.role === "member");

              return (
                <li key={member.userId} className="flex flex-wrap items-center gap-2">
                  <TeamLogo
                    name={member.nickname ?? "?"}
                    logoUrl={member.profileImageUrl}
                    size="sm"
                  />
                  <span className="text-sm">
                    {member.nickname}
                    {isMe ? " (나)" : ""}
                  </span>
                  <Badge variant="outline">{ROLE_LABEL[member.role]}</Badge>

                  <div className="ml-auto flex items-center gap-2">
                    {canEditRole ? (
                      <form action={changeMemberRole} className="flex items-center gap-1">
                        <input type="hidden" name="teamId" value={id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          aria-label={`${member.nickname} 역할`}
                          className={SELECT_CLASS}
                        >
                          <option value="manager">{ROLE_LABEL.manager}</option>
                          <option value="member">{ROLE_LABEL.member}</option>
                        </select>
                        <Button type="submit" size="sm" variant="outline">
                          변경
                        </Button>
                      </form>
                    ) : null}

                    {canRemove ? (
                      <form action={removeMember}>
                        <input type="hidden" name="teamId" value={id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" size="sm" variant="destructive">
                          내보내기
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 문서 F-03-06 — 위임 대상은 운영진 한정이 아니라 전체 팀원 (문서 19.1-2) */}
      {canTransferOwnership(membership.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>대표 권한 위임</CardTitle>
            <CardDescription>
              위임하면 상대가 대표가 되고, 나는 그 팀원이 갖고 있던 역할로 바뀝니다. 대표는 위임을
              마쳐야 팀을 나갈 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {others.length ? (
              <form action={transferOwnership} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="teamId" value={id} />
                <select name="userId" required aria-label="위임 대상" className={SELECT_CLASS}>
                  <option value="">팀원 선택</option>
                  {others.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.nickname} ({ROLE_LABEL[member.role]})
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="destructive">
                  대표 위임
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                위임할 팀원이 없습니다. 대표 혼자인 팀은 나가는 대신 팀 삭제로 정리합니다.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
