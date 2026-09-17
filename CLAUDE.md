@AGENTS.md

# 사업자 등록 후 잔여 작업

사업자 등록 및 각 플랫폼의 비즈니스 인증을 완료해야만 해결할 수 있는 항목을 여기서 관리한다.
개발 단계에서는 우회 구현으로 대응하고, 인증이 끝나면 이 문서를 기준으로 원복·전환한다.

| # | 항목 | 필요 조건 | 상태 |
| --- | --- | --- | --- |
| 1 | 카카오 로그인 `account_email` 권한 없음 | 비즈앱 전환 + 비즈니스 인증 | 우회 구현으로 대응 중 |

---

## 1. 카카오 로그인 — `account_email` 권한 없음

**기록일**: 2026-09-17 (Phase 1)

### 현상

카카오 로그인 시도 시 카카오 인증 화면에서 아래 에러가 발생하며 로그인이 불가능했다.

```
잘못된 요청 (KOE205)
설정하지 않은 카카오 로그인 동의 항목을 포함해 인가 코드를 요청했습니다.
설정하지 않은 동의 항목: account_email, profile_image, profile_nickname
```

카카오 개발자 콘솔 [카카오 로그인] > 동의항목 상태:

| 이름 | ID | 상태 |
| --- | --- | --- |
| 닉네임 | `profile_nickname` | 선택 동의 |
| 프로필 사진 | `profile_image` | 선택 동의 |
| 카카오계정(이메일) | `account_email` | **권한 없음** |

### 원인

- Supabase 의 카카오 provider 는 `account_email profile_image profile_nickname` 세 가지 scope 를 **항상** 요청한다.
- `signInWithOAuth` 의 `scopes` 옵션은 기본 scope 를 **대체하지 않고 덧붙이기만** 한다. 따라서 코드로 `account_email` 을 제거할 수 없다.

  실측 결과:

  ```
  scopes 미지정                             → scope=account_email+profile_image+profile_nickname
  scopes="profile_nickname profile_image"  → scope=account_email+profile_image+profile_nickname+profile_nickname+profile_image
  ```

- **카카오 로그인 시 `account_email`(카카오계정 이메일) 권한이 "권한 없음"으로 나오는 문제는 앱을 비즈앱(BizApp)으로 전환하고 비즈니스 인증을 완료해야 해결할 수 있습니다.** 비즈니스 인증에는 사업자 등록이 선행되어야 한다.

### 현재 우회 구현 (커밋 `4187e9d`)

카카오만 Supabase 의 authorize 엔드포인트를 거치지 않고 직접 연동한다. 구글은 기존 `signInWithOAuth` 경로를 그대로 사용한다.

```
[카카오 버튼] → /auth/kakao
                 scope=openid profile_nickname profile_image 로 인가 요청
                 state 를 httpOnly 쿠키에 저장 (CSRF 방어)
              → 카카오 로그인/동의
              → /auth/kakao/callback
                 state 검증 → 토큰 교환 → id_token 획득
                 supabase.auth.signInWithIdToken({ provider: "kakao" })
                 → Supabase 세션 생성 → users 동기화
```

| 파일 | 역할 |
| --- | --- |
| `src/lib/auth/kakao.ts` | authorize URL 생성, 토큰 교환 |
| `src/app/auth/kakao/route.ts` | 인가 요청 시작 + state 쿠키 발급 |
| `src/app/auth/kakao/callback/route.ts` | state 검증 → 토큰 교환 → 세션 생성 |

우회 구현에 필요한 추가 설정:

- 카카오 콘솔 [카카오 로그인] > **OpenID Connect 활성화** (없으면 `id_token` 미발급)
- 카카오 콘솔 [카카오 로그인] > Redirect URI 에 `{origin}/auth/kakao/callback` 등록
- `.env` 의 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`

### 인증 완료 후 할 일

1. 카카오 콘솔에서 비즈앱 전환 및 비즈니스 인증 완료 → [카카오 로그인] > 동의항목에서 `account_email` 을 선택 동의 이상으로 설정
2. `src/app/login/social-login-buttons.tsx` 의 카카오 링크를 구글과 동일하게 `signInWithOAuth({ provider: "kakao" })` 로 되돌린다
3. 아래 파일 삭제
   - `src/lib/auth/kakao.ts`
   - `src/app/auth/kakao/route.ts`
   - `src/app/auth/kakao/callback/route.ts`
4. `.env` / `.env.example` 에서 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET` 제거
5. 카카오 콘솔 Redirect URI 에서 `{origin}/auth/kakao/callback` 제거
6. README 의 "카카오 개발자 콘솔 설정" 항목을 축소된 절차로 갱신
7. 기존 카카오 가입 회원의 `auth.users` 레코드가 유지되는지 확인 — 동일 provider(`kakao`) + 동일 `sub` 이면 유지되지만, 전환 후 첫 로그인 시 실제로 검증할 것

> 전환은 필수가 아니다. 서비스가 이메일을 수집·이용하지 않는다면 현재 우회 구현을 그대로 유지해도 된다.
> 우회 구현 쪽이 요청 scope 가 더 적어 개인정보 최소 수집 원칙에는 오히려 부합한다.
> 개인정보 처리방침(`src/app/(legal)/privacy/page.tsx`)의 카카오 수집 항목은 우회 구현에 맞춰
> 이메일을 제외한 상태다. 비즈앱 전환으로 이메일을 수집하게 되면 해당 문구를 다시 추가해야 한다.

---

## 신규 항목 추가 형식

```markdown
## N. <항목명>

**기록일**: YYYY-MM-DD (Phase N)

### 현상
### 원인
### 현재 우회 구현 (커밋 `xxxxxxx`)
### 인증 완료 후 할 일
```
