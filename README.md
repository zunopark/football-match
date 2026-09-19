# 11인제 축구 경기 상대 매칭 플랫폼

전체 요구사항은 [`개발계획서.md`](./개발계획서.md) 를 기준으로 하며, 20장의 Phase 순서대로 개발한다.

## 기술 스택

- Next.js 16 (App Router) / TypeScript / Tailwind CSS 4 / shadcn-ui
- Supabase (Auth, Postgres)
- Drizzle ORM + drizzle-kit

## 개발 환경 준비

Node.js **22 이상**이 필요하다. (`@supabase/supabase-js` 가 Node 20 이하 지원을 중단했고,
Node 스크립트 실행 시 native WebSocket 이 필요하다.)

```bash
npm install
cp .env.example .env   # 값 입력
npm run db:migrate     # 스키마 반영
npm run dev            # http://localhost:3000
```

### 환경변수

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저·서버 공용 Supabase 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리 작업 |
| `DATABASE_URL` | 앱 런타임 DB 접속 (Transaction pooler, 6543) |
| `DIRECT_URL` | 마이그레이션용 DB 접속 (Session pooler, 5432) |
| `KAKAO_REST_API_KEY` / `KAKAO_CLIENT_SECRET` | 카카오 직접 연동 (아래 카카오 설정 참고) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | 어드민 공유 계정 1개 (문서 15.2) |

> `db.<ref>.supabase.co` 직결 주소는 IPv6 전용이라 IPv4 환경에서는 연결되지 않는다.
> `DIRECT_URL` 에는 Session pooler 주소(`...pooler.supabase.com:5432`)를 사용한다.

### Supabase Auth 설정

문서 2.1 에 따라 소셜 로그인(구글/카카오)만 지원한다.

1. Supabase > Authentication > Providers 에서 Google, Kakao 활성화
2. Supabase > Authentication > URL Configuration > Redirect URLs 에
   `http://localhost:3000/auth/callback` 등록

#### 카카오 개발자 콘솔 설정

Supabase 의 카카오 기본 플로우는 `account_email profile_image profile_nickname` scope 를 **항상** 요청한다.
(`signInWithOAuth` 의 `scopes` 옵션은 기본 scope 를 대체하지 않고 덧붙이기만 해 코드로 제거할 수 없다.)
`account_email` 은 비즈니스 앱 전환 전에는 "권한 없음" 상태라 `KOE205` 가 발생한다.

그래서 카카오만 Supabase 의 authorize 엔드포인트를 거치지 않고 직접 연동한다.
인가 요청과 토큰 교환을 `src/lib/auth/kakao.ts` 에서 수행하고,
발급받은 OIDC `id_token` 으로 `supabase.auth.signInWithIdToken({ provider: "kakao" })` 를 호출해 세션을 만든다.
요청 scope 는 `openid profile_nickname profile_image` 뿐이라 이메일 동의항목이 필요 없다.

카카오 개발자 콘솔에서 아래를 설정한다.

1. [카카오 로그인] > 활성화 설정 ON
2. [카카오 로그인] > **OpenID Connect 활성화 설정 ON** — 이게 꺼져 있으면 `id_token` 이 발급되지 않는다
3. [카카오 로그인] > Redirect URI 에 `http://localhost:3000/auth/kakao/callback` 등록
4. [카카오 로그인] > 동의항목에서 닉네임(`profile_nickname`), 프로필 사진(`profile_image`) 을 선택 동의 이상으로 설정
   (`account_email` 은 설정하지 않아도 된다)
5. [앱 설정] > 앱 키 > REST API 키를 `.env` 의 `KAKAO_REST_API_KEY` 에 입력
6. [카카오 로그인] > 보안 의 Client Secret 을 `.env` 의 `KAKAO_CLIENT_SECRET` 에 입력
   (활성화 상태가 "사용함" 이면 필수. 빠지면 토큰 교환이 `KOE010 Bad client credentials` 로 실패한다)

설정이 맞는지는 더미 code 로 토큰 엔드포인트를 때려 확인할 수 있다.
`KOE010` 이면 자격 증명이 틀린 것이고, `KOE320`(invalid_grant) 이면 자격 증명은 정상이다.

```bash
source .env && curl -s -X POST https://kauth.kakao.com/oauth/token \
  -d grant_type=authorization_code \
  -d client_id=$KAKAO_REST_API_KEY \
  -d client_secret=$KAKAO_CLIENT_SECRET \
  -d redirect_uri=http://localhost:3000/auth/kakao/callback \
  -d code=dummy
```

> 비즈니스 앱 전환 후 `account_email` 권한을 받으면 이 우회 구현을 제거하고
> 구글과 동일하게 `signInWithOAuth` 로 되돌릴 수 있다.

### 카카오 로컬 API (경기 장소 좌표)

매칭 조건의 경기 장소를 좌표로 바꿔 GPS 반경 추천(문서 7.1)에 쓴다.
카카오 개발자 콘솔 **[내 애플리케이션] > [제품 설정] > [카카오맵]** 을 **활성화 ON** 해야 한다.
꺼져 있으면 아래처럼 응답하고, 이때는 좌표 없이 저장되어 활동 지역 기준으로만 노출된다(기능은 계속 동작한다).

```
{"errorType":"NotAuthorizedError","message":"App(...) disabled OPEN_MAP_AND_LOCAL service."}
```

설정이 끝났는지는 아래로 확인한다. `documents` 에 좌표가 나오면 정상이다.

```bash
source .env && curl -s -G https://dapi.kakao.com/v2/local/search/keyword.json \
  --data-urlencode "query=수원월드컵경기장" \
  -H "Authorization: KakaoAK $KAKAO_REST_API_KEY"
```

### 팀 로고 스토리지

팀 로고는 Supabase Storage 의 `team-logos` 공개 버킷에 올라간다.
버킷과 읽기 정책은 `drizzle/0003_teams_rls_and_storage.sql` 이 만들므로 `npm run db:migrate` 외에 콘솔 작업은 없다.
업로드·삭제는 `SUPABASE_SERVICE_ROLE_KEY` 로만 수행한다.

### 어드민 비밀번호

```bash
npm run admin:hash     # 출력된 값을 .env 의 ADMIN_PASSWORD_HASH 에 입력
npm run admin:verify   # 저장된 해시와 비밀번호가 일치하는지 확인
```

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run db:generate` | 스키마 변경 → 마이그레이션 파일 생성 |
| `npm run db:migrate` | 마이그레이션 적용 |
| `npm run db:studio` | Drizzle Studio |

## 진행 상황

- [x] **Phase 1 — 프로젝트 기반 & 인증**: 프로젝트 초기화, Supabase 연결, Drizzle 마이그레이션 환경, 구글·카카오 로그인, `users` 동기화
- [x] 이용약관 / 개인정보 처리방침 페이지 및 공통 푸터
- [x] **Phase 2 — 팀 생성 & 팀원 관리** (2026-09-19)
  - 팀 생성·수정·비활성화·삭제, 팀 프로필(비로그인 조회 가능)
  - 활동 지역 검색형 선택(시/도 + 시/군/구), 팀 레벨 1~5, 팀 로고 업로드(Supabase Storage)
  - 가입 신청 링크 발급·재발급 → 신청 → 승인/거절, 대표 권한 위임, 팀 나가기
  - 역할(대표 / 운영진 / 팀원)별 접근 제어, 비로그인 → 로그인 유도 공통 모듈
- [x] **Phase 3 — 매칭 조건 & 메인 탐색 화면** (2026-09-19)
  - 날짜별 매칭 조건 등록·수정·구함/내림 전환, 원하는 상대 레벨·비용·협의 사항
  - 메인 탐색 화면: 날짜 탭(2주) + 지역/시간대/레벨/비용 필터 + 리스트 (비로그인 조회 가능)
  - GPS 반경(기본 30km, 조절 가능) OR 활동 지역 일치 노출, 가까운 순 정렬
- [ ] Phase 4 — 매칭 신청 플로우

> 팀 역할은 DB 값 `owner` / `manager` / `member` 를 화면에서 **대표 / 운영진 / 팀원** 으로 표기한다.
> 라벨은 `src/lib/teams/permissions.ts` 의 `ROLE_LABEL` 한 곳에서만 정의한다.

> 약관·개인정보 처리방침은 일반적인 국내 플랫폼 서비스 구성을 따른 초안이며 법률 검토를 거치지 않았다.
> 서비스명·문의처·시행일은 `src/lib/site.ts` 에서 관리한다.
