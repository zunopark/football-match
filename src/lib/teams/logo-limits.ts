/**
 * 문서 F-02-01 팀 로고 제약. 업로드 화면(클라이언트)과 서버 검증이 같은 값을 쓰도록 분리해 둔다.
 * 버킷의 file_size_limit / allowed_mime_types 와 맞춰야 한다 (drizzle/0003_teams_rls_and_storage.sql).
 */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const LOGO_ACCEPT = Object.keys(LOGO_EXTENSIONS).join(",");
export const LOGO_MAX_MB = LOGO_MAX_BYTES / 1024 / 1024;
