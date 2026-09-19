"use client";

import { useActionState, useState } from "react";

import { RegionPicker } from "@/components/region-picker";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEVEL_DESCRIPTION, LEVELS } from "@/lib/teams/level";
import { LOGO_ACCEPT, LOGO_MAX_MB } from "@/lib/teams/logo-limits";

import type { TeamFormState } from "./actions";

const INITIAL_STATE: TeamFormState = { error: null };

export type TeamFormDefaults = {
  id?: string;
  name?: string;
  regionSido?: string;
  regionSigungu?: string;
  description?: string;
  level?: number;
  logoUrl?: string | null;
};

/** 문서 F-02-01 / F-02-03 — 팀 생성과 수정이 같은 입력 항목을 쓴다. */
export function TeamForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: TeamFormState, formData: FormData) => Promise<TeamFormState>;
  defaults?: TeamFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  // 고른 레벨의 설명을 바로 보여주려고 선택값을 들고 있는다. (생성 화면은 선택 전이라 0)
  const [level, setLevel] = useState(defaults.level ?? 0);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaults.id ? <input type="hidden" name="teamId" value={defaults.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">팀명</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults.name}
          maxLength={20}
          placeholder="2~20자"
          // 서버에서도 같은 규칙으로 검사한다 (actions.ts NAME_PATTERN)
          pattern="[0-9A-Za-z\uAC00-\uD7A3\u3131-\u318E ]+"
          title="한글, 영어, 숫자와 띄어쓰기만 사용할 수 있습니다."
          required
        />
        <p className="text-xs text-muted-foreground">
          한글·영어·숫자와 띄어쓰기만 쓸 수 있고, 이미 등록된 팀명은 사용할 수 없습니다.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">팀 레벨</legend>
        <div className="flex gap-2">
          {LEVELS.map((option) => (
            <label
              key={option}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-input py-2 text-sm has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
            >
              <input
                type="radio"
                name="level"
                value={option}
                checked={level === option}
                onChange={() => setLevel(option)}
                className="sr-only"
                required
              />
              {option}
            </label>
          ))}
        </div>
        {/*
          설명을 모두 같은 칸에 겹쳐 두고 고른 것만 보이게 한다.
          칸 높이가 가장 긴 설명에 맞춰지므로, 화면이 좁아 줄 수가 달라져도
          레벨을 바꿀 때 폼이 들썩이지 않는다. (invisible = visibility:hidden 이라
          자리는 차지하되 낭독기에는 읽히지 않는다)
        */}
        <div className="grid text-xs leading-relaxed text-muted-foreground">
          {level ? null : (
            <p className="col-start-1 row-start-1">레벨을 선택하면 설명이 표시됩니다.</p>
          )}
          {LEVELS.map((option) => (
            <p
              key={option}
              className={`col-start-1 row-start-1 ${level === option ? "" : "invisible"}`}
            >
              {LEVEL_DESCRIPTION[option]}
            </p>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label>활동 지역</Label>
        <RegionPicker
          defaultSido={defaults.regionSido}
          defaultSigungu={defaults.regionSigungu}
        />
        <p className="text-xs text-muted-foreground">
          시/도 + 시/군/구 단위까지 등록합니다. 매칭 상대 추천에 사용됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="logo">팀 로고 (선택)</Label>
        {defaults.logoUrl ? (
          <div className="flex items-center gap-3">
            <TeamLogo name={defaults.name ?? ""} logoUrl={defaults.logoUrl} />
            <Label htmlFor="removeLogo" className="flex items-center gap-2 font-normal">
              <Checkbox id="removeLogo" name="removeLogo" />
              현재 로고 삭제
            </Label>
          </div>
        ) : null}
        <Input id="logo" name="logo" type="file" accept={LOGO_ACCEPT} />
        <p className="text-xs text-muted-foreground">
          PNG · JPG · WEBP, {LOGO_MAX_MB}MB 이하
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">팀 소개 (선택)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaults.description ?? ""}
          maxLength={500}
          rows={4}
          placeholder="주 활동 요일, 팀 분위기 등을 적어주세요."
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : submitLabel}
      </Button>
    </form>
  );
}
