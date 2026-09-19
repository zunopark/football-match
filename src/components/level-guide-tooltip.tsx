"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatLevel, LEVEL_DESCRIPTION, LEVELS } from "@/lib/teams/level";

/**
 * 레벨 1~5 기준 설명 툴팁. 마우스를 올리거나 키보드로 포커스하면 뜬다.
 * `highlight` 를 주면 그 레벨만 진하게 보여준다 (팀 프로필의 "이 팀").
 *
 * 터치 기기에는 hover 가 없어 열리지 않으므로, 설명이 꼭 필요한 화면에서는
 * 글로도 함께 보여준다 (팀 프로필의 "팀 레벨" 항목).
 */
export function LevelGuideTooltip({
  children,
  highlight,
  triggerClassName,
  side,
}: {
  children: React.ReactNode;
  highlight?: number;
  triggerClassName?: string;
  /** 설명이 가리면 안 되는 쪽이 있을 때 지정한다. 기본은 Radix 가 알아서 고른다. */
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger type="button" className={triggerClassName}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align="start" className="max-w-sm items-start">
          <ul className="flex flex-col gap-2 text-left">
            {LEVELS.map((option) => (
              <li key={option} className={!highlight || option === highlight ? "" : "opacity-55"}>
                <span className="font-medium">
                  {formatLevel(option)}
                  {option === highlight ? " · 이 팀" : ""}
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
