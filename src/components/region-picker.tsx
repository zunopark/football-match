"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRegion, REGION_OPTIONS, type Region } from "@/lib/regions";

const MAX_RESULTS = 30;

/** 공백을 무시하고 비교해 "경기 수원" 처럼 띄어 써도 찾히게 한다. */
function normalize(value: string): string {
  return value.replace(/\s+/g, "");
}

/**
 * 문서 F-02-01 — 활동 지역은 자유 텍스트가 아닌 검색형으로 고른다.
 * 선택 결과는 hidden input 으로 서버 액션에 전달한다.
 */
export function RegionPicker({
  defaultSido,
  defaultSigungu,
}: {
  defaultSido?: string;
  defaultSigungu?: string;
}) {
  const [selected, setSelected] = useState<Region | null>(
    defaultSido && defaultSigungu ? { sido: defaultSido, sigungu: defaultSigungu } : null,
  );
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    return REGION_OPTIONS.filter((region) =>
      normalize(`${region.sido}${region.sigungu}`).includes(needle),
    ).slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="regionSido" value={selected?.sido ?? ""} />
      <input type="hidden" name="regionSigungu" value={selected?.sigungu ?? ""} />

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2">
          <span className="text-sm">{formatRegion(selected.sido, selected.sigungu)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
          >
            변경
          </Button>
        </div>
      ) : (
        // 검색 결과는 폼 높이를 밀어내지 않도록 입력칸 위에 떠 있게 한다.
        <div className="relative">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="지역명 검색 (예: 수원, 강남구)"
            aria-label="활동 지역 검색"
            autoComplete="off"
          />
          {query.trim() ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-input bg-popover text-popover-foreground shadow-lg">
              {matches.length ? (
                matches.map((region) => (
                  <li key={`${region.sido}-${region.sigungu}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => setSelected(region)}
                    >
                      {formatRegion(region.sido, region.sigungu)}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-muted-foreground">검색 결과가 없습니다.</li>
              )}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
