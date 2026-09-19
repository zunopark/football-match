"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 문서 7.1 — 접속 시점 GPS 좌표로 주변 팀을 추천한다.
 * 좌표는 URL 에만 싣고 서버로 저장하지 않는다.
 */
export function GpsButton({ active }: { active: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply(next: URLSearchParams) {
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  function clear() {
    const next = new URLSearchParams(searchParams);
    next.delete("lat");
    next.delete("lng");
    next.delete("radius");
    apply(next);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    setPending(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = new URLSearchParams(searchParams);
        next.set("lat", position.coords.latitude.toFixed(5));
        next.set("lng", position.coords.longitude.toFixed(5));
        setPending(false);
        apply(next);
      },
      () => {
        // 문서 7.1 — 거부해도 활동 지역 기준으로 계속 볼 수 있다.
        setPending(false);
        setError("위치를 가져오지 못했습니다. 활동 지역 기준으로 보여집니다.");
      },
      { timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={active ? "default" : "outline"}
        onClick={active ? clear : locate}
        disabled={pending}
      >
        {pending ? "위치 확인 중…" : active ? "내 주변 끄기" : "내 주변 보기"}
      </Button>
      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
    </div>
  );
}
