"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COST_LABEL, formatDateTab, formatTime } from "@/lib/matching/constants";
import type { CostType } from "@/lib/db/schema";

import { deleteCondition, toggleCondition } from "./actions";
import { ConditionForm } from "./condition-form";

export type ConditionRow = {
  id: string;
  status: "seeking" | "not_seeking";
  desiredDate: string;
  desiredTime: string;
  locationText: string;
  hasCoords: boolean;
  opponentLevelMin: number;
  opponentLevelMax: number;
  costType: CostType;
  notes: string | null;
};

/** 등록한 매칭 조건 한 건. 수정은 같은 자리에서 폼을 펼쳐 처리한다. */
function ConditionItem({ teamId, condition }: { teamId: string; condition: ConditionRow }) {
  const [editing, setEditing] = useState(false);
  const { label, weekday } = formatDateTab(condition.desiredDate);
  const seeking = condition.status === "seeking";

  if (editing) {
    return (
      <li className="rounded-lg border border-input p-4">
        <ConditionForm
          teamId={teamId}
          defaults={condition}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-input p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-base">
          {label}({weekday}) {formatTime(condition.desiredTime)}
        </span>
        <Badge variant={seeking ? "default" : "outline"}>
          {seeking ? "매칭 구함" : "매칭 안 구함"}
        </Badge>
      </div>

      <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
        <dt className="text-muted-foreground">경기 장소</dt>
        <dd>
          {condition.locationText}
          {condition.hasCoords ? null : (
            <span className="ml-1 text-xs text-muted-foreground">
              (좌표를 찾지 못해 활동 지역 기준으로만 노출됩니다)
            </span>
          )}
        </dd>
        <dt className="text-muted-foreground">상대 레벨</dt>
        <dd>
          레벨 {condition.opponentLevelMin}~{condition.opponentLevelMax}
        </dd>
        <dt className="text-muted-foreground">경기 비용</dt>
        <dd>{COST_LABEL[condition.costType]}</dd>
        {condition.notes ? (
          <>
            <dt className="text-muted-foreground">협의 사항</dt>
            <dd className="whitespace-pre-wrap">{condition.notes}</dd>
          </>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          수정
        </Button>
        {/* 문서 F-04-01 — 매칭 구함 / 안 구함 전환 */}
        <form action={toggleCondition}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="conditionId" value={condition.id} />
          {seeking ? null : <input type="hidden" name="seeking" value="on" />}
          <Button type="submit" variant="outline" size="sm">
            {seeking ? "매칭 내리기" : "다시 매칭 구하기"}
          </Button>
        </form>
        <form action={deleteCondition}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="conditionId" value={condition.id} />
          <Button type="submit" variant="destructive" size="sm">
            삭제
          </Button>
        </form>
      </div>
    </li>
  );
}

export function ConditionList({
  teamId,
  conditions,
}: {
  teamId: string;
  conditions: ConditionRow[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {conditions.length ? (
        <ul className="flex flex-col gap-3">
          {conditions.map((condition) => (
            <ConditionItem key={condition.id} teamId={teamId} condition={condition} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          아직 등록한 매칭 조건이 없습니다. 날짜별로 조건을 올리면 메인 화면에 노출됩니다.
        </p>
      )}

      {adding ? (
        <div className="rounded-lg border border-input p-4">
          <ConditionForm teamId={teamId} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button type="button" className="self-start" onClick={() => setAdding(true)}>
          날짜 추가하기
        </Button>
      )}
    </div>
  );
}
