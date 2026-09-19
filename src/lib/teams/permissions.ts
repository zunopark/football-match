import type { TeamRole } from "@/lib/db/schema";

/**
 * 문서 2.3 — 팀 권한
 * 대표(owner) / 운영진(manager) / 팀원(member)
 *
 * Phase 2 범위는 팀 프로필 관리와 팀원 관리까지다.
 * 매칭 조건·경기 협의·포메이션 권한은 해당 Phase 에서 이 모듈에 추가한다.
 */
export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "대표",
  manager: "운영진",
  member: "팀원",
};

/** 팀 프로필 수정 (F-02-03) — 대표 또는 운영진 */
export function canManageTeamProfile(role: TeamRole): boolean {
  return role === "owner" || role === "manager";
}

/** 팀원 승인·거절 및 팀원 관리 (F-03) — 대표 또는 운영진 */
export function canManageMembers(role: TeamRole): boolean {
  return role === "owner" || role === "manager";
}

/** 운영진 지정·해제는 문서 2.3 "대표가 지정" 에 따라 대표만 */
export function canAssignRoles(role: TeamRole): boolean {
  return role === "owner";
}

/** 대표 권한 위임 (F-03-06) 및 팀 삭제·비활성화 (F-02-04) — 대표만 */
export function canTransferOwnership(role: TeamRole): boolean {
  return role === "owner";
}

export function canDeleteTeam(role: TeamRole): boolean {
  return role === "owner";
}
