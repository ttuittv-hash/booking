"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { NAV_CATEGORIES } from "@/components/ui/nav-items";

/**
 * Figma Wireframe › Navbar / 2 ("open menu").
 * 닫힌 상태는 로고 + 햄버거만. 누르면 풀페이지 메뉴가 열린다.
 *
 * 메뉴는 2컬럼 사이트맵이다 — 좌: 카테고리 타이틀(링크 아님) / 우: 그 카테고리의 페이지들.
 * 상세 페이지를 한 화면에서 전부 볼 수 있게 하는 것이 목적이라 접기·펼치기를 두지 않는다.
 */
/** 메뉴 안 계정 링크 — 박스 없이 텍스트만 (Figma 하단 유틸 링크와 같은 규격) */
const MENU_LINK = "text-s font-bold transition-colors hover:text-accent";

/**
 * 메뉴 아이콘 — 줄 두 개(햄버거)가 아니라 원.
 *   닫힘 : 검정 채움 원
 *   열림 : 채움 없는 검정 아웃라인 원 + 안에 ×
 * 두 상태가 같은 지름이라 누를 때 아이콘이 튀지 않는다.
 */
const MENU_DOT_BASE = "block h-7 w-7 rounded-full transition-colors";
const MENU_DOT_CLOSED = `${MENU_DOT_BASE} bg-foreground`;
const MENU_DOT_OPEN = `${MENU_DOT_BASE} border border-foreground bg-transparent`;

export function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

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

          {/* 클릭 범위를 넉넉히 — 실제 타깃은 56×56, 아이콘은 검정 채움 원 */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="relative -mr-4 flex h-14 w-14 items-center justify-center"
          >
            <span aria-hidden className={MENU_DOT_CLOSED} />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute right-2 top-3 h-2 w-2 rounded-full bg-accent ring-1 ring-foreground"
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
          className="fixed inset-0 z-50 flex h-[100dvh] animate-[menu-in_0.18s_ease-out] flex-col overflow-y-auto bg-background"
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
              className="-mr-4 flex h-14 w-14 items-center justify-center"
            >
              <span aria-hidden className={`${MENU_DOT_OPEN} relative`}>
                <svg
                  viewBox="0 0 28 28"
                  aria-hidden
                  className="absolute inset-0 h-full w-full"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                >
                  <path d="M10.5 10.5 17.5 17.5M17.5 10.5 10.5 17.5" />
                </svg>
              </span>
            </button>
          </div>

          {/* 2컬럼 사이트맵 — 구분선 없이 여백만으로 나눈다.
              전체가 한 화면에 들어와야 하므로 타이틀 h5 / 페이지 r 로 조인다. */}
          <nav
            aria-label="전체 메뉴"
            className="container-site flex flex-1 flex-col justify-center py-4 tall:py-6"
          >
            <ul>
              {NAV_CATEGORIES.map((cat) => (
                <li
                  key={cat.label}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-x-10 sm:py-4 tall:lg:py-5"
                >
                  <h2 className="type-display text-h6-m sm:text-h5 tall:lg:text-h4">{cat.label}</h2>
                  <ul className="flex flex-col gap-2">
                    {cat.pages.map((p) => (
                      <li key={p.href}>
                        <Link
                          href={p.href}
                          onClick={() => setOpen(false)}
                          className={`text-r transition-colors hover:text-accent tall:lg:text-m ${
                            p.href === active ? "font-bold text-foreground" : "text-muted"
                          }`}
                        >
                          {p.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {/* 계정 — 박스 없는 텍스트 링크로 통일 */}
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 tall:mt-8">
              {currentUser ? (
                <>
                  <span className="text-s text-muted">{currentUser.name} 님</span>
                  <Link
                    href={currentUser.role === "ADMIN" ? "/admin" : "/mypage"}
                    onClick={() => setOpen(false)}
                    className={MENU_LINK}
                  >
                    {currentUser.role === "ADMIN" ? "운영자 백오피스" : "내 신청 내역"}
                  </Link>
                  <Link
                    href={currentUser.role === "ADMIN" ? "/admin/users" : "/mypage/profile"}
                    onClick={() => setOpen(false)}
                    className={MENU_LINK}
                  >
                    회원정보
                  </Link>
                  <NotificationBell role={currentUser.role} />
                  <LogoutButton className={MENU_LINK} />
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className={MENU_LINK}>
                    로그인
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className={MENU_LINK}>
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* 하단 바 — Figma Navbar / 2 하단 유틸 */}
          <div className="shrink-0">
            <div className="container-site flex flex-wrap items-center justify-between gap-4 py-4 text-xs text-muted">
              <div className="flex items-center gap-5">
                <span className="font-bold text-foreground">KOR</span>
                <span title="영문 페이지 준비 중">ENG</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
