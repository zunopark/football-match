export const SITE = {
  name: "축구 매칭",
  /** TODO: 실제 운영 문의 이메일로 교체 */
  contactEmail: "support@football-match.kr",
  /** 약관·개인정보 처리방침 시행일 */
  effectiveDate: "2026년 9월 17일",
} as const;

/** 공유 링크처럼 절대 주소가 필요한 곳에서 현재 요청의 origin 을 얻는다. */
export async function getOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
