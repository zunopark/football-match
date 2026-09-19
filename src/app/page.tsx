import Link from "next/link";

import { DateTabs } from "@/components/explore/date-tabs";
import { FilterPanel } from "@/components/explore/filter-panel";
import { MatchCard } from "@/components/explore/match-card";
import { SeekingToggle } from "@/components/explore/seeking-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { buildDateTabs } from "@/lib/matching/constants";
import { countByDate, findMatchCandidates, getMyTeamIds } from "@/lib/matching/queries";
import { parseExploreParams } from "@/lib/matching/search-params";
import { getMyTeams } from "@/lib/teams/queries";

/**
 * 문서 8.1 메인 화면 — F-05(추천)와 F-06(검색)을 한 화면에서 겸한다.
 * 비로그인도 둘러볼 수 있고, 매칭 신청 같은 액션에서만 로그인을 요구한다 (문서 2.2).
 */
export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const raw = await searchParams;
  const dates = buildDateTabs();
  const params = parseExploreParams(raw);

  const user = await getCurrentUser();

  // 문서 7.1 — GPS 를 거부했을 때의 fallback 기준이 되는 내 팀 활동 지역
  const myTeams = user ? await getMyTeams(user.id) : [];
  const myTeamIds = user ? await getMyTeamIds(user.id) : [];
  const myRegionSigungu = myTeams[0]?.team.regionSigungu ?? null;

  const [items, counts] = await Promise.all([
    findMatchCandidates({
      date: params.date,
      sido: params.sido,
      levels: params.levels,
      costs: params.costs,
      timePreset: params.timePreset,
      coords: params.coords,
      radiusKm: params.radiusKm,
      includePaused: params.includePaused,
      myTeamIds,
      myRegionSigungu,
    }),
    countByDate(dates),
  ]);

  const narrowedByLocation =
    params.sido.length > 0 || Boolean(params.coords) || Boolean(myRegionSigungu);

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      {/* 문서 8.1 — 데스크톱은 2컬럼, 모바일은 필터가 리스트 위로 접혀 올라간다.
          날짜 탭은 좌측 필터 폭이 끝나는 지점부터 시작하도록 우측 컬럼 안에 둔다. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
          <details className="lg:hidden" name="filters">
            <summary className="cursor-pointer rounded-lg border border-input px-3 py-2 text-sm">
              필터
            </summary>
            <div className="pt-4">
              <FilterPanel params={params} defaultDate={dates[0]} />
            </div>
          </details>
          <div className="hidden lg:block">
            <FilterPanel params={params} defaultDate={dates[0]} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <DateTabs dates={dates} counts={counts} params={params} defaultDate={dates[0]} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 문서 8.1 — 레퍼런스의 "마감 가리기" 를 대체하는 토글 */}
            <SeekingToggle params={params} defaultDate={dates[0]} />
            <span className="text-xs text-muted-foreground">
              {params.coords
                ? `내 위치 ${params.radiusKm}km 이내 또는 활동 지역 일치 · ${items.length}팀`
                : `경기 상대 ${items.length}팀`}
            </span>
          </div>

          {items.length ? (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <MatchCard key={item.condition.id} item={item} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">
                이 날짜에 조건에 맞는 팀이 없습니다.
                {narrowedByLocation
                  ? " 지역 필터를 넓히거나 다른 날짜를 골라보세요."
                  : " 다른 날짜를 골라보세요."}
              </p>
              {myTeams.length ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/teams/${myTeams[0].team.id}/matching`}>우리 팀 매칭 올리기</Link>
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
