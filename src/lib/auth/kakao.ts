/**
 * 카카오 로그인 직접 연동 (문서 2.1)
 *
 * Supabase 의 카카오 기본 플로우는 `account_email profile_image profile_nickname` scope 를 항상 요청하고,
 * `signInWithOAuth` 의 `scopes` 옵션은 기본 scope 를 대체하지 않고 덧붙이기만 한다.
 * 비즈니스 앱 전환 전에는 `account_email` 동의항목에 권한이 없어 KOE205 로 실패하므로,
 * 인가 요청과 토큰 교환만 직접 수행하고 발급받은 OIDC id_token 으로 Supabase 세션을 만든다.
 */
const AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
const TOKEN_URL = "https://kauth.kakao.com/oauth/token";

/** 이메일 없이 회원 식별과 프로필 표시에 필요한 최소 scope */
const SCOPES = ["openid", "profile_nickname", "profile_image"].join(" ");

export const KAKAO_STATE_COOKIE = "kakao_oauth_state";

function restApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY 가 설정되지 않았습니다.");
  return key;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: restApiKey(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });

  return `${AUTHORIZE_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey(),
    redirect_uri: redirectUri,
    code,
  });

  // [카카오 로그인] > 보안 에서 Client Secret 을 사용하는 경우에만 필요
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (clientSecret) body.set("client_secret", clientSecret);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const payload = await response.json();

  if (!response.ok) {
    // KOE010 — client_id/client_secret 불일치.
    // 카카오 앱이 Client Secret 을 사용 중인데 KAKAO_CLIENT_SECRET 이 비어 있는 경우가 대부분이다.
    if (payload.error_code === "KOE010") {
      throw new Error(
        "카카오 인증 정보가 올바르지 않습니다. 카카오 개발자 콘솔 [카카오 로그인] > 보안 의 " +
          "Client Secret 을 .env 의 KAKAO_CLIENT_SECRET 에 설정했는지 확인해주세요.",
      );
    }
    throw new Error(payload.error_description ?? payload.error ?? "카카오 토큰 발급에 실패했습니다.");
  }
  if (!payload.id_token) {
    throw new Error(
      "카카오 id_token 이 없습니다. 카카오 개발자 콘솔에서 OpenID Connect 를 활성화해주세요.",
    );
  }

  return { idToken: payload.id_token as string, accessToken: payload.access_token as string };
}
