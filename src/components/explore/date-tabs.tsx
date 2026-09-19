import Link from "next/link";

import { formatDateTab } from "@/lib/matching/constants";
import { withHref, type ExploreParams } from "@/lib/matching/search-params";

/** 문서 8.1 — 가로 스크롤형 날짜 탭 (오늘 기준 2주), 선택된 날짜 강조 */
export function DateTabs({
  dates,
  counts,
  params,
  defaultDate,
}: {
  dates: string[];
  counts: Record<string, number>;
  params: ExploreParams;
  defaultDate: string;
}) {
  return (
    <nav aria-label="경기 날짜" className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-2">
        {dates.map((date) => {
          const { label, weekday } = formatDateTab(date);
          const active = params.date === date;
          const count = counts[date] ?? 0;

          return (
            <li key={date}>
              <Link
                href={withHref(params, defaultDate, { date })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`flex w-14 flex-col items-center rounded-lg border px-2 py-2 text-xs ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted"
                }`}
              >
                <span className={weekday === "일" ? "text-destructive" : undefined}>{weekday}</span>
                <span className="font-medium">{label}</span>
                {/* 글이 있는 날짜에만 점을 찍어 빈 날짜를 눌러보지 않게 한다. */}
                <span
                  aria-hidden
                  className={`mt-1 size-1 rounded-full ${count ? "bg-current" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
