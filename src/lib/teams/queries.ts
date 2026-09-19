import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  teamJoinLinks,
  teamJoinRequests,
  teamMembers,
  teams,
  users,
  type Team,
  type TeamRole,
} from "@/lib/db/schema";

export type TeamMemberView = {
  userId: string;
  nickname: string | null;
  profileImageUrl: string | null;
  role: TeamRole;
  joinedAt: Date;
};

export type JoinRequestView = {
  id: string;
  userId: string;
  nickname: string | null;
  profileImageUrl: string | null;
  message: string | null;
  createdAt: Date;
};

/** 대표가 팀원보다, 운영진이 팀원보다 위에 오도록 정렬한다. */
const ROLE_ORDER = sql`case ${teamMembers.role} when 'owner' then 0 when 'manager' then 1 else 2 end`;

/** 삭제된 팀은 없는 것으로 취급한다. */
export async function getTeam(teamId: string): Promise<Team | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), ne(teams.status, "deleted")));
  return team ?? null;
}

/** 현재 사용자의 팀 내 역할. 소속이 아니면 null. */
export async function getMembership(
  teamId: string,
  userId: string,
): Promise<{ role: TeamRole } | null> {
  const [row] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "active"),
      ),
    );
  return row ?? null;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberView[]> {
  return db
    .select({
      userId: teamMembers.userId,
      nickname: users.nickname,
      profileImageUrl: users.profileImageUrl,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "active")))
    .orderBy(ROLE_ORDER, asc(teamMembers.joinedAt));
}

export async function getTeamMemberCount(teamId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "active")));
  return row?.value ?? 0;
}

/** 팀원 관리 화면에 띄울 대기 중인 가입 신청 (F-03) */
export async function getPendingJoinRequests(teamId: string): Promise<JoinRequestView[]> {
  return db
    .select({
      id: teamJoinRequests.id,
      userId: teamJoinRequests.userId,
      nickname: users.nickname,
      profileImageUrl: users.profileImageUrl,
      message: teamJoinRequests.message,
      createdAt: teamJoinRequests.createdAt,
    })
    .from(teamJoinRequests)
    .innerJoin(users, eq(users.id, teamJoinRequests.userId))
    .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, "pending")))
    .orderBy(asc(teamJoinRequests.createdAt));
}

/** 팀 메인 화면에서 대표·운영진에게 알릴 신규 가입 신청 건수 (F-15 알림 전까지의 임시 안내) */
export async function getPendingJoinRequestCount(teamId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(teamJoinRequests)
    .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, "pending")));
  return row?.value ?? 0;
}

/** 현재 사용자가 이 팀에 넣어 둔 대기 중인 신청 */
export async function getMyPendingJoinRequest(teamId: string, userId: string) {
  const [row] = await db
    .select()
    .from(teamJoinRequests)
    .where(
      and(
        eq(teamJoinRequests.teamId, teamId),
        eq(teamJoinRequests.userId, userId),
        eq(teamJoinRequests.status, "pending"),
      ),
    );
  return row ?? null;
}

/** 공유용 가입 신청 링크 토큰. 팀 생성 시 함께 발급하므로 보통 1건이다. */
export async function getJoinLinkToken(teamId: string): Promise<string | null> {
  const [row] = await db
    .select({ token: teamJoinLinks.token })
    .from(teamJoinLinks)
    .where(eq(teamJoinLinks.teamId, teamId))
    .orderBy(desc(teamJoinLinks.createdAt))
    .limit(1);
  return row?.token ?? null;
}

export async function getTeamByJoinToken(token: string): Promise<Team | null> {
  const [row] = await db
    .select({ team: teams })
    .from(teamJoinLinks)
    .innerJoin(teams, eq(teams.id, teamJoinLinks.teamId))
    .where(and(eq(teamJoinLinks.token, token), ne(teams.status, "deleted")));
  return row?.team ?? null;
}

export type MyTeamView = { team: Team; role: TeamRole };

/** 문서 2.4 — 한 사용자는 여러 팀에 동시에 소속될 수 있다. */
export async function getMyTeams(userId: string): Promise<MyTeamView[]> {
  return db
    .select({ team: teams, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "active"),
        ne(teams.status, "deleted"),
      ),
    )
    .orderBy(ROLE_ORDER, desc(teams.createdAt));
}

/**
 * 문서 2.2 — 한 사람은 하나의 팀만 생성할 수 있다.
 * 대표(owner) 멤버십 보유 여부로 판정하므로, 위임 후 탈퇴하거나 팀이 삭제되면 다시 생성할 수 있다.
 */
export async function getOwnedTeam(userId: string): Promise<Team | null> {
  const [row] = await db
    .select({ team: teams })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "owner"),
        eq(teamMembers.status, "active"),
        ne(teams.status, "deleted"),
      ),
    );
  return row?.team ?? null;
}

/** 내가 보낸 가입 신청 중 대기 상태인 것들 (홈 화면 표시용) */
export async function getMyPendingRequests(userId: string) {
  return db
    .select({ id: teamJoinRequests.id, team: teams, createdAt: teamJoinRequests.createdAt })
    .from(teamJoinRequests)
    .innerJoin(teams, eq(teams.id, teamJoinRequests.teamId))
    .where(
      and(
        eq(teamJoinRequests.userId, userId),
        eq(teamJoinRequests.status, "pending"),
        ne(teams.status, "deleted"),
      ),
    )
    .orderBy(desc(teamJoinRequests.createdAt));
}
