"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import type { AppUser } from "@/lib/pricing/types";

// 계정 관련 화면(운영자 계정 · 계정 설정) 둘만 마우스오버 드롭다운으로 묶고, 나머지는
// 전부 원뎁스로 GNB에 직접 둔다(2026-08-22, "콘텐츠 관리, 알림 관리도 gnb 메뉴로
// 다시 빼" · "계정 관리로 빼고.. 마우스오버 하면 운영자계정/계정 설정 넣어").
//
// 리포트를 맨 앞에 둔다(2026-08-30, "어드민 맨 앞 탭을 리포트로 해줘") — 운영자가
// 백오피스를 열었을 때 먼저 보는 건 개별 신청 건이 아니라 유입·매출 지표다.
// /admin(신청 현황)은 여전히 백오피스의 기본 주소이므로 링크는 남겨 두고 순서만 바꾼다.
const PRIMARY_LINKS = [
  { href: "/admin/reports", label: "리포트", masterOnly: false },
  { href: "/admin", label: "신청 현황", masterOnly: false },
  { href: "/admin/applicants", label: "회원 관리", masterOnly: false },
  { href: "/admin/packages", label: "패키지 관리", masterOnly: false },
  { href: "/admin/rates", label: "요금표 관리", masterOnly: false },
  { href: "/admin/schedule", label: "일정 관리", masterOnly: false },
  { href: "/admin/content", label: "콘텐츠 관리", masterOnly: false },
  { href: "/admin/notification-rules", label: "알림 관리", masterOnly: false },
  { href: "/admin/inquiries", label: "1:1 문의", masterOnly: false },
];

const ACCOUNT_GROUP = {
  label: "계정 관리",
  links: [
    { href: "/admin/users", label: "운영자 계정", masterOnly: false },
    { href: "/admin/account", label: "계정 설정", masterOnly: false },
  ],
  // 기능정의서(내부 기획 문서)는 일반 백오피스 메뉴에 넣지 않는다 — 개발자·마스터
  // 관리자만 /admin/feature-spec 주소로 직접 들어간다 (src/app/admin/feature-spec/page.tsx).
};

// 모바일에서는 메뉴가 아래 줄로 내려가 줄바꿈되므로 높이를 44px(터치 타깃)로,
// lg 부터는 헤더 높이를 꽉 채워 밑줄(border-b)이 헤더 하단에 붙게 한다.
const NAV_LINK =
  "flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-xs font-bold transition-colors lg:h-full";
function navLinkCls(isActive: boolean) {
  return `${NAV_LINK} ${
    isActive ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
  }`;
}

// 마우스오버로 열고, 트리거→패널로 넘어갈 때 살짝 여유를 줘서 깜빡이지 않게 한다
// (2026-08-22, "마우스오버 하면 운영자계정/계정 설정 넣어"). 클릭으로도 열리고
// 닫힌다 — 터치 기기나 키보드 접근에는 호버가 없기 때문이다.
const HOVER_CLOSE_DELAY_MS = 150;

function AccountMenu({ active, master }: { active: string; master: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const links = ACCOUNT_GROUP.links.filter((link) => !link.masterOnly || master);
  const isActiveGroup = links.some((l) => l.href === active);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }

  return (
    <div
      ref={ref}
      className="relative flex h-full shrink-0 items-center"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={navLinkCls(isActiveGroup || open)}
      >
        {ACCOUNT_GROUP.label}
        <svg aria-hidden viewBox="0 0 12 12" className="ml-1 h-3 w-3" fill="none" stroke="currentColor">
          <path d="M2.5 4.5l3.5 3 3.5-3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-px min-w-44 rounded-surface border border-border-soft bg-panel py-1.5 shadow-md">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={link.href === active ? "page" : undefined}
              className={`block px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                link.href === active ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Figma Style Guide › Topbars — 샤프한 헤어라인 바.
 * 활성 항목은 옐로 하단 바 + 검정 텍스트 (옐로는 면·강조에만, 텍스트 색으로 쓰지 않는다).
 * 높이 14/16 은 각 화면의 스티키 탭 바(top-14 sm:top-16)와 맞물려 있으므로 유지한다.
 *
 * user 를 넘기지 않는 호출부는 하위호환을 위해 마스터 전용 메뉴를 숨긴 상태로 렌더링한다.
 */
export function AdminNav({ active, user }: { active: string; user?: AppUser | null }) {
  // src/lib/auth.ts의 isMasterAdmin()은 next/headers 등 서버 전용 모듈을 물고 있어
  // "use client" 컴포넌트에서 import하면 빌드가 깨진다 — 판정 자체는 필드 두 개만
  // 보면 되는 순수 로직이라 여기서 직접 계산한다.
  const master = !!user && user.role === "ADMIN" && user.adminTier === "MASTER";
  const primaryLinks = PRIMARY_LINKS.filter((link) => !link.masterOnly || master);

  return (
    // 이 줄에 overflow-x-auto 를 넣지 않는다 — overflow-x 를 visible이 아닌 값으로
    // 두면 overflow-y도 함께 auto로 계산돼(스펙), "설정" 드롭다운 패널(하단으로
    // 튀어나오는 절대배치 요소)이 통째로 잘려 안 보이게 된다("설정 하위 메뉴가
    // 없는데?", 2026-08-22) — 실제로 겪은 회귀라 다시 넣지 않는다.
    <header className="sticky top-0 z-20 border-b border-border/25 bg-background/95 backdrop-blur-md">
      {/* 메뉴 9개는 좁은 화면 한 줄에 못 들어간다. overflow-x-auto 는 드롭다운을 잘라
          쓸 수 없으므로(위 주석), lg 미만에서는 메뉴를 두 번째 줄로 내려 줄바꿈한다. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:h-16 lg:flex-nowrap">
        <Link
          href="/"
          className="type-display flex h-14 shrink-0 items-center whitespace-nowrap text-h6-m leading-none sm:h-16 lg:h-full"
          aria-label="Seoul Arena 홈"
        >
          Seoul Arena
        </Link>
        <span className="hidden shrink-0 whitespace-nowrap rounded-btn border border-border-soft px-2 py-1 text-xs leading-none text-muted sm:inline-block">
          운영자 백오피스
        </span>

        <nav
          aria-label="백오피스 메뉴"
          className="order-last flex w-full flex-wrap items-center gap-x-4 border-t border-border/25 lg:order-none lg:ml-auto lg:h-full lg:w-auto lg:flex-nowrap lg:border-t-0"
        >
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.href === active ? "page" : undefined} className={navLinkCls(link.href === active)}>
              {link.label}
            </Link>
          ))}
          <AccountMenu active={active} master={master} />
        </nav>

        <div className="ml-auto flex h-14 shrink-0 items-center gap-x-4 text-xs text-muted sm:h-16 lg:ml-0 lg:h-full">
          <NotificationBell role="ADMIN" />
          <LogoutButton className="whitespace-nowrap font-bold hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
