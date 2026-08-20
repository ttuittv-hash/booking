import Link from "next/link";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보 처리방침" },
  { href: "/location", label: "오시는길" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4">
        © 서울아레나. 모든 금액은 부가세 별도이며, 표시 금액은 확정 전 예상치입니다.
      </p>
    </footer>
  );
}
