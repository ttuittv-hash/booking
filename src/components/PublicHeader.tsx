import Link from "next/link";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_LINKS = [
  { href: "/venue", label: "서울아레나 소개" },
  { href: "/guide", label: "대관 안내" },
  { href: "/notices", label: "공지사항" },
  { href: "/faq", label: "FAQ" },
  { href: "/apply", label: "대관 신청" },
];

export function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-8 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>

        <nav className="flex min-w-0 shrink items-center gap-x-6 overflow-x-auto whitespace-nowrap text-[13px] text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap ${link.href === active ? "font-medium text-foreground" : "hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-x-4 text-[13px] text-muted">
          {currentUser ? (
            <>
              <Link
                href={currentUser.role === "ADMIN" ? "/admin/users" : "/mypage/profile"}
                className="hidden whitespace-nowrap underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground sm:inline"
                title="회원정보 수정"
              >
                {currentUser.name} 님
              </Link>
              {currentUser.role === "ADMIN" ? (
                <Link href="/admin" className="whitespace-nowrap hover:text-foreground">
                  운영자 백오피스
                </Link>
              ) : (
                <Link href="/mypage" className="whitespace-nowrap hover:text-foreground">
                  내 신청 내역
                </Link>
              )}
              <NotificationBell role={currentUser.role} />
              <LogoutButton className="whitespace-nowrap hover:text-foreground" />
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap hover:text-foreground">
                로그인
              </Link>
              <Link href="/register" className="whitespace-nowrap hover:text-foreground">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
