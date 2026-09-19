import Link from "next/link";

import { TeamLogo } from "@/components/team-logo";
import { Badge } from "@/components/ui/badge";
import { COST_LABEL, formatTime } from "@/lib/matching/constants";
import type { ExploreItem } from "@/lib/matching/queries";
import { formatRegion } from "@/lib/regions";
import { formatLevel } from "@/lib/teams/level";

/**
 * 문서 8.1 리스트 카드 — 사진 없이 로고만, 희망 시간을 크게 강조.
 *
 * 두 줄로 끝낸다: 첫 줄은 팀과 장소, 둘째 줄은 조건 태그.
 * 시각과 로고·팀명이 같은 줄에 놓이도록 양쪽 첫 줄 높이를 h-8(로고 크기)로 맞춘다.
 *
 * 신뢰도 배지는 Phase 7 에서 붙인다.
 */
export function MatchCard({ item }: { item: ExploreItem }) {
  const { condition, team, distanceKm } = item;

  return (
    <li>
      <Link
        href={`/teams/${team.id}`}
        className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-foreground/10 hover:bg-muted/50"
      >
        <div className="w-14 shrink-0 text-center">
          <span className="flex h-8 items-center justify-center font-heading text-lg leading-none">
            {formatTime(condition.desiredTime)}
          </span>
          {distanceKm === null ? null : (
            <span className="block text-xs text-muted-foreground">{distanceKm.toFixed(1)}km</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex h-8 min-w-0 items-center gap-2">
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
            <span className="shrink-0 text-sm font-medium">{team.name}</span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {condition.locationText} · {formatRegion(team.regionSido, team.regionSigungu)}
            </span>
            {condition.status === "not_seeking" ? (
              <Badge variant="outline" className="shrink-0">
                매칭 내림
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{formatLevel(team.level)}</Badge>
            <Badge variant="outline">
              상대 희망 {condition.opponentLevelMin}~{condition.opponentLevelMax}
            </Badge>
            <Badge variant="outline">{COST_LABEL[condition.costType]}</Badge>
          </div>
        </div>
      </Link>
    </li>
  );
}
