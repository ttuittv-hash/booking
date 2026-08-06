"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { btnClass } from "@/components/ui/kit";

/**
 * Figma Wireframe › Navbar / 2 ("open menu").
 * 닫힌 상태는 로고 + 햄버거만. 누르면 풀페이지 메뉴가 열린다.
 *
 * 메뉴는 실제로 존재하는 페이지와 1:1로 맞춘다.
 * 한 페이지 안의 섹션(시설 개요·제원·무대특장·부대시설, 대관 개요·절차·대관료·규약)은
 * 메뉴에 올리지 않는다 — 페이지 안에서 스크롤로 닿는 것들이다.
 */
type NavItem = {
  label: string;
  ko: string;
  href?: string;
  children?: { href: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Your Stage", ko: "공연장 소개", href: "/venue" },
  {
    label: "Book It",
    ko: "대관 안내",
    href: "/guide",
    children: [
      { href: "/packages", label: "대관 패키지" },
      { href: "/guide/forms", label: "대관 양식함" },
      { href: "/guide/image-guide", label: "이미지 가이드" },
    ],
  },
  {
    label: "Know It",
    ko: "고객 지원",
    children: [
      { href: "/notices", label: "공지사항" },
      { href: "/faq", label: "FAQ" },
      { href: "/mypage/inquiries", label: "1:1 문의" },
    ],
  },
  { label: "Host It", ko: "대관 신청", href: "/apply" },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const apply = useCallback((next: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("sa-theme", next);
    } catch {
      /* 프라이빗 모드 등에서 저장 실패는 무시 */
    }
    setTheme(next);
  }, []);
  return { theme, apply };
}

export function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const { theme, apply } = useTheme();

  // 메뉴가 닫혀 있어도 새 알림이 있으면 햄버거에 점으로 알린다.
  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setUnread(data.unreadCount ?? 0);
      } catch {
        /* 네트워크 오류는 무시 — 다음 폴링에서 복구 */
      }
    }
    poll();
    const t = setInterval(poll, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [currentUser]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeLabel = NAV_ITEMS.find(
    (i) => i.href === active || i.children?.some((c) => c.href === active),
  )?.label;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="container-site flex h-16 items-center justify-between lg:h-[72px]">
          <Link
            href="/"
            className="type-display text-h6-m leading-none sm:text-h5"
            aria-label="Seoul Arena 홈"
          >
            Seoul Arena
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="relative -mr-2 flex h-10 w-10 items-center justify-center"
          >
            <span aria-hidden className="flex w-6 flex-col gap-[5px]">
              <span className="h-px w-full bg-foreground" />
              <span className="h-px w-full bg-foreground" />
            </span>
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-accent ring-1 ring-foreground"
              />
            )}
          </button>
        </div>
      </header>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="전체 메뉴"
          className="fixed inset-0 z-50 flex animate-[menu-in_0.18s_ease-out] flex-col overflow-y-auto bg-background"
        >
          {/* 상단: 로고 + 닫기 */}
          <div className="container-site flex h-16 shrink-0 items-center justify-between lg:h-[72px]">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="type-display text-h6-m leading-none sm:text-h5"
            >
              Seoul Arena
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="메뉴 닫기"
              className="-mr-2 flex h-10 w-10 items-center justify-center text-h5 leading-none"
            >
              <span aria-hidden>×</span>
            </button>
          </div>

          {/* 중앙: 메뉴 */}
          <nav aria-label="전체 메뉴" className="container-site flex flex-1 flex-col justify-center py-10">
            <ul className="text-center">
              {NAV_ITEMS.map((item) => {
                const isOpen = expanded === item.label;
                const isActive = activeLabel === item.label;
                return (
                  <li key={item.label} className="py-2">
                    <div className="flex items-center justify-center gap-3">
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`type-display text-h3-m transition-colors sm:text-h2 ${
                            isActive ? "text-accent" : "hover:text-accent"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : item.label)}
                          className={`type-display text-h3-m transition-colors sm:text-h2 ${
                            isActive ? "text-accent" : "hover:text-accent"
                          }`}
                        >
                          {item.label}
                        </button>
                      )}
                      {item.children && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : item.label)}
                          aria-label={`${item.label} 하위 메뉴`}
                          aria-expanded={isOpen}
                          className="text-h6 leading-none transition-transform"
                          style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                        >
                          <span aria-hidden>⌄</span>
                        </button>
                      )}
                    </div>

                    {item.children && isOpen && (
                      <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3">
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={() => setOpen(false)}
                              className={`text-m transition-colors hover:text-foreground ${
                                c.href === active ? "text-foreground" : "text-muted"
                              }`}
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* 계정 */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-s">
              {currentUser ? (
                <>
                  <span className="text-muted">{currentUser.name} 님</span>
                  <Link
                    href={currentUser.role === "ADMIN" ? "/admin" : "/mypage"}
                    onClick={() => setOpen(false)}
                    className="font-bold hover:text-accent"
                  >
                    {currentUser.role === "ADMIN" ? "운영자 백오피스" : "내 신청 내역"}
                  </Link>
                  <Link
                    href={currentUser.role === "ADMIN" ? "/admin/users" : "/mypage/profile"}
                    onClick={() => setOpen(false)}
                    className="text-muted hover:text-foreground"
                  >
                    회원정보
                  </Link>
                  <NotificationBell role={currentUser.role} />
                  <LogoutButton className="text-muted hover:text-foreground" />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={btnClass("secondary", "md")}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={btnClass("primary", "md")}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* 하단 바 — Figma Navbar / 2 하단 유틸 */}
          <div className="border-t border-border/20">
            <div className="container-site flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-muted">
              <div className="flex items-center gap-5">
                <span className="font-bold text-foreground">KOR</span>
                <span title="영문 페이지 준비 중">ENG</span>
                <Link href="/faq" onClick={() => setOpen(false)} className="hover:text-foreground">
                  대관 문의
                </Link>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="화면 테마">
                <button
                  type="button"
                  onClick={() => apply("light")}
                  aria-pressed={theme === "light"}
                  className={`border px-3 py-1.5 transition-colors ${
                    theme === "light"
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent hover:text-foreground"
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => apply("dark")}
                  aria-pressed={theme === "dark"}
                  className={`border px-3 py-1.5 transition-colors ${
                    theme === "dark"
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent hover:text-foreground"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
