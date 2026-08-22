import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { isMasterAdmin } from "@/lib/auth";
import type { AppUser } from "@/lib/pricing/types";

const LINKS = [
  { href: "/admin", label: "신청 현황", masterOnly: false },
  { href: "/admin/reports", label: "리포트", masterOnly: false },
  { href: "/admin/applicants", label: "회원 관리", masterOnly: false },
  { href: "/admin/packages", label: "패키지 관리", masterOnly: false },
  { href: "/admin/rates", label: "요금표 관리", masterOnly: false },
  { href: "/admin/schedule", label: "일정 관리", masterOnly: false },
  { href: "/admin/content", label: "콘텐츠 관리", masterOnly: false },
  { href: "/admin/notification-rules", label: "알림 관리", masterOnly: false },
  { href: "/admin/inquiries", label: "1:1 문의", masterOnly: false },
  { href: "/admin/users", label: "운영자 계정", masterOnly: false },
  { href: "/admin/account", label: "계정 설정", masterOnly: false },
  // 기능정의서(내부 기획 문서)는 일반 백오피스 메뉴에 넣지 않는다 — 개발자·마스터
  // 관리자만 /admin/feature-spec 주소로 직접 들어간다 (src/app/admin/feature-spec/page.tsx).
];

/**
 * Figma Style Guide › Topbars — 샤프한 헤어라인 바.
 * 활성 항목은 옐로 하단 바 + 검정 텍스트 (옐로는 면·강조에만, 텍스트 색으로 쓰지 않는다).
 * 높이 14/16 은 각 화면의 스티키 탭 바(top-14 sm:top-16)와 맞물려 있으므로 유지한다.
 *
 * user 를 넘기지 않는 호출부는 하위호환을 위해 마스터 전용 메뉴를 숨긴 상태로 렌더링한다.
 */
export function AdminNav({ active, user }: { active: string; user?: AppUser | null }) {
  const master = isMasterAdmin(user ?? null);
  const links = LINKS.filter((link) => !link.masterOnly || master);

  return (
    // 메뉴가 10개라 좁은 화면에서는 로고·알림·로그아웃과 한 줄에 못 넣는다.
    // 예전에는 같은 줄에서 가로 스크롤로 밀어넣었는데 모바일에서 메뉴 폭이 79px 까지
    // 줄어 사실상 못 썼다. lg 미만에서는 메뉴를 아래 줄로 내려 화면 폭을 다 쓰게 한다.
    <header className="sticky top-0 z-20 border-b border-border/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="type-display flex h-full shrink-0 items-center whitespace-nowrap text-h6-m leading-none"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>
        <span className="hidden shrink-0 whitespace-nowrap border border-border-soft px-2 py-1 text-xs leading-none text-muted sm:inline-block">
          운영자 백오피스
        </span>

        <nav
          aria-label="백오피스 메뉴"
          className="ml-auto hidden h-full min-w-0 shrink items-center gap-x-4 overflow-x-auto whitespace-nowrap [contain:paint] lg:flex"
        >
          {links.map((link) => {
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

        <div className="ml-auto flex shrink-0 items-center gap-x-4 text-xs text-muted lg:ml-4">
          <NotificationBell role="ADMIN" />
          <LogoutButton className="whitespace-nowrap font-bold hover:text-foreground" />
        </div>
      </div>

      {/* 좁은 화면 전용 메뉴 줄 — 화면 폭을 다 쓰고 가로 스크롤한다. */}
      <nav
        aria-label="백오피스 메뉴"
        className="flex items-center gap-x-5 overflow-x-auto whitespace-nowrap border-t border-border/15 px-4 [contain:paint] sm:px-6 lg:hidden"
      >
        {links.map((link) => {
          const isActive = link.href === active;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-xs font-bold transition-colors ${
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
    </header>
  );
}
