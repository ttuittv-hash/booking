"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_LINKS: {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}[] = [
  { href: "/venue", label: "서울아레나 소개" },
  {
    href: "/guide",
    label: "대관 안내",
    children: [
      { href: "/guide#process", label: "대관 절차" },
      { href: "/packages", label: "대관 패키지 구성" },
      { href: "/guide#rules", label: "대관 규약" },
      { href: "/notices", label: "공지사항" },
      { href: "/faq", label: "FAQ" },
    ],
  },
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  function openNow(href: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(href);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 150);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-8 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>

        <nav ref={navRef} className="flex min-w-0 shrink items-center gap-x-6 overflow-x-auto whitespace-nowrap text-[13px] text-muted">
          {NAV_LINKS.map((link) => (
            <div
              key={link.href}
              className="relative"
              onMouseEnter={() => link.children && openNow(link.href)}
              onMouseLeave={() => link.children && closeSoon()}
            >
              <Link
                href={link.href}
                onClick={(e) => {
                  if (link.children) {
                    if (openMenu === link.href) return;
                    e.preventDefault();
                    openNow(link.href);
                  }
                }}
                className={`flex items-center gap-1 whitespace-nowrap ${link.href === active ? "font-medium text-foreground" : "hover:text-foreground"}`}
              >
                {link.label}
                {link.children && (
                  <span aria-hidden className="text-[10px] text-muted/70">
                    ›
                  </span>
                )}
              </Link>

              {link.children && openMenu === link.href && (
                <div
                  onMouseEnter={() => openNow(link.href)}
                  onMouseLeave={() => closeSoon()}
                  className="absolute left-full top-1/2 z-30 ml-2 w-44 -translate-y-1/2 border border-border bg-background py-1.5 shadow-sm"
                >
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpenMenu(null)}
                      className="block whitespace-nowrap px-4 py-2 text-[13px] text-muted hover:bg-panel hover:text-foreground"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
