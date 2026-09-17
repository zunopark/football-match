import Link from "next/link";

import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-8">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            이용약관
          </Link>
          <Link href="/privacy" className="font-medium hover:underline">
            개인정보 처리방침
          </Link>
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="text-muted-foreground hover:text-foreground"
          >
            문의하기
          </a>
        </nav>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {SITE.name}은 팀 간 경기 매칭을 중개하는 플랫폼이며 경기의 당사자가 아닙니다. 경기 진행
          및 그 과정에서 발생한 사고·분쟁에 대하여 책임지지 않습니다.
        </p>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
