"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AppUser } from "@/lib/pricing/types";
import type { BookItNoticeTexts } from "@/lib/content/pageContent";
import { accountStateOf, canAccess } from "@/lib/accessPolicy";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import {
  ACCOUNT_HREF,
  NAV_ACTION,
  NAV_ACTION_HIDDEN,
  NAV_CATEGORIES,
  NOTICE_LINK,
  SUPPORT_MENU,
  type NavPage,
} from "@/components/ui/nav-items";

/* ============================================================================
   상단 내비게이션

   좌   워드마크
   중앙 YOUR STAGE · YOUR GUIDE (카테고리 — 링크가 아니라 호버로 펼치는 묶음)
        BOOK IT (유일한 액션 — 대관 신청 위저드로 바로 간다)
   우측 지원 · 알림 · 계정 · 로그아웃 — 여정이 아니라 도구라 채움·아웃라인 없이 텍스트로 둔다

   카테고리에는 호버 색 변화를 주지 않는다. 눌러서 갈 페이지가 없기 때문에
   "누를 수 있다"는 신호를 주면 안 된다 — 펼쳐지는 패널 자체가 피드백이다.
   상단바는 아웃라인 없이 지면과 같은 색이고, 콘텐츠가 밑으로 지나갈 때
   블러 + 반투명으로 글자 가독성만 지킨다.
   ========================================================================= */

const CAT_BTN = "flex h-full items-center px-3 type-display text-s text-foreground";
/**
 * BOOK IT — 사이트의 유일한 액션.
 *
 * [수정 2026-09-02] 검정 채움을 뺐다. 상단바 지면이 밝고 글자가 검정인데 이 버튼만
 * 검정 면이라, 옆 메뉴와 나란히 놓이면 **눌려 있는 상태**로 읽혔다("꼭 버튼이 눌린
 * 느낌"). 테두리도 뺀다 — 이것만 상자를 두르면 다시 혼자 튄다. 상단바에서는 옆 메뉴와
 * 같은 텍스트로 두고, 누를 수 있다는 신호는 호버 색으로 준다.
 */
const ACTION_BTN =
  "flex h-8 items-center px-3 type-display text-s text-foreground transition-colors hover:text-accent";
const PANEL_LINK = "block whitespace-nowrap py-1.5 text-xs transition-colors hover:text-accent";
/**
 * 우측 유틸 — 채움·아웃라인 없는 텍스트 버튼.
 * 중앙 메뉴(Archivo 대문자 14)보다 커 보이지 않게 국문은 한 단 작게 둔다 —
 * 같은 14 라도 국문이 시각적으로 더 크고 무거워서 도구가 여정보다 앞서 읽힌다.
 */
/**
 * 운영자 백오피스 주소.
 * 파트너 호스트에서 /admin 으로 링크하면 프록시가 막고 홈으로 돌려보낸다 —
 * "백오피스 버튼이 동작을 안 한다"는 신고가 이것이다. partner. 를 bo. 로 바꾼
 * 절대 주소로 보낸다. 세션 쿠키는 부모 도메인으로 굽기 때문에 로그인이 유지된다.
 * 프록시 없는 환경(localhost)에서는 같은 호스트의 /admin 이 그대로 동작한다.
 *
 * 렌더 중에 window 를 읽으면 서버 값("/admin")과 어긋나 하이드레이션이 그 속성을
 * 버린다 — 실제로 버튼이 계속 /admin 을 가리켰다. 마운트 후 상태로 채운다.
 */
function useBackofficeHref(): string {
  // 초기값 계산을 지연 이니셜라이저로 미룬다 — effect 안 setState 는 재렌더를 한 번 더 유발한다.
  // useState 이니셜라이저는 클라이언트 첫 렌더(하이드레이션)에서 실행되므로 window 를 읽어도
  // 되지만, 서버 마크업("/admin")과 속성이 어긋나는 문제는 suppressHydrationWarning 대신
  // useSyncExternalStore 로 푸는 것이 정석이다. 여기서는 값이 정적이라 그걸로 충분하다.
  return useSyncExternalStore(
    () => () => {},
    () => {
      const { protocol, host } = window.location;
      const m = /^partner\.(.+)$/.exec(host);
      return m ? `${protocol}//bo.${m[1]}/` : "/admin";
    },
    () => "/admin",
  );
}

const UTIL_BASE =
  "flex items-center gap-1 whitespace-nowrap text-xs font-bold text-foreground transition-colors";
/**
 * 드롭다운을 여는 트리거(지원 · 계정). 중앙 카테고리와 같은 이유로
 * **호버 색을 바꾸지 않는다** — 눌러서 갈 페이지가 없으므로 링크처럼 보이면 안 된다.
 * 펼쳐지는 패널이 피드백이다.
 */
const UTIL_TRIGGER = UTIL_BASE;
/** 실제로 이동·실행하는 것(로그인 · 회원가입 · 로그아웃 · 백오피스) */
const UTIL_LINK = `${UTIL_BASE} hover:text-accent`;

function Caret() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor">
      <path d="M3 4.5 6 7.5 9 4.5" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

/** 우측 유틸 드롭다운 — 트리거는 텍스트, 패널은 하단 정렬 */
function UtilMenu({
  id,
  label,
  pages,
  active,
  openKey,
  onOpen,
  onToggle,
}: {
  id: string;
  label: string;
  pages: NavPage[];
  active: string;
  openKey: string | null;
  onOpen: (key: string) => void;
  onToggle: (key: string) => void;
}) {
  const isOpen = openKey === id;
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => onOpen(id)}
      onFocus={() => onOpen(id)}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => onToggle(id)}
        className={UTIL_TRIGGER}
      >
        {label}
        <Caret />
      </button>
      {isOpen && (
        /* 트리거 **바로 아래**, 가운데 정렬 — 중앙 카테고리 드롭다운과 같은 규격
           (min-w-36 · p-4 · text-center). 우측 끝에 붙여 놓으면(right-0) 이 패널만
           다른 드롭다운과 정렬 축도 폭도 달라 상단바에 기준이 두 개 생긴다. */
        <div
          className="absolute left-1/2 top-full z-50 min-w-36 -translate-x-1/2 animate-[dropdown-in_0.14s_ease-out] bg-background p-4 text-center shadow-md"
          onMouseEnter={() => onOpen(id)}
        >
          <ul>
            {pages.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  onClick={() => onToggle(id)}
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
    </div>
  );
}

/** 열려 있는 드롭다운 키 — 카테고리 라벨과 겹치지 않는 이름을 쓴다 */
const BOOK_IT_KEY = "book-it-notice";

export function PublicHeaderNav({
  active,
  currentUser,
  bookItNotice,
}: {
  active: string;
  currentUser: AppUser | null;
  /** 켜져 있으면 BOOK IT 이 링크 대신 「오픈 예정」 안내를 띄운다 */
  bookItNotice?: BookItNoticeTexts;
}) {
  const backofficeHref = useBackofficeHref();

  // 접근 매트릭스(accessPolicy)로 못 여는 메뉴는 아예 띄우지 않는다.
  // [개정 2026-09-02] 예전에는 전부 띄우고 눌렀을 때만 /pending 으로 돌려보냈다.
  // 승인 대기·반려 상태에서 대관료가 메뉴에 그대로 보여 "열리는 메뉴"처럼 읽혔고,
  // 눌러야 막힌 걸 알았다. 판정 로직은 페이지 쪽 requireAccess 와 같은 함수를 쓴다 —
  // 여기서 따로 계산하면 표와 어긋나기 시작한다. (메뉴를 감추는 건 편의지 보안 경계가
  // 아니다. 실제 차단은 각 페이지의 requireAccess 가 한다.)
  const accountState = accountStateOf(currentUser);
  // 비로그인에게는 그대로 다 보여 준다 — 무엇을 하는 곳인지 보여야 가입으로 이어지고,
  // 눌렀을 때 가는 곳(로그인)이 막다른 길이 아니라 다음 걸음이다.
  // 로그인한 사람에게만 감춘다. 그 사람에게 "지금은 못 여는 메뉴"는 안내가 아니라 벽이다.
  const allowed = (href: string) => accountState === "GUEST" || canAccess(href, accountState);
  /*
    [수정 2026-09-04] 운영자도 같은 「오픈 예정」 안내를 본다.

    9/3 에는 운영자를 예외로 뒀는데, 그러면 운영자 화면에서만 BOOK IT 이 살아 있는 링크로
    보여 "1차 오픈인데 신청서가 열린다"로 읽혔다. 상단바는 모두에게 같은 상태를 보여주고,
    흐름 점검이 필요한 운영자는 이 안내 안의 '운영자 확인용' 링크로 들어간다.
  */
  const bookItComingSoon = !NAV_ACTION_HIDDEN && !!bookItNotice?.enabled;
  const visibleCategories = NAV_CATEGORIES.map((cat) => ({
    ...cat,
    pages: cat.pages.filter((p) => allowed(p.href)),
  })).filter((cat) => cat.pages.length > 0);
  /*
    비로그인에게 1:1 문의는 공개 접수 화면(/inquiry)으로 보낸다 (2026-09-02).
    마이페이지 안의 문의 목록은 로그인해야 열리는데, 가입 전에도 물어볼 곳은 있어야 한다.
  */
  const visibleSupportPages = SUPPORT_MENU.pages
    .filter((p) => allowed(p.href))
    .map((p) =>
      p.href === "/mypage/inquiries" && accountState === "GUEST" ? { ...p, href: "/inquiry" } : p,
    );

  /** 펼쳐진 드롭다운의 키 (카테고리 라벨 · "지원" · "계정") */
  const [openKey, setOpenKey] = useState<string | null>(null);
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
      setOpenKey(null);
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

  // 트리거와 패널 사이를 대각선으로 지나갈 때 닫히지 않도록 잠깐 유예한다.
  function openWithCancel(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  }
  function toggle(key: string) {
    setOpenKey((k) => (k === key ? null : key));
  }
  /** 유예 없이 바로 닫는다 — 카테고리가 아닌 항목으로 마우스가 넘어갈 때 */
  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(null);
  }

  return (
    <header className="sticky top-0 z-40" onMouseLeave={closeSoon}>
      {/* 배경 — Figma `Header_rev` (지면색 80% → 아랫변 0, 블러 없음). `header-veil` 참조 */}
      <div aria-hidden className="header-veil" />
      {/*
        중앙 메뉴는 좌우 요소 사이 공간의 가운데가 아니라 **화면의 가운데**에 와야 한다 —
        워드마크와 우측 유틸의 폭이 다르므로 flex 로만 두면 아래 알약 탭과 축이 어긋난다.
        그래서 절대 위치로 화면 중앙에 고정한다(마진이 좌우 대칭이라 컨테이너 중앙 = 화면 중앙).
      */}
      <div className="container-site relative flex h-[var(--header-h)] items-center justify-between gap-6">
        {/* 글자 높이만큼만 잡히면 터치 타깃이 18~24px 밖에 안 된다.
            헤더 높이만큼 세로를 채워 누르기 쉽게 한다. */}
        <Link
          href="/"
          onMouseEnter={closeNow}
          className="type-display flex h-full shrink-0 items-center text-h6-m leading-none"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>

        {/* 중앙 — 카테고리 2개 + 액션 1개 */}
        <nav
          aria-label="주요 메뉴"
          className="absolute left-1/2 hidden h-full -translate-x-1/2 lg:flex"
        >
          <ul className="flex h-full items-stretch">
            {visibleCategories.map((cat) => {
              const isOpen = openKey === cat.label;
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
                    onClick={() => setOpenKey(isOpen ? null : cat.label)}
                    className={CAT_BTN}
                  >
                    {cat.label}
                  </button>

                  {isOpen && (
                    /* 카테고리 **바로 아래**, 가운데 정렬. 폭은 내용에 맞춘다 —
                       48(192px)은 「대관 절차」 같은 4~5자 항목에 비해 너무 넓어
                       패널의 무게 중심이 카테고리에서 왼쪽으로 밀려 보였다 */
                    <div
                      className="absolute left-1/2 top-full z-50 min-w-36 -translate-x-1/2 animate-[dropdown-in_0.14s_ease-out] bg-background p-4 text-center shadow-md"
                      onMouseEnter={() => openWithCancel(cat.label)}
                    >
                      <ul>
                        {cat.pages.map((p) => (
                          <li key={p.href}>
                            <Link
                              href={p.href}
                              onClick={() => setOpenKey(null)}
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
            {/*
              BOOK IT 위로 마우스가 오면 열려 있던 카테고리를 **즉시** 닫는다.
              닫힘 유예(120ms)만 믿으면 YOUR GUIDE → BOOK IT 으로 지나가는 동안
              드롭다운이 버튼을 덮은 채로 남아 엉뚱한 페이지로 들어가게 된다.
            */}
            {/* 승인 완료 전에는 신청 자체가 막혀 있다 — 누르면 안내 화면으로 되돌아오는
                버튼을 상단바에 남겨 두지 않는다(2026-09-02). */}
            {/* [신규 2026-09-03] 신청을 아직 받지 않는 동안(1차 오픈)에는 자리를 비우지 않고
                「오픈 예정」 안내를 띄운다. 메뉴를 감추면 이 서비스가 무엇을 하는 곳인지
                흐려진다 — 자리는 두되 누르거나 올려 두면 언제 열리는지 알려 준다. */}
            {bookItComingSoon && bookItNotice ? (
              <li
                className="relative ml-2 flex items-center"
                onMouseEnter={() => {
                  closeNow();
                  openWithCancel(BOOK_IT_KEY);
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(BOOK_IT_KEY)}
                  aria-expanded={openKey === BOOK_IT_KEY}
                  className={ACTION_BTN}
                >
                  {NAV_ACTION.label}
                </button>
                {openKey === BOOK_IT_KEY && (
                  <div
                    role="status"
                    className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 animate-[dropdown-in_0.14s_ease-out] bg-background p-4 shadow-md"
                    onMouseEnter={() => openWithCancel(BOOK_IT_KEY)}
                  >
                    <p className="text-xs font-bold">{bookItNotice.title}</p>
                    {/* 운영자가 나눈 줄을 그대로 낸다 — 문구를 여러 줄로 써도 한 줄로
                        이어 붙던 자리다(2026-09-03). */}
                    <p className="mt-2 whitespace-pre-line break-keep text-xs leading-5 text-muted">
                      {bookItNotice.body}
                    </p>
                    {currentUser?.role === "ADMIN" && (
                      /* 운영자는 오픈 전에도 흐름을 확인해야 한다 — 안내는 같게 두고 통로만 남긴다. */
                      <Link
                        href={`${NAV_ACTION.href}?operator=1`}
                        className="mt-3 block text-xs underline underline-offset-4"
                      >
                        운영자 확인용으로 열기 →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ) : !NAV_ACTION_HIDDEN && allowed(NAV_ACTION.href) ? (
              <li className="ml-2 flex items-center" onMouseEnter={closeNow} onFocus={closeNow}>
                <Link href={NAV_ACTION.href} className={ACTION_BTN}>
                  {NAV_ACTION.label}
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>

        {/* 우측 — 공지사항 · 지원 · 알림 · 계정 */}
        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          {/* [신규 2026-09-03] 공지사항은 드롭다운 밖으로 꺼내 「지원」 왼쪽에 둔다 —
              대관 공고가 올라오는 곳이라 한 번 더 누르게 하지 않는다. */}
          {allowed(NOTICE_LINK.href) && (
            <Link
              href={NOTICE_LINK.href}
              onMouseEnter={closeNow}
              className={`${UTIL_LINK} ${
                active === NOTICE_LINK.href ? "font-bold text-foreground" : ""
              }`}
            >
              {NOTICE_LINK.label}
            </Link>
          )}
          <UtilMenu
            id="support"
            label={SUPPORT_MENU.label}
            pages={visibleSupportPages}
            active={active}
            openKey={openKey}
            onOpen={openWithCancel}
            onToggle={toggle}
          />
          {currentUser ? (
            <>
              {currentUser.role === "ADMIN" ? (
                <a href={backofficeHref} className={UTIL_LINK} onMouseEnter={closeNow}>
                  운영자 백오피스
                </a>
              ) : (
                /* 이름 자체가 마이페이지 링크다 — 드롭다운을 두지 않고 밑줄로만 표시한다 */
                <Link
                  href={ACCOUNT_HREF}
                  onMouseEnter={closeNow}
                  className={`${UTIL_LINK} underline decoration-1 underline-offset-4`}
                >
                  {currentUser.name} 님
                </Link>
              )}
              <LogoutButton className={UTIL_LINK} />
              {/* 알림은 맨 오른쪽 — 텍스트 메뉴와 성격이 달라 끝에 떼어 둔다 */}
              <NotificationBell role={currentUser.role} />
            </>
          ) : (
            <>
              <Link href="/register" className={UTIL_LINK} onMouseEnter={closeNow}>
                회원가입
              </Link>
              <Link href="/login" className={UTIL_LINK} onMouseEnter={closeNow}>
                로그인
              </Link>
            </>
          )}
        </div>

        {/* 좁은 화면 — 원형 클릭 메뉴 */}
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
          <div className="container-site flex h-[var(--header-h)] shrink-0 items-center justify-between">
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
              {visibleCategories.map((cat) => (
                <li key={cat.label}>
                  <h2 className="type-display text-h6-m">{cat.label}</h2>
                  <ul className="mt-3 space-y-2">
                    {cat.pages.map((p) => (
                      <li key={p.href}>
                        <Link
                          href={p.href}
                          onClick={() => setMobileOpen(false)}
                          className={`text-s transition-colors hover:text-accent ${
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
              {bookItComingSoon && bookItNotice ? (
                /* 좁은 화면에는 호버가 없다 — 안내를 접었다 펴지 않고 그대로 붙여 둔다. */
                <li className="text-center">
                  <p className="flex h-12 items-center justify-center type-display text-s text-muted">
                    {NAV_ACTION.label}
                  </p>
                  <p className="text-xs font-bold">{bookItNotice.title}</p>
                  <p className="mt-1 whitespace-pre-line break-keep text-xs leading-5 text-muted">
                    {bookItNotice.body}
                  </p>
                </li>
              ) : !NAV_ACTION_HIDDEN && allowed(NAV_ACTION.href) ? (
                <li>
                  {/* [수정 2026-09-02] 상단바와 같은 결로 — 검정 채움을 빼고 텍스트로 둔다. */}
                  <Link
                    href={NAV_ACTION.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex h-12 items-center justify-center type-display text-s text-foreground"
                  >
                    {NAV_ACTION.label}
                  </Link>
                </li>
              ) : null}
            </ul>

            {/* 좁은 화면에서는 드롭다운이 없어 뎁스 차이가 없다 — 공지사항을 지원 묶음
                맨 위에 두어 상단바와 같은 순서(공지사항 → 지원)로 읽히게 한다. */}
            <div className="mt-10 border-t border-border pt-6">
              <h2 className="text-s font-bold">{SUPPORT_MENU.label}</h2>
              <ul className="mt-3 space-y-2">
                {(allowed(NOTICE_LINK.href)
                  ? [NOTICE_LINK, ...visibleSupportPages]
                  : visibleSupportPages
                ).map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      onClick={() => setMobileOpen(false)}
                      className={`text-s transition-colors hover:text-accent ${
                        p.href === active ? "font-bold text-foreground" : "text-muted"
                      }`}
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              {currentUser ? (
                <>
                  <h2 className="text-s font-bold">{currentUser.name} 님</h2>
                  <ul className="mt-3 space-y-2">
                    {currentUser.role === "ADMIN" ? (
                      <li>
                        <a
                          href={backofficeHref}
                          onClick={() => setMobileOpen(false)}
                          className="text-s text-muted"
                        >
                          운영자 백오피스
                        </a>
                      </li>
                    ) : (
                      <li>
                        <Link
                          href={ACCOUNT_HREF}
                          onClick={() => setMobileOpen(false)}
                          className={`text-s underline decoration-1 underline-offset-4 transition-colors hover:text-accent ${
                            active.startsWith("/mypage") ? "font-bold text-foreground" : "text-muted"
                          }`}
                        >
                          마이페이지
                        </Link>
                      </li>
                    )}
                  </ul>
                  <div className="mt-4 flex items-center gap-5">
                    <NotificationBell role={currentUser.role} />
                    <LogoutButton className="text-s font-bold" />
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-s font-bold"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-s font-bold"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
