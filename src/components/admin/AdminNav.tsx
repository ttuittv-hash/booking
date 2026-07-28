import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

const LINKS = [
  { href: "/admin", label: "신청 현황" },
  { href: "/admin/rates", label: "요금표 관리" },
  { href: "/admin/users", label: "운영자 계정" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
          운영자 백오피스
        </span>
        <nav className="ml-auto flex items-center gap-5 text-[13px] text-muted">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.href === active ? "text-foreground" : "hover:text-foreground"}
            >
              {link.label}
            </Link>
          ))}
          <NotificationBell role="ADMIN" />
          <LogoutButton className="hover:text-foreground" />
        </nav>
      </div>
    </header>
  );
}
