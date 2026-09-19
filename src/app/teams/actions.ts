"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  teamJoinLinks,
  teamJoinRequests,
  teamMembers,
  teams,
  type TeamRole,
} from "@/lib/db/schema";
import { isValidRegion } from "@/lib/regions";
import { LEVEL_MAX, LEVEL_MIN } from "@/lib/teams/level";
import { LogoUploadError, removeTeamLogos, uploadTeamLogo } from "@/lib/teams/logo";
import {
  canAssignRoles,
  canDeleteTeam,
  canManageMembers,
  canManageTeamProfile,
  canTransferOwnership,
} from "@/lib/teams/permissions";
import {
  getMembership,
  getMyPendingJoinRequest,
  getOwnedTeam,
  getTeam,
  getTeamMemberCount,
} from "@/lib/teams/queries";

export type TeamFormState = { error: string | null };

const NAME_MIN = 2;
const NAME_MAX = 20;
const DESCRIPTION_MAX = 500;
const JOIN_MESSAGE_MAX = 200;

/**
 * 팀명은 한글·영어·숫자와 낱말 사이 공백만 허용한다.
 * 완성형 한글(가-힣)뿐 아니라 자모(ㄱ-ㅎ, ㅏ-ㅣ)도 받아 "ㅋㅋ FC" 같은 이름을 막지 않는다.
 */
const NAME_PATTERN = /^[0-9A-Za-z\uAC00-\uD7A3\u3131-\u318E ]+$/;

/**
 * 버튼 하나짜리 액션들은 필드별 피드백이 필요 없어서, 실패하면 원래 화면으로 메시지를 달고 돌아간다.
 * (클라이언트 컴포넌트 없이 일반 form 으로 동작한다)
 */
function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** 팀 단위 액션의 공통 권한 검사. 소속이 아니거나 팀이 없으면 되돌려보낸다. */
async function requireTeamRole(
  teamId: string,
  allow: (role: TeamRole) => boolean,
  backTo: string,
): Promise<{ userId: string; role: TeamRole }> {
  const user = await requireUser(backTo);
  const team = await getTeam(teamId);
  if (!team) fail("/", "팀을 찾을 수 없습니다.");

  const membership = await getMembership(teamId, user.id);
  if (!membership || !allow(membership.role)) {
    fail(backTo, "이 작업을 수행할 권한이 없습니다.");
  }
  return { userId: user.id, role: membership.role };
}

function readTeamFields(formData: FormData) {
  return {
    // "FC  서울" 과 "FC 서울" 이 다른 팀으로 등록되지 않도록 연속 공백을 하나로 줄인다.
    name: String(formData.get("name") ?? "").trim().replace(/\s+/g, " "),
    regionSido: String(formData.get("regionSido") ?? "").trim(),
    regionSigungu: String(formData.get("regionSigungu") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    level: Number(formData.get("level")),
  };
}

type TeamFields = ReturnType<typeof readTeamFields>;

/** 형식 검사. 팀명 중복은 DB 를 봐야 해서 아래 `checkNameTaken` 이 따로 맡는다. */
function validateTeamFields(fields: TeamFields): string | null {
  if (fields.name.length < NAME_MIN || fields.name.length > NAME_MAX) {
    return `팀명은 ${NAME_MIN}~${NAME_MAX}자로 입력해주세요.`;
  }
  if (!NAME_PATTERN.test(fields.name)) {
    return "팀명에는 한글, 영어, 숫자와 띄어쓰기만 사용할 수 있습니다.";
  }
  // 문서 F-02-01 — 표기 불일치를 막기 위해 목록에 있는 지역만 받는다.
  if (!isValidRegion(fields.regionSido, fields.regionSigungu)) {
    return "활동 지역을 목록에서 선택해주세요.";
  }
  if (!Number.isInteger(fields.level) || fields.level < LEVEL_MIN || fields.level > LEVEL_MAX) {
    return `팀 레벨을 ${LEVEL_MIN}~${LEVEL_MAX} 중에서 선택해주세요.`;
  }
  if (fields.description.length > DESCRIPTION_MAX) {
    return `팀 소개는 ${DESCRIPTION_MAX}자 이내로 입력해주세요.`;
  }
  return null;
}

/** 팀명 중복 검사. 삭제된 팀의 이름은 다시 쓸 수 있고, 대소문자만 다른 이름은 같은 것으로 본다. */
async function isNameTaken(name: string, exceptTeamId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        sql`lower(${teams.name}) = lower(${name})`,
        ne(teams.status, "deleted"),
        exceptTeamId ? ne(teams.id, exceptTeamId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** 문서 F-02-01 팀 생성 — 생성자는 자동으로 대표가 된다. */
export async function createTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const user = await requireUser("/teams/new");

  // 문서 2.2 — 한 사람은 하나의 팀만 생성할 수 있다.
  const owned = await getOwnedTeam(user.id);
  if (owned) {
    return { error: `이미 «${owned.name}» 의 대표입니다. 한 사람은 한 팀의 대표만 맡을 수 있습니다.` };
  }

  const fields = readTeamFields(formData);
  const invalid = validateTeamFields(fields);
  if (invalid) return { error: invalid };
  if (await isNameTaken(fields.name)) return { error: "이미 사용 중인 팀명입니다." };

  // 로고 경로에 팀 id 가 필요해서 id 를 먼저 정하고 업로드한 뒤 한 트랜잭션으로 저장한다.
  const teamId = randomUUID();
  let logoUrl: string | null;
  try {
    logoUrl = await uploadTeamLogo(teamId, formData.get("logo") as File | null);
  } catch (error) {
    if (error instanceof LogoUploadError) return { error: error.message };
    throw error;
  }

  await db.transaction(async (tx) => {
    await tx.insert(teams).values({ id: teamId, ...fields, logoUrl, createdBy: user.id });
    await tx.insert(teamMembers).values({ teamId, userId: user.id, role: "owner" });
    // 문서 16.2 team_join_links — 생성과 동시에 공유용 가입 신청 URL 을 발급한다.
    await tx.insert(teamJoinLinks).values({ teamId, token: randomUUID(), createdBy: user.id });
  });

  redirect(`/teams/${teamId}`);
}

/** 문서 F-02-03 팀 정보 수정 — 대표 또는 운영진 */
export async function updateTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  await requireTeamRole(teamId, canManageTeamProfile, `/teams/${teamId}/edit`);

  const fields = readTeamFields(formData);
  const invalid = validateTeamFields(fields);
  if (invalid) return { error: invalid };
  if (await isNameTaken(fields.name, teamId)) return { error: "이미 사용 중인 팀명입니다." };

  const logo = formData.get("logo") as File | null;
  let logoUrl: string | null = null;
  try {
    logoUrl = await uploadTeamLogo(teamId, logo);
  } catch (error) {
    if (error instanceof LogoUploadError) return { error: error.message };
    throw error;
  }

  // 새 로고를 올렸으면 이전 파일만, 삭제를 요청했으면 전부 지운다.
  const removeLogo = formData.get("removeLogo") === "on";
  if (logoUrl) await removeTeamLogos(teamId, logoUrl);
  else if (removeLogo) await removeTeamLogos(teamId);

  await db
    .update(teams)
    .set({
      ...fields,
      // 새로 올린 게 없고 삭제 요청도 없으면 기존 로고를 그대로 둔다.
      ...(logoUrl ? { logoUrl } : removeLogo ? { logoUrl: null } : {}),
    })
    .where(eq(teams.id, teamId));

  revalidatePath(`/teams/${teamId}`);
  redirect(`/teams/${teamId}`);
}

/** 문서 F-02-04 팀 비활성화 — 비활성화하면 신규 매칭 노출이 중단된다. */
export async function setTeamActive(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}/settings`;
  await requireTeamRole(teamId, canDeleteTeam, backTo);

  const active = formData.get("active") === "on";
  await db
    .update(teams)
    .set({ status: active ? "active" : "inactive" })
    .where(eq(teams.id, teamId));

  revalidatePath(`/teams/${teamId}`);
  redirect(backTo);
}

/**
 * 문서 F-02-04 팀 삭제 — 대표만. 소프트 삭제로 처리하고 팀원·대기 신청을 함께 정리한다.
 *
 * TODO(Phase 4~5): "예정 경기가 없고 진행 중인 매칭 신청이 없는 경우만 삭제 가능" 검사 추가.
 * matches / match_requests 테이블이 아직 없어 Phase 2 에서는 검사할 대상이 없다.
 */
export async function deleteTeam(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}/settings`;
  await requireTeamRole(teamId, canDeleteTeam, backTo);

  if (String(formData.get("confirmName") ?? "").trim() !== String(formData.get("teamName") ?? "")) {
    fail(backTo, "확인을 위해 팀명을 정확히 입력해주세요.");
  }

  await db.transaction(async (tx) => {
    await tx.update(teams).set({ status: "deleted" }).where(eq(teams.id, teamId));
    // 팀원이 모두 빠져야 "대표 1팀" 제약(0003 마이그레이션)이 풀려 새 팀을 만들 수 있다.
    await tx
      .update(teamMembers)
      .set({ status: "removed" })
      .where(eq(teamMembers.teamId, teamId));
    await tx
      .update(teamJoinRequests)
      .set({ status: "cancelled", processedAt: new Date() })
      .where(and(eq(teamJoinRequests.teamId, teamId), eq(teamJoinRequests.status, "pending")));
  });

  await removeTeamLogos(teamId);
  redirect("/");
}

/** 공유 링크 재발급 — 기존 링크를 무효화하고 새 토큰을 발급한다. */
export async function regenerateJoinLink(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}/members`;
  const { userId } = await requireTeamRole(teamId, canManageMembers, backTo);

  await db.transaction(async (tx) => {
    await tx.delete(teamJoinLinks).where(eq(teamJoinLinks.teamId, teamId));
    await tx.insert(teamJoinLinks).values({ teamId, token: randomUUID(), createdBy: userId });
  });

  revalidatePath(backTo);
  redirect(backTo);
}

/** 문서 F-03 가입 신청 */
export async function requestJoin(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}`;

  // 문서 2.2 — 비로그인 상태로 신청을 누르면 로그인 후 이 팀 페이지로 돌아온다.
  const user = await requireUser(backTo);

  const team = await getTeam(teamId);
  if (!team) fail("/", "팀을 찾을 수 없습니다.");

  if (await getMembership(teamId, user.id)) fail(backTo, "이미 이 팀의 팀원입니다.");
  if (await getMyPendingJoinRequest(teamId, user.id)) fail(backTo, "이미 신청이 접수되어 있습니다.");

  const message = String(formData.get("message") ?? "").trim();
  if (message.length > JOIN_MESSAGE_MAX) {
    fail(backTo, `가입 신청 메시지는 ${JOIN_MESSAGE_MAX}자 이내로 입력해주세요.`);
  }

  // 거절·취소된 신청은 이력으로 남기고 새 신청 행을 추가한다.
  await db
    .insert(teamJoinRequests)
    .values({ teamId, userId: user.id, message: message || null, status: "pending" });

  revalidatePath(backTo);
  redirect(backTo);
}

export async function cancelJoinRequest(formData: FormData): Promise<void> {
  const requestId = String(formData.get("requestId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}`;
  const user = await requireUser(backTo);

  await db
    .update(teamJoinRequests)
    .set({ status: "cancelled", processedAt: new Date() })
    .where(
      and(
        eq(teamJoinRequests.id, requestId),
        eq(teamJoinRequests.userId, user.id),
        eq(teamJoinRequests.status, "pending"),
      ),
    );

  revalidatePath(backTo);
  redirect(backTo);
}

/** 문서 F-03 가입 승인 — 대표 또는 운영진 */
export async function approveJoinRequest(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const backTo = `/teams/${teamId}/members`;
  await requireTeamRole(teamId, canManageMembers, backTo);

  await db.transaction(async (tx) => {
    const [request] = await tx
      .update(teamJoinRequests)
      .set({ status: "approved", processedAt: new Date() })
      .where(
        and(
          eq(teamJoinRequests.id, requestId),
          eq(teamJoinRequests.teamId, teamId),
          eq(teamJoinRequests.status, "pending"),
        ),
      )
      .returning();
    if (!request) return;

    // 탈퇴·강퇴 이력이 있는 사용자는 기존 행을 되살린다. (team_id, user_id 유니크)
    await tx
      .insert(teamMembers)
      .values({ teamId, userId: request.userId, role: "member" })
      .onConflictDoUpdate({
        target: [teamMembers.teamId, teamMembers.userId],
        set: { status: "active", role: "member", joinedAt: new Date() },
      });
  });

  revalidatePath(backTo);
  redirect(backTo);
}

export async function rejectJoinRequest(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const backTo = `/teams/${teamId}/members`;
  await requireTeamRole(teamId, canManageMembers, backTo);

  await db
    .update(teamJoinRequests)
    .set({ status: "rejected", processedAt: new Date() })
    .where(
      and(
        eq(teamJoinRequests.id, requestId),
        eq(teamJoinRequests.teamId, teamId),
        eq(teamJoinRequests.status, "pending"),
      ),
    );

  revalidatePath(backTo);
  redirect(backTo);
}

/** 문서 2.3 — 운영진 지정·해제는 대표만 할 수 있다. */
export async function changeMemberRole(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  const backTo = `/teams/${teamId}/members`;
  const { userId } = await requireTeamRole(teamId, canAssignRoles, backTo);

  if (nextRole !== "manager" && nextRole !== "member") fail(backTo, "잘못된 역할입니다.");
  if (targetUserId === userId) fail(backTo, "대표 역할은 위임으로만 변경할 수 있습니다.");

  await db
    .update(teamMembers)
    .set({ role: nextRole })
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId),
        eq(teamMembers.status, "active"),
        ne(teamMembers.role, "owner"),
      ),
    );

  revalidatePath(backTo);
  redirect(backTo);
}

/** 팀원 내보내기 — 대표 또는 운영진. 운영진끼리 서로 내보내지는 못한다. */
export async function removeMember(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const backTo = `/teams/${teamId}/members`;
  const { userId, role } = await requireTeamRole(teamId, canManageMembers, backTo);

  if (targetUserId === userId) fail(backTo, "본인은 '팀 나가기' 로 탈퇴해주세요.");

  const target = await getMembership(teamId, targetUserId);
  if (!target) fail(backTo, "이미 팀에 없는 사용자입니다.");
  if (target.role === "owner") fail(backTo, "대표는 내보낼 수 없습니다.");
  if (target.role === "manager" && role !== "owner") {
    fail(backTo, "운영진을 내보낼 수 있는 권한은 대표에게만 있습니다.");
  }

  await db
    .update(teamMembers)
    .set({ status: "removed" })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)));

  revalidatePath(backTo);
  redirect(backTo);
}

/**
 * 문서 F-03-06 대표 권한 위임 — 위임 대상은 전체 팀원 누구나 (문서 19.1-2).
 * 문서 16.2 주석대로 두 멤버의 role 을 트랜잭션으로 맞바꾼다.
 */
export async function transferOwnership(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const backTo = `/teams/${teamId}/members`;
  const { userId } = await requireTeamRole(teamId, canTransferOwnership, backTo);

  if (targetUserId === userId) fail(backTo, "본인에게는 위임할 수 없습니다.");

  const target = await getMembership(teamId, targetUserId);
  if (!target) fail(backTo, "팀원 중에서 위임 대상을 선택해주세요.");

  await db.transaction(async (tx) => {
    // "대표 1명" 제약(0003 마이그레이션)에 걸리지 않도록 기존 대표부터 내려온다.
    await tx
      .update(teamMembers)
      .set({ role: target.role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    await tx
      .update(teamMembers)
      .set({ role: "owner" })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)));
  });

  revalidatePath(backTo);
  redirect(backTo);
}

/**
 * 팀 탈퇴. 문서 2.5 — 대표는 위임을 마쳐야 나갈 수 있고,
 * 대표 혼자뿐이라 위임 대상이 없으면 팀 삭제 절차(F-02-04)로 넘어간다.
 */
export async function leaveTeam(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const backTo = `/teams/${teamId}`;
  const user = await requireUser(backTo);

  const membership = await getMembership(teamId, user.id);
  if (!membership) fail(backTo, "이 팀의 팀원이 아닙니다.");

  if (membership.role === "owner") {
    const memberCount = await getTeamMemberCount(teamId);
    if (memberCount > 1) {
      fail(`/teams/${teamId}/members`, "탈퇴하려면 다른 팀원에게 대표 권한을 먼저 위임해주세요.");
    }
    fail(`/teams/${teamId}/settings`, "대표 혼자인 팀입니다. 탈퇴 대신 팀 삭제를 진행해주세요.");
  }

  await db
    .update(teamMembers)
    .set({ status: "removed" })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)));

  redirect("/");
}
