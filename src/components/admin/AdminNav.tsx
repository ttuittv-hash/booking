"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import type { AppUser } from "@/lib/pricing/types";

// 자주 들여다보는 화면만 한 줄에 직접 노출한다. 설정류(패키지 · 요금표 · 일정 · 콘텐츠 ·
// 알림 · 운영자 계정 · 계정 설정)는 "설정" 드롭다운 하나로 묶는다 — 항목이 11개까지
// 늘면서 좁은 데스크톱 폭에서도 가로 스크롤이 생겼다("지앤비 메뉴가 스크롤이 생기네?",
// 2026-08-22). 헤더 높이는 그대로 두어(다른 화면의 스티키 탭 바 오프셋과 맞물려 있다)
// 항목 수만 줄인다.
const PRIMARY_LINKS = [
  { href: "/admin", label: "신청 현황", masterOnly: false },
  { href: "/admin/reports", label: "리포트", masterOnly: false },
  { href: "/admin/applicants", label: "회원 관리", masterOnly: false },
  { href: "/admin/inquiries", label: "1:1 문의", masterOnly: false },
];

const SETTINGS_GROUP = {
  label: "설정",
  links: [
    { href: "/admin/packages", label: "패키지 관리", masterOnly: false },
    { href: "/admin/rates", label: "요금표 관리", masterOnly: false },
    { href: "/admin/schedule", label: "일정 관리", masterOnly: false },
    { href: "/admin/content", label: "콘텐츠 관리", masterOnly: false },
    { href: "/admin/notification-rules", label: "알림 관리", masterOnly: false },
    { href: "/admin/users", label: "운영자 계정", masterOnly: false },
    { href: "/admin/account", label: "계정 설정", masterOnly: false },
  ],
  // 기능정의서(내부 기획 문서)는 일반 백오피스 메뉴에 넣지 않는다 — 개발자·마스터
  // 관리자만 /admin/feature-spec 주소로 직접 들어간다 (src/app/admin/feature-spec/page.tsx).
};

const NAV_LINK =
  "flex h-full shrink-0 items-center whitespace-nowrap border-b-2 text-xs font-bold transition-colors";
function navLinkCls(isActive: boolean) {
  return `${NAV_LINK} ${
    isActive ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
  }`;
}

function SettingsMenu({ active, master }: { active: string; master: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const links = SETTINGS_GROUP.links.filter((link) => !link.masterOnly || master);
  const isActiveGroup = links.some((l) => l.href === active);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative flex h-full shrink-0 items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={navLinkCls(isActiveGroup || open)}
      >
        {SETTINGS_GROUP.label}
        <svg aria-hidden viewBox="0 0 12 12" className="ml-1 h-3 w-3" fill="none" stroke="currentColor">
          <path d="M2.5 4.5l3.5 3 3.5-3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-px min-w-44 border border-border-soft bg-panel py-1.5 shadow-md">
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
    <header className="sticky top-0 z-20 border-b border-border/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-4 overflow-x-auto px-4 sm:h-16 sm:px-6">
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

        <nav aria-label="백오피스 메뉴" className="ml-auto flex h-full shrink-0 items-center gap-x-4">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.href === active ? "page" : undefined} className={navLinkCls(link.href === active)}>
              {link.label}
            </Link>
          ))}
          <SettingsMenu active={active} master={master} />
        </nav>

        <div className="flex shrink-0 items-center gap-x-4 text-xs text-muted">
          <NotificationBell role="ADMIN" />
          <LogoutButton className="whitespace-nowrap font-bold hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
