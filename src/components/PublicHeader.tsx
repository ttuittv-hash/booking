"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { NAV_CATEGORIES } from "@/components/ui/nav-items";
import { btnClass } from "@/components/ui/kit";

/* ============================================================================
   상단 내비게이션

   좌 : 워드마크
   중 : 카테고리 4개를 **접지 않고 바로 노출**한다. 일반 텍스트로 두고,
        마우스를 올리면 그 카테고리의 페이지 목록이 아래로 펼쳐진다.
   우 : 로그인 / (로그인 후) 마이페이지 · 로그아웃

   카테고리 자체는 페이지가 아니므로 링크가 아니다 — 버튼으로 두고 키보드로도
   펼칠 수 있게 한다(포커스·Enter·Escape). 좁은 화면에서는 카테고리를 한 줄에
   담을 수 없으므로 기존처럼 전체 메뉴 패널로 떨어진다.
   ========================================================================= */

const CAT_BTN =
  "flex h-full items-center px-4 text-s font-bold transition-colors hover:text-accent";
const PANEL_LINK = "block py-2 text-s transition-colors hover:text-accent";
const UTIL_LINK = "text-s font-bold transition-colors hover:text-accent";

export function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  /** 데스크톱 드롭다운에서 펼쳐진 카테고리 라벨 */
  const [openCat, setOpenCat] = useState<string | null>(null);
  /** 좁은 화면 전체 메뉴 */
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (e.key !== "Escape") return;
      setOpenCat(null);
      setMobileOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // 카테고리와 패널 사이를 대각선으로 지나갈 때 메뉴가 닫히지 않도록 잠깐 유예한다.
  function openWithCancel(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenCat(label);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenCat(null), 120);
  }

  const accountLinks = currentUser ? (
    <>
      <NotificationBell role={currentUser.role} />
      {currentUser.role === "ADMIN" ? (
        <Link href="/admin" className={btnClass("secondary", "sm")}>
          운영자 백오피스
        </Link>
      ) : (
        <Link href="/mypage/process" className={btnClass("secondary", "sm")}>
          마이페이지
        </Link>
      )}
      <LogoutButton className={btnClass("primary", "sm")} />
    </>
  ) : (
    <>
      <Link href="/register" className={UTIL_LINK}>
        회원가입
      </Link>
      <Link href="/login" className={btnClass("primary", "sm")}>
        로그인
      </Link>
    </>
  );

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/15 bg-background/95 backdrop-blur-md"
      onMouseLeave={closeSoon}
    >
      <div className="container-site flex h-16 items-center justify-between gap-6 lg:h-[72px]">
        {/* 글자 높이만큼만 잡히면 터치 타깃이 18~24px 밖에 안 된다.
            헤더 높이만큼 세로를 채워 누르기 쉽게 한다. */}
        <Link
          href="/"
          className="type-display flex h-full shrink-0 items-center text-h6-m leading-none sm:text-h5"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>

        {/* 중앙 — 카테고리 4개를 항상 노출한다 */}
        <nav aria-label="주요 메뉴" className="hidden h-full flex-1 justify-center lg:flex">
          <ul className="flex h-full items-stretch">
            {NAV_CATEGORIES.map((cat) => {
              const isOpen = openCat === cat.label;
              const hasActive = cat.pages.some((p) => p.href === active);
              return (
                <li
                  key={cat.label}
                  className="relative flex items-stretch"
                  onMouseEnter={() => openWithCancel(cat.label)}
                  onFocus={() => openWithCancel(cat.label)}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenCat(isOpen ? null : cat.label)}
                    className={`${CAT_BTN} ${hasActive ? "text-foreground" : "text-muted"}`}
                  >
                    {cat.label}
                  </button>

                  {isOpen && (
                    <div
                      className="absolute left-1/2 top-full z-50 min-w-52 -translate-x-1/2 animate-[dropdown-in_0.14s_ease-out] border border-border/20 bg-background p-4 shadow-sm"
                      onMouseEnter={() => openWithCancel(cat.label)}
                    >
                      <ul>
                        {cat.pages.map((p) => (
                          <li key={p.href}>
                            <Link
                              href={p.href}
                              onClick={() => setOpenCat(null)}
                              className={`${PANEL_LINK} ${
                                p.href === active ? "font-bold text-foreground" : "text-muted"
                              }`}
                            >
                              {p.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 우측 — 계정 */}
        <div className="hidden shrink-0 items-center gap-4 lg:flex">{accountLinks}</div>

        {/* 좁은 화면 — 카테고리 4개를 한 줄에 담을 수 없으므로 전체 메뉴로 떨어진다 */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
          className="relative -mr-3 flex h-12 w-12 items-center justify-center lg:hidden"
        >
          <span aria-hidden className="block h-7 w-7 rounded-full bg-foreground" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-2 h-2 w-2 rounded-full bg-accent ring-1 ring-foreground"
            />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="전체 메뉴"
          className="fixed inset-0 z-50 flex h-[100dvh] animate-[menu-in_0.18s_ease-out] flex-col overflow-y-auto bg-background lg:hidden"
        >
          <div className="container-site flex h-16 shrink-0 items-center justify-between">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="type-display text-h6-m leading-none"
            >
              Seoul Arena
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="메뉴 닫기"
              className="-mr-3 flex h-12 w-12 items-center justify-center"
            >
              <span
                aria-hidden
                className="relative block h-7 w-7 rounded-full border border-foreground"
              >
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

          <nav aria-label="전체 메뉴" className="container-site flex-1 py-6">
            <ul className="space-y-8">
              {NAV_CATEGORIES.map((cat) => (
                <li key={cat.label}>
                  <h2 className="type-display text-h6-m">{cat.label}</h2>
                  <ul className="mt-3 space-y-2">
                    {cat.pages.map((p) => (
                      <li key={p.href}>
                        <Link
                          href={p.href}
                          onClick={() => setMobileOpen(false)}
                          className={`text-r transition-colors hover:text-accent ${
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

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/20 pt-6">
              {currentUser ? (
                <>
                  <span className="text-s text-muted">{currentUser.name} 님</span>
                  <Link
                    href={currentUser.role === "ADMIN" ? "/admin" : "/mypage/process"}
                    onClick={() => setMobileOpen(false)}
                    className={UTIL_LINK}
                  >
                    {currentUser.role === "ADMIN" ? "운영자 백오피스" : "마이페이지"}
                  </Link>
                  <NotificationBell role={currentUser.role} />
                  <LogoutButton className={UTIL_LINK} />
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className={UTIL_LINK}>
                    로그인
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className={UTIL_LINK}>
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
