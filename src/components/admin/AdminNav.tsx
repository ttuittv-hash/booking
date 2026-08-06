import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

const LINKS = [
  { href: "/admin", label: "신청 현황" },
  { href: "/admin/applicants", label: "회원 관리" },
  { href: "/admin/packages", label: "패키지 관리" },
  { href: "/admin/rates", label: "요금표 관리" },
  { href: "/admin/schedule", label: "일정 관리" },
  { href: "/admin/content", label: "콘텐츠 관리" },
  { href: "/admin/inquiries", label: "1:1 문의" },
  { href: "/admin/users", label: "운영자 계정" },
];

/**
 * Figma Style Guide › Topbars — 샤프한 헤어라인 바.
 * 활성 항목은 옐로 하단 바 + 검정 텍스트 (옐로는 면·강조에만, 텍스트 색으로 쓰지 않는다).
 * 높이 14/16 은 각 화면의 스티키 탭 바(top-14 sm:top-16)와 맞물려 있으므로 유지한다.
 */
export function AdminNav({ active }: { active: string }) {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border/20 bg-background/95 backdrop-blur-md sm:h-16">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-x-4 px-4 sm:px-6">
        <Link
          href="/"
          className="type-display shrink-0 whitespace-nowrap text-h6-m leading-none"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>
        <span className="hidden shrink-0 whitespace-nowrap border border-border-soft px-2 py-1 text-xs leading-none text-muted sm:inline-block">
          운영자 백오피스
        </span>

        <nav
          aria-label="백오피스 메뉴"
          className="ml-auto flex h-full min-w-0 shrink items-center gap-x-4 overflow-x-auto whitespace-nowrap"
        >
          {LINKS.map((link) => {
            const isActive = link.href === active;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full shrink-0 items-center whitespace-nowrap border-b-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-4 flex shrink-0 items-center gap-x-4 text-xs text-muted">
          <NotificationBell role="ADMIN" />
          <LogoutButton className="whitespace-nowrap font-bold hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
