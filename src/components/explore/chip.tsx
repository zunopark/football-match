import Link from "next/link";

/** 필터 칩. 링크라서 자바스크립트 없이도 동작한다. */
export function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
          : "rounded-full border border-input px-3 py-1 text-xs hover:bg-muted"
      }
    >
      {children}
    </Link>
  );
}
