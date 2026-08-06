"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { btnClass } from "@/components/ui/kit";

/**
 * IA는 디자인 브랜치 기준을 유지한다 — Notion "(웹사이트) 대관·비즈니스 사이트 구조 기획"
 *   YOUR STAGE · BOOK IT · KNOW IT · HOST IT
 * URL은 옮기지 않고 라벨만 교체한다 — /venue·/guide 경로를 바꾸면 API 라우트와
 * /admin/content 의 콘텐츠 키(home·venue·guide)까지 연쇄 수정이 필요하다.
 * 프로토타입에 있던 하위 항목은 하나도 빼지 않고 유지·이동만 했다.
 *
 * 기본 브랜치에서 새로 생긴 기능은 이 구조 안에 재배치했다.
 *   · 대관료(/guide#rates)  → Book It
 *   · 1:1 문의(/mypage/inquiries) → Know It (고객 지원)
 */
const NAV_LINKS: {
  href: string;
  label: string;
  ko: string;
  children?: { href: string; label: string }[];
}[] = [
  {
    href: "/venue",
    label: "Your Stage",
    ko: "공연장 소개",
    children: [
      { href: "/venue#overview", label: "시설 개요" },
      { href: "/venue#specs", label: "시설 제원" },
      { href: "/venue#stage-features", label: "무대 특장" },
      { href: "/venue#amenities", label: "부대시설" },
    ],
  },
  {
    href: "/guide",
    label: "Book It",
    ko: "대관 안내",
    children: [
      { href: "/guide#overview", label: "대관시스템 개요" },
      { href: "/guide#process", label: "대관 절차" },
      { href: "/packages", label: "대관 패키지" },
      { href: "/guide#rates", label: "대관료" },
      { href: "/guide#rules", label: "대관 규약" },
      { href: "/guide/forms", label: "대관 양식함" },
      { href: "/guide/image-guide", label: "이미지 가이드" },
      { href: "/notices", label: "대관 공지" },
    ],
  },
  {
    href: "/notices",
    label: "Know It",
    ko: "고객 지원",
    children: [
      { href: "/notices", label: "공지사항" },
      { href: "/faq", label: "FAQ" },
      { href: "/mypage/inquiries", label: "1:1 문의" },
    ],
  },
  { href: "/apply", label: "Host It", ko: "대관 신청" },
];

export function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  // 상단 nav는 모바일에서 가로 스크롤이 필요한데, CSS 스펙상 한쪽 축만 auto로 지정해도
  // 다른 축이 함께 auto로 승격되어 세로로 펼치는 드롭다운이 잘려버린다. 그래서 드롭다운은
  // nav 내부 absolute가 아니라 트리거 위치를 계산해 position:fixed로 렌더링한다.
  const [openMenu, setOpenMenu] = useState<{ href: string; top: number; left: number } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  function openNow(href: string, target: HTMLElement) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = target.getBoundingClientRect();
    setOpenMenu({ href, top: rect.bottom + 1, left: rect.left });
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
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const activeChildren = NAV_LINKS.find((link) => link.href === openMenu?.href)?.children;

  return (
    <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
      <div className="container-site flex h-16 items-center gap-x-10 lg:h-[72px]">
        <Link
          href="/"
          className="type-display shrink-0 text-h6-m leading-none sm:text-h6"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>

        {/* 데스크톱 GNB */}
        <nav ref={navRef} aria-label="주요 메뉴" className="hidden min-w-0 items-center gap-x-8 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === active;
            return (
              <div
                key={link.label}
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
                  className={`type-label flex items-center gap-1.5 whitespace-nowrap border-b-2 py-1 text-xs transition-colors ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {link.children && (
                    <span aria-hidden className="text-[9px] opacity-60">
                      ▾
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {openMenu && activeChildren && (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={() => closeSoon()}
            style={{ top: openMenu.top, left: openMenu.left }}
            className="fixed z-40 w-56 animate-[dropdown-in_0.16s_ease-out] border border-border/25 bg-surface py-1.5 shadow-md"
          >
            {activeChildren.map((child) => (
              <Link
                key={child.href + child.label}
                href={child.href}
                onClick={() => setOpenMenu(null)}
                className="block whitespace-nowrap px-4 py-2.5 text-s text-muted transition-colors hover:bg-accent hover:text-on-accent"
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}

        {/* 우측 유틸 */}
        <div className="ml-auto flex shrink-0 items-center gap-x-4 text-xs text-muted">
          <span className="hidden items-center gap-1.5 xl:flex" aria-label="언어">
            <span className="type-label font-bold text-foreground">KOR</span>
            <span aria-hidden className="opacity-40">
              /
            </span>
            <span className="type-label opacity-50" title="영문 페이지 준비 중">
              ENG
            </span>
          </span>

          {currentUser ? (
            <>
              <Link
                href={currentUser.role === "ADMIN" ? "/admin/users" : "/mypage/profile"}
                className="hidden whitespace-nowrap hover:text-foreground sm:inline"
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
              <Link href="/register" className="hidden whitespace-nowrap hover:text-foreground sm:inline">
                회원가입
              </Link>
              <Link href="/apply" className={`${btnClass("primary", "sm")} hidden lg:inline-flex`}>
                대관 신청
              </Link>
            </>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="메뉴"
            className="flex h-8 w-8 items-center justify-center border border-border/30 lg:hidden"
          >
            <span aria-hidden className="text-r leading-none">
              {mobileOpen ? "×" : "≡"}
            </span>
          </button>
        </div>
      </div>

      {/* 모바일 시트 */}
      {mobileOpen && (
        <div className="border-t border-border/20 bg-surface lg:hidden">
          <div className="container-site py-6">
            {NAV_LINKS.map((link) => (
              <div key={link.label} className="border-b border-border/15 py-4 last:border-b-0">
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="type-label flex items-baseline gap-2 text-xs"
                >
                  {link.label}
                  <span className="font-normal normal-case tracking-normal text-muted">
                    {link.ko}
                  </span>
                </Link>
                {link.children && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {link.children.map((c) => (
                      <Link
                        key={c.href + c.label}
                        href={c.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-s text-muted hover:text-foreground"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
