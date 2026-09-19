"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { matchConditions, type CostType } from "@/lib/db/schema";
import { COST_TYPES } from "@/lib/matching/constants";
import { geocodePlace } from "@/lib/matching/geocode";
import { canManageTeamProfile } from "@/lib/teams/permissions";
import { getMembership, getTeam } from "@/lib/teams/queries";

export type ConditionFormState = { error: string | null };

const LOCATION_MAX = 100;
const NOTES_MAX = 300;

/** 문서 2.3 — 매칭 조건 설정은 대표 또는 운영진 */
async function requireManager(teamId: string) {
  const backTo = `/teams/${teamId}/matching`;
  const user = await requireUser(backTo);

  const team = await getTeam(teamId);
  if (!team) redirect("/");

  const membership = await getMembership(teamId, user.id);
  if (!membership || !canManageTeamProfile(membership.role)) redirect(`/teams/${teamId}`);
  return team;
}

function fail(teamId: string, message: string): never {
  redirect(`/teams/${teamId}/matching?error=${encodeURIComponent(message)}`);
}

/** 문서 F-04-02 — 매칭 구함 활성화 시 입력 항목 */
export async function saveCondition(
  _prev: ConditionFormState,
  formData: FormData,
): Promise<ConditionFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  await requireManager(teamId);

  const conditionId = String(formData.get("conditionId") ?? "");
  const desiredDate = String(formData.get("desiredDate") ?? "");
  const desiredTime = String(formData.get("desiredTime") ?? "");
  const locationText = String(formData.get("locationText") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const costType = String(formData.get("costType") ?? "") as CostType;
  const levelMin = Number(formData.get("opponentLevelMin"));
  const levelMax = Number(formData.get("opponentLevelMax"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) return { error: "경기 희망 날짜를 선택해주세요." };
  if (desiredDate < new Date().toLocaleDateString("sv-SE")) {
    return { error: "지난 날짜로는 매칭을 구할 수 없습니다." };
  }
  if (!/^\d{2}:\d{2}/.test(desiredTime)) return { error: "경기 희망 시간을 선택해주세요." };
  if (!locationText || locationText.length > LOCATION_MAX) {
    return { error: `경기 장소를 ${LOCATION_MAX}자 이내로 입력해주세요.` };
  }
  if (!COST_TYPES.includes(costType)) return { error: "경기 비용 조건을 선택해주세요." };
  if (![levelMin, levelMax].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) {
    return { error: "원하는 상대 레벨을 선택해주세요." };
  }
  if (levelMin > levelMax) return { error: "상대 레벨 범위의 최소값이 최대값보다 큽니다." };
  if (notes.length > NOTES_MAX) {
    return { error: `기타 협의 사항은 ${NOTES_MAX}자 이내로 입력해주세요.` };
  }

  // 문서 7.1 — 좌표는 GPS 반경 추천에만 쓰므로, 못 찾아도 등록은 진행한다.
  const coords = await geocodePlace(locationText);

  const values = {
    teamId,
    desiredDate,
    desiredTime,
    locationText,
    locationLat: coords?.lat ?? null,
    locationLng: coords?.lng ?? null,
    opponentLevelMin: levelMin,
    opponentLevelMax: levelMax,
    costType,
    notes: notes || null,
  };

  try {
    if (conditionId) {
      await db
        .update(matchConditions)
        .set(values)
        .where(and(eq(matchConditions.id, conditionId), eq(matchConditions.teamId, teamId)));
    } else {
      await db.insert(matchConditions).values({ ...values, status: "seeking" });
    }
  } catch (error) {
    // (team_id, desired_date) 유니크 — 같은 날짜에 두 건은 올릴 수 없다.
    if (error instanceof Error && error.message.includes("match_conditions_team_id_desired_date")) {
      return { error: "그 날짜에는 이미 등록한 매칭 조건이 있습니다. 기존 조건을 수정해주세요." };
    }
    throw error;
  }

  revalidatePath(`/teams/${teamId}/matching`);
  redirect(`/teams/${teamId}/matching`);
}

/** 문서 F-04-01 — 매칭 구함 / 매칭 안 구함 전환 */
export async function toggleCondition(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  await requireManager(teamId);

  const conditionId = String(formData.get("conditionId") ?? "");
  const seeking = formData.get("seeking") === "on";

  await db
    .update(matchConditions)
    .set({ status: seeking ? "seeking" : "not_seeking" })
    .where(and(eq(matchConditions.id, conditionId), eq(matchConditions.teamId, teamId)));

  revalidatePath(`/teams/${teamId}/matching`);
  redirect(`/teams/${teamId}/matching`);
}

export async function deleteCondition(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  await requireManager(teamId);

  const conditionId = String(formData.get("conditionId") ?? "");
  const deleted = await db
    .delete(matchConditions)
    .where(and(eq(matchConditions.id, conditionId), eq(matchConditions.teamId, teamId)))
    .returning({ id: matchConditions.id });

  if (!deleted.length) fail(teamId, "이미 삭제된 조건입니다.");

  revalidatePath(`/teams/${teamId}/matching`);
  redirect(`/teams/${teamId}/matching`);
}
