import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 키를 쓰는 서버 전용 클라이언트. RLS 를 우회하므로 서버 액션·라우트에서만 사용한다.
 * (팀 로고 업로드처럼 storage 쓰기가 필요한 곳)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
