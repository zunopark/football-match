import Link from "next/link";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← 홈으로
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}
