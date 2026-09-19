import type { Coords } from "./constants";

const KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json";

type KakaoDoc = { x: string; y: string };
type KakaoResponse = { documents?: KakaoDoc[] };

async function search(url: string, query: string): Promise<Coords | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;

  const response = await fetch(`${url}?query=${encodeURIComponent(query)}&size=1`, {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!response.ok) return null;

  const [doc] = ((await response.json()) as KakaoResponse).documents ?? [];
  if (!doc) return null;

  // 카카오는 x=경도, y=위도 로 내려준다.
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * 문서 7.1 — 경기 장소를 좌표로 바꿔 GPS 반경 추천에 쓴다.
 *
 * 장소명("수원월드컵경기장")이 먼저고, 안 잡히면 주소로 한 번 더 시도한다.
 * 실패하면 null 을 돌려주고 호출부는 그대로 진행한다 — 좌표가 없어도
 * F-05-02 의 "활동 지역(시/군) 일치" 조건으로 노출되기 때문이다.
 *
 * 카카오 콘솔에서 [카카오맵] 서비스가 꺼져 있으면 항상 null 이다.
 */
export async function geocodePlace(query: string): Promise<Coords | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    return (await search(KEYWORD_URL, trimmed)) ?? (await search(ADDRESS_URL, trimmed));
  } catch {
    // 지오코딩은 부가 기능이라 네트워크 실패로 조건 등록을 막지 않는다.
    return null;
  }
}

/** 두 좌표 사이 거리(km). 반경 필터용이라 하버사인이면 충분하다. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
