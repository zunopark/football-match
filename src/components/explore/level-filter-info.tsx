import { InfoIcon } from "lucide-react";

import { LevelGuideTooltip } from "@/components/level-guide-tooltip";

/** 필터의 "레벨" 제목 옆 도움말 아이콘 — 호버하면 레벨 1~5 기준이 뜬다. */
export function LevelFilterInfo() {
  // 아이콘은 작게 두되 호버 영역은 패딩으로 넓힌다 (-m-1 로 자리는 그대로).
  return (
    <LevelGuideTooltip
      side="right"
      triggerClassName="-m-1 cursor-help p-1 text-muted-foreground hover:text-foreground"
    >
      <InfoIcon className="size-3.5" />
      <span className="sr-only">레벨 기준 보기</span>
    </LevelGuideTooltip>
  );
}
