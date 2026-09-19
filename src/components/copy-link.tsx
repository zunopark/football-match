"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 공유용 가입 신청 URL 복사.
 * 절대 주소는 서버에서 만들어 내려준다 (`getOrigin`).
 *
 * `showUrl` 이면 주소를 보여주는 입력칸과 함께(팀원 관리 화면),
 * 아니면 버튼 하나만 놓는다(팀 메인 화면).
 */
export function CopyLink({
  url,
  showUrl = false,
  label = "가입 신청 링크 복사",
}: {
  url: string;
  showUrl?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없을 때. showUrl 이면 직접 선택해 복사할 수 있다.
      setCopied(false);
    }
  }

  if (!showUrl) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? "복사됨" : label}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        className="font-mono text-xs"
      />
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? "복사됨" : "복사"}
      </Button>
    </div>
  );
}
