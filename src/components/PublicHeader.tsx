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
  {
    href: "/venue",
    label: "SEOUL ARENA",
    children: [
      { href: "/venue#overview", label: "시설 개요" },
      { href: "/venue#specs", label: "시설 제원" },
      { href: "/venue#stage-features", label: "무대 특장" },
      { href: "/venue#amenities", label: "부대시설" },
    ],
  },
  {
    href: "/guide",
    label: "대관 안내",
    children: [
      { href: "/notices", label: "대관공지" },
      { href: "/guide#process", label: "대관절차" },
      { href: "/packages", label: "대관료" },
      { href: "/guide#rules", label: "대관규약" },
      { href: "/guide/forms", label: "대관양식함" },
      { href: "/guide/image-guide", label: "이미지가이드" },
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
  // 상단 nav는 모바일에서 가로 스크롤(overflow-x-auto)이 필요한데, CSS 스펙상 한쪽 축만
  // auto로 지정해도 다른 축이 함께 auto로 승격되어 세로로 펼치는 드롭다운이 잘려버린다.
  // 그래서 드롭다운은 nav 내부에 absolute로 두지 않고, 트리거 위치를 계산해 position:fixed로
  // 렌더링해 nav의 overflow 밖으로 완전히 빼낸다.
  const [openMenu, setOpenMenu] = useState<{ href: string; top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  function openNow(href: string, target: HTMLElement) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = target.getBoundingClientRect();
    setOpenMenu({ href, top: rect.bottom + 8, left: rect.left });
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
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

  const activeChildren = NAV_LINKS.find((link) => link.href === openMenu?.href)?.children;

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-8 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-[20px] font-bold tracking-tight sm:text-[22px]">
          SEOUL ARENA
        </Link>

        <nav ref={navRef} className="flex min-w-0 shrink items-center gap-x-6 overflow-x-auto whitespace-nowrap text-[13px] text-muted">
          {NAV_LINKS.map((link) => (
            <div
              key={link.href}
              onMouseEnter={(e) => link.children && openNow(link.href, e.currentTarget)}
              onMouseLeave={() => link.children && closeSoon()}
            >
              <Link
                href={link.href}
                onClick={(e) => {
                  if (link.children) {
                    if (openMenu?.href === link.href) return;
                    e.preventDefault();
                    openNow(link.href, e.currentTarget.parentElement as HTMLElement);
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
            </div>
          ))}
        </nav>

        {openMenu && activeChildren && (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={() => closeSoon()}
            style={{ top: openMenu.top, left: openMenu.left }}
            className="fixed z-30 w-44 border border-border bg-background py-1.5 shadow-sm"
          >
            {activeChildren.map((child) => (
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
