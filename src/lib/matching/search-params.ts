import type { CostType } from "@/lib/db/schema";

import {
  COST_TYPES,
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS,
  buildDateTabs,
  findTimePreset,
  type Coords,
} from "./constants";

/**
 * 메인 탐색 화면의 필터는 전부 URL 에 담는다.
 * 그래야 칩을 링크로 만들 수 있어 자바스크립트 없이도 동작하고, 링크 공유·뒤로가기도 자연스럽다.
 */
export type ExploreParams = {
  date: string;
  sido: string[];
  levels: number[];
  costs: CostType[];
  timePreset?: string;
  coords: Coords | null;
  radiusKm: number;
  includePaused: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(raw: RawParams, key: string): string | undefined {
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

/** "a,b,c" → ["a","b","c"] */
function list(raw: RawParams, key: string): string[] {
  const value = one(raw, key);
  return value ? value.split(",").filter(Boolean) : [];
}

export function parseExploreParams(raw: RawParams, today = new Date()): ExploreParams {
  const tabs = buildDateTabs(today);
  const date = one(raw, "date");

  const lat = Number(one(raw, "lat"));
  const lng = Number(one(raw, "lng"));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const radius = Number(one(raw, "radius"));

  return {
    // 날짜 탭에 없는 값은 무시하고 오늘로 되돌린다.
    date: date && tabs.includes(date) ? date : tabs[0],
    sido: list(raw, "sido"),
    levels: list(raw, "level")
      .map(Number)
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5),
    costs: list(raw, "cost").filter((value): value is CostType =>
      COST_TYPES.includes(value as CostType),
    ),
    timePreset: findTimePreset(one(raw, "time"))?.value,
    coords: hasCoords ? { lat, lng } : null,
    radiusKm: RADIUS_OPTIONS.includes(radius as (typeof RADIUS_OPTIONS)[number])
      ? radius
      : DEFAULT_RADIUS_KM,
    includePaused: one(raw, "paused") === "1",
  };
}

/** 현재 필터를 쿼리스트링으로 되돌린다. 기본값은 URL 을 지저분하게 하지 않으려고 생략한다. */
export function toQueryString(params: ExploreParams, defaultDate: string): string {
  const query = new URLSearchParams();
  if (params.date !== defaultDate) query.set("date", params.date);
  if (params.sido.length) query.set("sido", params.sido.join(","));
  if (params.levels.length) query.set("level", params.levels.join(","));
  if (params.costs.length) query.set("cost", params.costs.join(","));
  if (params.timePreset) query.set("time", params.timePreset);
  if (params.coords) {
    query.set("lat", params.coords.lat.toFixed(5));
    query.set("lng", params.coords.lng.toFixed(5));
  }
  if (params.radiusKm !== DEFAULT_RADIUS_KM) query.set("radius", String(params.radiusKm));
  if (params.includePaused) query.set("paused", "1");

  const text = query.toString();
  return text ? `/?${text}` : "/";
}

/** 값 하나를 켜고 끈 링크를 만든다 (칩 토글용). */
export function toggledHref<K extends "sido" | "levels" | "costs">(
  params: ExploreParams,
  defaultDate: string,
  key: K,
  value: ExploreParams[K][number],
): string {
  const current = params[key] as ExploreParams[K][number][];
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  return toQueryString({ ...params, [key]: next }, defaultDate);
}

/** 단일 선택 항목(날짜·시간대·반경)을 바꾼 링크. 같은 값을 다시 누르면 해제된다. */
export function withHref(
  params: ExploreParams,
  defaultDate: string,
  patch: Partial<ExploreParams>,
): string {
  return toQueryString({ ...params, ...patch }, defaultDate);
}
