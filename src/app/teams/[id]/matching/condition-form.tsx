"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COST_LABEL, COST_TYPES, MATCH_FORMAT } from "@/lib/matching/constants";
import { LEVELS } from "@/lib/teams/level";

import { saveCondition, type ConditionFormState } from "./actions";

const INITIAL_STATE: ConditionFormState = { error: null };

export type ConditionDefaults = {
  id?: string;
  desiredDate?: string;
  desiredTime?: string;
  locationText?: string;
  opponentLevelMin?: number;
  opponentLevelMax?: number;
  costType?: string;
  notes?: string | null;
};

const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring";

/** 문서 F-04-02 — 매칭 구함 활성화 시 입력 항목 */
export function ConditionForm({
  teamId,
  defaults = {},
  onDone,
}: {
  teamId: string;
  defaults?: ConditionDefaults;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCondition, INITIAL_STATE);
  const [min, setMin] = useState(defaults.opponentLevelMin ?? 1);
  const [max, setMax] = useState(defaults.opponentLevelMax ?? 5);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="teamId" value={teamId} />
      {defaults.id ? <input type="hidden" name="conditionId" value={defaults.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="desiredDate">경기 희망 날짜</Label>
          <Input
            id="desiredDate"
            name="desiredDate"
            type="date"
            defaultValue={defaults.desiredDate}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="desiredTime">경기 희망 시간</Label>
          <Input
            id="desiredTime"
            name="desiredTime"
            type="time"
            defaultValue={defaults.desiredTime?.slice(0, 5)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locationText">경기 장소</Label>
        <Input
          id="locationText"
          name="locationText"
          defaultValue={defaults.locationText}
          maxLength={100}
          placeholder="예: 수원월드컵보조구장"
          required
        />
        <p className="text-xs text-muted-foreground">
          장소명이나 주소를 적으면 좌표로 바꿔 주변 팀 추천에 씁니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>원하는 상대 레벨</Label>
        <div className="flex items-center gap-2">
          <select
            name="opponentLevelMin"
            value={min}
            onChange={(event) => {
              const next = Number(event.target.value);
              setMin(next);
              if (next > max) setMax(next);
            }}
            aria-label="상대 레벨 최소"
            className={SELECT_CLASS}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                레벨 {level}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">~</span>
          <select
            name="opponentLevelMax"
            value={max}
            onChange={(event) => {
              const next = Number(event.target.value);
              setMax(next);
              if (next < min) setMin(next);
            }}
            aria-label="상대 레벨 최대"
            className={SELECT_CLASS}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                레벨 {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="costType">경기 비용</Label>
        <select
          id="costType"
          name="costType"
          defaultValue={defaults.costType ?? "negotiable"}
          className={SELECT_CLASS}
        >
          {COST_TYPES.map((cost) => (
            <option key={cost} value={cost}>
              {COST_LABEL[cost]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">기타 협의 사항 (선택)</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaults.notes ?? ""}
          maxLength={300}
          rows={3}
          placeholder="심판 유무, 유니폼 색상 등 미리 알릴 내용을 적어주세요."
        />
      </div>

      {/* 문서 F-04-03 — 경기 방식은 11인제 고정이라 입력받지 않는다. */}
      <p className="text-xs text-muted-foreground">경기 방식은 {MATCH_FORMAT}로 고정입니다.</p>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : defaults.id ? "수정" : "매칭 구하기"}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            취소
          </Button>
        ) : null}
      </div>
    </form>
  );
}
