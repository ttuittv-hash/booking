import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { isMasterAdmin } from "@/lib/auth";
import type { AppUser } from "@/lib/pricing/types";

const LINKS = [
  { href: "/admin", label: "신청 현황", masterOnly: false },
  { href: "/admin/applicants", label: "회원 관리", masterOnly: false },
  { href: "/admin/packages", label: "패키지 관리", masterOnly: false },
  { href: "/admin/rates", label: "요금표 관리", masterOnly: false },
  { href: "/admin/schedule", label: "일정 관리", masterOnly: false },
  { href: "/admin/content", label: "콘텐츠 관리", masterOnly: false },
  { href: "/admin/inquiries", label: "1:1 문의", masterOnly: false },
  { href: "/admin/users", label: "운영자 계정", masterOnly: false },
  // 기능정의서(내부 기획 문서)는 마스터 관리자만 볼 수 있다.
  { href: "/admin/feature-spec", label: "기능정의서", masterOnly: true },
];

// user를 넘기지 않는 호출부는 하위호환을 위해 마스터 전용 메뉴를 숨긴 상태로 렌더링한다.
export function AdminNav({ active, user }: { active: string; user?: AppUser | null }) {
  const master = isMasterAdmin(user ?? null);
  const links = LINKS.filter((link) => !link.masterOnly || master);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border/70 bg-background/80 backdrop-blur-md sm:h-16">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-x-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        <span className="hidden shrink-0 whitespace-nowrap rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted sm:inline-block">
          운영자 백오피스
        </span>
        <nav className="ml-auto flex min-w-0 shrink items-center gap-x-5 overflow-x-auto whitespace-nowrap text-[13px] text-muted">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 whitespace-nowrap ${link.href === active ? "text-foreground" : "hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-4 flex shrink-0 items-center gap-x-4 text-[13px] text-muted">
          <NotificationBell role="ADMIN" />
          <LogoutButton className="whitespace-nowrap hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
