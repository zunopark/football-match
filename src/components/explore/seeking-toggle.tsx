import { Chip } from "@/components/explore/chip";
import { withHref, type ExploreParams } from "@/lib/matching/search-params";

/**
 * 문서 8.1 — 레퍼런스의 "마감 가리기" 를 대체하는 "매칭 구함만 보기" 토글.
 * 날짜 탭 바로 아래, 리스트와 같은 열에 둔다.
 */
export function SeekingToggle({
  params,
  defaultDate,
}: {
  params: ExploreParams;
  defaultDate: string;
}) {
  return (
    <Chip
      href={withHref(params, defaultDate, { includePaused: !params.includePaused })}
      active={!params.includePaused}
    >
      매칭 구함만 보기
    </Chip>
  );
}
