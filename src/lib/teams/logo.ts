import { createAdminClient } from "@/lib/supabase/admin";
import { LOGO_EXTENSIONS, LOGO_MAX_BYTES, LOGO_MAX_MB } from "@/lib/teams/logo-limits";

/** 문서 F-02-01 — 팀 로고는 옵셔널. 버킷 설정은 drizzle/0003_teams_rls_and_storage.sql 참고. */
const BUCKET = "team-logos";

export class LogoUploadError extends Error {}

/**
 * 로고 파일을 업로드하고 공개 URL 을 돌려준다. 파일이 비어 있으면 null.
 * 버킷이 public 이라 URL 만 알면 누구나 볼 수 있다 — 팀 프로필과 함께 공개되는 이미지이므로 의도된 것이다.
 */
export async function uploadTeamLogo(teamId: string, file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const extension = LOGO_EXTENSIONS[file.type];
  if (!extension) {
    throw new LogoUploadError("로고는 PNG, JPG, WEBP 파일만 올릴 수 있습니다.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new LogoUploadError(`로고 파일은 ${LOGO_MAX_MB}MB 이하만 올릴 수 있습니다.`);
  }

  // 브라우저·CDN 캐시를 피하려고 파일명에 시각을 붙인다. 이전 파일은 아래에서 정리한다.
  const path = `${teamId}/${Date.now()}.${extension}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new LogoUploadError(`로고 업로드에 실패했습니다: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 팀 로고를 교체하거나 삭제할 때 남은 파일을 정리한다. `keep` 경로는 남긴다. */
export async function removeTeamLogos(teamId: string, keepUrl?: string | null): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(BUCKET).list(teamId);
  if (!data?.length) return;

  const stale = data
    .map((file) => `${teamId}/${file.name}`)
    .filter((path) => !keepUrl?.endsWith(path));
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
}
