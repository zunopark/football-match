import { Chip } from "@/components/explore/chip";
import { GpsButton } from "@/components/explore/gps-button";
import { LevelFilterInfo } from "@/components/explore/level-filter-info";
import {
  COST_LABEL,
  FILTER_COST_TYPES,
  RADIUS_OPTIONS,
  TIME_PRESETS,
} from "@/lib/matching/constants";
import {
  toggledHref,
  withHref,
  type ExploreParams,
} from "@/lib/matching/search-params";
import { REGIONS } from "@/lib/regions";
import { LEVELS } from "@/lib/teams/level";

const SIDO_LIST = Object.keys(REGIONS);

function Group({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1 text-sm font-medium">
        {title}
        {action}
      </h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

/**
 * 문서 8.1 좌측 필터 패널 — 지역(시/도 칩) / 시간대 / 레벨 / 비용 + GPS 반경.
 * 칩은 전부 링크라 자바스크립트 없이도 동작한다. GPS 만 클라이언트 컴포넌트다.
 */
export function FilterPanel({
  params,
  defaultDate,
}: {
  params: ExploreParams;
  defaultDate: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Group title="내 주변">
        <GpsButton active={Boolean(params.coords)} />
      </Group>

      {params.coords ? (
        <Group title="반경">
          {RADIUS_OPTIONS.map((radius) => (
            <Chip
              key={radius}
              href={withHref(params, defaultDate, { radiusKm: radius })}
              active={params.radiusKm === radius}
            >
              {radius}km
            </Chip>
          ))}
        </Group>
      ) : null}

      <Group title="지역">
        {SIDO_LIST.map((sido) => (
          <Chip
            key={sido}
            href={toggledHref(params, defaultDate, "sido", sido)}
            active={params.sido.includes(sido)}
          >
            {sido.replace(/(특별자치시|특별자치도|특별시|광역시|자치도)$/, "")}
          </Chip>
        ))}
      </Group>

      <Group title="시간">
        {TIME_PRESETS.map((preset) => (
          <Chip
            key={preset.value}
            href={withHref(params, defaultDate, {
              timePreset: params.timePreset === preset.value ? undefined : preset.value,
            })}
            active={params.timePreset === preset.value}
          >
            {preset.label}
          </Chip>
        ))}
      </Group>

      <Group title="레벨" action={<LevelFilterInfo />}>
        {LEVELS.map((level) => (
          <Chip
            key={level}
            href={toggledHref(params, defaultDate, "levels", level)}
            active={params.levels.includes(level)}
          >
            레벨 {level}
          </Chip>
        ))}
      </Group>

      <Group title="경기 비용">
        {FILTER_COST_TYPES.map((cost) => (
          <Chip
            key={cost}
            href={toggledHref(params, defaultDate, "costs", cost)}
            active={params.costs.includes(cost)}
          >
            {COST_LABEL[cost]}
          </Chip>
        ))}
      </Group>
    </div>
  );
}
