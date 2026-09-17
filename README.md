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
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | 어드민 공유 계정 1개 (문서 15.2) |

> `db.<ref>.supabase.co` 직결 주소는 IPv6 전용이라 IPv4 환경에서는 연결되지 않는다.
> `DIRECT_URL` 에는 Session pooler 주소(`...pooler.supabase.com:5432`)를 사용한다.

### Supabase Auth 설정

문서 2.1 에 따라 소셜 로그인(구글/카카오)만 지원한다.

1. Supabase > Authentication > Providers 에서 Google, Kakao 활성화
2. Supabase > Authentication > URL Configuration > Redirect URLs 에
   `http://localhost:3000/auth/callback` 등록

#### 카카오 개발자 콘솔 설정

Supabase 는 카카오 인가 요청 시 `account_email profile_image profile_nickname` 세 가지 scope 를
**항상** 요청한다. (`signInWithOAuth` 의 `scopes` 옵션은 기본 scope 를 대체하지 않고 덧붙이기만 하므로
코드로 제거할 수 없다.) 따라서 아래 동의항목이 모두 설정되어 있어야 하며, 하나라도 빠지면 `KOE205` 가 발생한다.

1. [카카오 로그인] > 활성화 설정 ON
2. [카카오 로그인] > Redirect URI 에 `https://<프로젝트 ref>.supabase.co/auth/v1/callback` 등록
3. [카카오 로그인] > 동의항목에서 아래 3개를 **선택 동의** 이상으로 설정
   - 닉네임 (`profile_nickname`)
   - 프로필 사진 (`profile_image`)
   - 카카오계정(이메일) (`account_email`) — 필수 동의로 설정하려면 비즈니스 앱 전환 필요
4. [앱 설정] > 플랫폼 > Web 사이트 도메인에 `http://localhost:3000` 등록

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
- [ ] Phase 2 — 팀 생성 & 팀원 관리

> 약관·개인정보 처리방침은 일반적인 국내 플랫폼 서비스 구성을 따른 초안이며 법률 검토를 거치지 않았다.
> 서비스명·문의처·시행일은 `src/lib/site.ts` 에서 관리한다.
