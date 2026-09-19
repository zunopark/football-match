import { cn } from "@/lib/utils";

const SIZES = { sm: "size-8 text-xs", md: "size-12 text-base", lg: "size-20 text-2xl" };

/** 로고가 없는 팀은 팀명 첫 글자를 원형 아이콘으로 보여준다. (문서 8.1 — 카드에는 사진 대신 로고만) */
export function TeamLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    SIZES[size],
    className,
  );

  if (logoUrl) {
    // 로고는 Supabase Storage 의 임의 경로라 next/image 최적화 대상에서 제외한다.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={`${name} 로고`} className={cn(base, "object-cover")} />;
  }

  return (
    <span className={cn(base, "bg-muted font-medium text-muted-foreground")} aria-hidden>
      {name.slice(0, 1)}
    </span>
  );
}
