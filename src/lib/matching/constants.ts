import type { CostType } from "@/lib/db/schema";

export type Coords = { lat: number; lng: number };

/** 문서 16.3 cost_type */
export const COST_LABEL: Record<CostType, string> = {
  free: "무료",
  split: "구장비 분담",
  opponent: "상대 부담",
  negotiable: "협의",
  other: "기타",
};

export const COST_TYPES = Object.keys(COST_LABEL) as CostType[];

/** 문서 F-04-03 — 경기 방식은 11인제 고정이라 입력받지 않는다. */
export const MATCH_FORMAT = "11인제";

/** 문서 7.1 — GPS 기본 반경 30km, 사용자가 조절 가능 (19.1-3) */
export const DEFAULT_RADIUS_KM = 30;
export const RADIUS_OPTIONS = [5, 10, 20, 30, 50, 100] as const;

/** 문서 8.1 — 상단 날짜 탭은 오늘 기준 최소 2주 */
export const DATE_TAB_DAYS = 14;

/** 문서 8.1 — 희망 시간대 프리셋 필터 */
export const TIME_PRESETS = [
  { value: "morning", label: "오전", from: "00:00", to: "12:00" },
  { value: "afternoon", label: "오후", from: "12:00", to: "18:00" },
  { value: "evening", label: "18시 이후", from: "18:00", to: "24:00" },
  { value: "night", label: "20시 이후", from: "20:00", to: "24:00" },
] as const;

export type TimePreset = (typeof TIME_PRESETS)[number]["value"];

export function findTimePreset(value: string | undefined) {
  return TIME_PRESETS.find((preset) => preset.value === value);
}

/** 오늘부터 DATE_TAB_DAYS 일치의 날짜 탭 목록 (YYYY-MM-DD) */
export function buildDateTabs(today = new Date()): string[] {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Array.from({ length: DATE_TAB_DAYS }, (_, offset) => {
    const day = new Date(base);
    day.setDate(base.getDate() + offset);
    return toDateValue(day);
  });
}

/** Date → "YYYY-MM-DD" (로컬 기준). toISOString 은 UTC 로 밀려 하루가 어긋난다. */
export function toDateValue(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateTab(value: string): { label: string; weekday: string } {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return { label: `${month}/${day}`, weekday: WEEKDAYS[date.getDay()] };
}

/** "18:00:00" → "18:00" */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}
