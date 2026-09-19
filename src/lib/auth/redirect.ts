/**
 * 문서 2.2 — 비로그인 상태에서 액션을 시도하면 항상 로그인/회원가입 페이지로 보낸다.
 * 이후 Phase 에서 생기는 모든 "비로그인 → 액션" 케이스가 이 모듈을 거치게 한다.
 *
 * 서버 전용 API 를 쓰지 않는 부분만 모아 두어 클라이언트 컴포넌트에서도 import 할 수 있다.
 * 세션이 필요한 쪽은 `./guard` 를 쓴다.
 */
export const POST_LOGIN_REDIRECT_COOKIE = "post_login_redirect";

/**
 * 로그인 후 돌아갈 경로. 오픈 리다이렉트를 막기 위해 같은 출처의 절대 경로만 허용한다.
 * (`//evil.com` 는 브라우저가 프로토콜 상대 URL 로 해석하므로 함께 막는다.)
 */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function loginUrl(next?: string | null): string {
  const safe = sanitizeNext(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
