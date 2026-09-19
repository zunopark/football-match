import { LevelGuideTooltip } from "@/components/level-guide-tooltip";
import { Badge } from "@/components/ui/badge";
import { formatLevel } from "@/lib/teams/level";

/**
 * 팀 레벨 배지. 호버·포커스하면 1~5 전체 기준이 뜨고 이 팀 레벨이 강조된다 —
 * 상대 팀이 어느 눈금에 있는지 비교해 보라고.
 */
export function LevelBadge({ level }: { level: number }) {
  return (
    <LevelGuideTooltip highlight={level} triggerClassName="cursor-help rounded-full">
      <Badge>{formatLevel(level)}</Badge>
    </LevelGuideTooltip>
  );
}
