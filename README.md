# 11인제 축구 경기 상대 매칭 플랫폼

전체 요구사항은 [`개발계획서.md`](./개발계획서.md) 를 기준으로 하며, 20장의 Phase 순서대로 개발한다.

## 기술 스택

- Next.js 16 (App Router) / TypeScript / Tailwind CSS 4 / shadcn-ui
- Supabase (Auth, Postgres)
- Drizzle ORM + drizzle-kit

## 개발 환경 준비

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

Authentication > Providers 에서 Google, Kakao 를 활성화하고
Redirect URLs 에 `http://localhost:3000/auth/callback` 을 등록한다. (문서 2.1 — 소셜 로그인만 지원)

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
- [ ] Phase 2 — 팀 생성 & 팀원 관리
