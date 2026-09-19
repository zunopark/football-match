import { NextResponse } from "next/server";

import { getTeamByJoinToken } from "@/lib/teams/queries";

/**
 * 문서 F-03 — 공유받은 가입 신청 URL.
 * 팀 프로필로 보내면 거기서 가입 신청 버튼을 누를 수 있다 (비로그인이면 로그인 후 되돌아온다).
 */
export async function GET(_request: Request, ctx: RouteContext<"/join/[token]">) {
  const { token } = await ctx.params;
  const team = await getTeamByJoinToken(token);

  const url = team
    ? `/teams/${team.id}`
    : `/?error=${encodeURIComponent("만료되었거나 잘못된 가입 링크입니다.")}`;

  return NextResponse.redirect(new URL(url, _request.url));
}
