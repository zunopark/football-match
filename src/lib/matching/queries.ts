import { and, asc, eq, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { matchConditions, teamMembers, teams, type CostType, type Team } from "@/lib/db/schema";

import { findTimePreset, type Coords } from "./constants";

export type ExploreFilters = {
  date: string;
  sido: string[];
  levels: number[];
  costs: CostType[];
  timePreset?: string;
  coords?: Coords | null;
  radiusKm: number;
  includePaused: boolean;
  /** 로그인 사용자의 팀 — 목록에서 제외하고, GPS 가 없을 때 지역 fallback 기준이 된다. */
  myTeamIds: string[];
  myRegionSigungu?: string | null;
};

export type ExploreItem = {
  condition: {
    id: string;
    status: "seeking" | "not_seeking";
    desiredDate: string;
    desiredTime: string;
    locationText: string;
    opponentLevelMin: number;
    opponentLevelMax: number;
    costType: CostType;
    notes: string | null;
  };
  team: Pick<Team, "id" | "name" | "logoUrl" | "level" | "regionSido" | "regionSigungu">;
  /** GPS 를 허용했고 경기 장소 좌표가 있을 때만 값이 있다. */
  distanceKm: number | null;
};

/** 하버사인 거리(km). 반경 필터·정렬용이라 이 정도 정밀도면 충분하다. */
function distanceExpr(coords: Coords) {
  return sql<number>`
    6371 * 2 * asin(sqrt(
      power(sin(radians(${coords.lat} - ${matchConditions.locationLat}) / 2), 2)
      + cos(radians(${matchConditions.locationLat})) * cos(radians(${coords.lat}))
      * power(sin(radians(${coords.lng} - ${matchConditions.locationLng}) / 2), 2)
    ))`;
}

/**
 * 문서 F-05 / F-06 통합 리스트 (8.1 메인 화면).
 *
 * 노출 대상은 "선택한 날짜에 매칭을 구하는, 활성 상태 팀" 이고,
 * 위치는 문서 F-05-02 대로 **GPS 반경 OR 활동 지역 일치** 를 OR 로 묶는다.
 * 사용자가 시/도 칩을 직접 고르면 그 선택이 위치 조건을 대신한다 (8.1).
 */
export async function findMatchCandidates(filters: ExploreFilters): Promise<ExploreItem[]> {
  const where: (SQL | undefined)[] = [
    eq(matchConditions.desiredDate, filters.date),
    // 문서 F-02-04 — 비활성화된 팀은 신규 매칭에 노출하지 않는다.
    eq(teams.status, "active"),
  ];

  if (!filters.includePaused) where.push(eq(matchConditions.status, "seeking"));
  if (filters.levels.length) where.push(inArray(teams.level, filters.levels));
  if (filters.costs.length) where.push(inArray(matchConditions.costType, filters.costs));
  // 문서 F-05-05 — 내가 속한 팀은 추천에서 뺀다.
  if (filters.myTeamIds.length) where.push(notInArray(teams.id, filters.myTeamIds));

  const preset = findTimePreset(filters.timePreset);
  if (preset) {
    where.push(sql`${matchConditions.desiredTime} >= ${preset.from}::time`);
    where.push(sql`${matchConditions.desiredTime} < ${preset.to}::time`);
  }

  const distance = filters.coords ? distanceExpr(filters.coords) : null;

  if (filters.sido.length) {
    // 사용자가 지역을 직접 골랐으면 그 선택이 우선한다.
    where.push(inArray(teams.regionSido, filters.sido));
  } else if (distance || filters.myRegionSigungu) {
    // 문서 F-05-02 — 반경 안이거나 활동 지역이 같으면 노출.
    where.push(
      or(
        distance ? sql`${matchConditions.locationLat} IS NOT NULL AND ${distance} <= ${filters.radiusKm}` : undefined,
        filters.myRegionSigungu ? eq(teams.regionSigungu, filters.myRegionSigungu) : undefined,
      ),
    );
  }

  const rows = await db
    .select({
      condition: {
        id: matchConditions.id,
        status: matchConditions.status,
        desiredDate: matchConditions.desiredDate,
        desiredTime: matchConditions.desiredTime,
        locationText: matchConditions.locationText,
        opponentLevelMin: matchConditions.opponentLevelMin,
        opponentLevelMax: matchConditions.opponentLevelMax,
        costType: matchConditions.costType,
        notes: matchConditions.notes,
      },
      team: {
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
        level: teams.level,
        regionSido: teams.regionSido,
        regionSigungu: teams.regionSigungu,
      },
      distanceKm: distance ?? sql<number | null>`null`,
    })
    .from(matchConditions)
    .innerJoin(teams, eq(teams.id, matchConditions.teamId))
    .where(and(...where))
    // 문서 F-05-01 — GPS 를 허용했으면 가까운 순, 아니면 이른 시간 순.
    .orderBy(
      ...(distance ? [sql`${distance} nulls last`] : []),
      asc(matchConditions.desiredTime),
      asc(teams.name),
    );

  return rows.map((row) => ({
    ...row,
    distanceKm: row.distanceKm === null ? null : Number(row.distanceKm),
  }));
}

/** 선택한 날짜 외에 어떤 날짜에 매칭 글이 있는지 — 날짜 탭에 점을 찍는다. */
export async function countByDate(dates: string[]): Promise<Record<string, number>> {
  if (!dates.length) return {};

  const rows = await db
    .select({ date: matchConditions.desiredDate, value: sql<number>`count(*)::int` })
    .from(matchConditions)
    .innerJoin(teams, eq(teams.id, matchConditions.teamId))
    .where(
      and(
        inArray(matchConditions.desiredDate, dates),
        eq(matchConditions.status, "seeking"),
        eq(teams.status, "active"),
      ),
    )
    .groupBy(matchConditions.desiredDate);

  return Object.fromEntries(rows.map((row) => [row.date, row.value]));
}

/** 한 팀이 올려 둔 매칭 조건 (팀 관리 화면 / 팀 프로필용). 지난 날짜는 뺀다. */
export async function getTeamConditions(teamId: string, includePast = false) {
  const where: (SQL | undefined)[] = [eq(matchConditions.teamId, teamId)];
  if (!includePast) where.push(sql`${matchConditions.desiredDate} >= current_date`);

  return db
    .select()
    .from(matchConditions)
    .where(and(...where))
    .orderBy(asc(matchConditions.desiredDate), asc(matchConditions.desiredTime));
}

export async function getCondition(conditionId: string) {
  const [row] = await db.select().from(matchConditions).where(eq(matchConditions.id, conditionId));
  return row ?? null;
}

/** 로그인 사용자가 속한 팀 id 들 — 목록 제외와 지역 fallback 에 쓴다. */
export async function getMyTeamIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")));
  return rows.map((row) => row.teamId);
}
