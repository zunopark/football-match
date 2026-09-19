"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatLevel, LEVEL_DESCRIPTION, LEVELS } from "@/lib/teams/level";

/**
 * 팀 레벨 배지. 마우스를 올리거나 키보드로 포커스하면 1~5 전체 기준이 뜨고,
 * 이 팀의 레벨이 강조된다 — 상대 팀이 어느 눈금에 있는지 비교해 보라고.
 *
 * 터치 기기에는 hover 가 없어 툴팁이 열리지 않으므로,
 * 팀 프로필의 "팀 레벨" 항목에 해당 레벨 설명을 글로도 함께 보여준다.
 */
export function LevelBadge({ level }: { level: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger type="button" className="cursor-help rounded-full">
          <Badge>{formatLevel(level)}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm items-start">
          <ul className="flex flex-col gap-2 text-left">
            {LEVELS.map((option) => (
              <li key={option} className={option === level ? "" : "opacity-55"}>
                <span className="font-medium">
                  {formatLevel(option)}
                  {option === level ? " · 이 팀" : ""}
                </span>
                <span className="block leading-relaxed">{LEVEL_DESCRIPTION[option]}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
