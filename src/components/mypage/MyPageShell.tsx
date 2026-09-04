import Link from "next/link";
import type { ReactNode } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead } from "@/components/ui/kit";

/* ============================================================================
   마이페이지 셸 — 좌 2컬럼 스티키 메뉴 + 우 4컬럼 콘텐츠.

   대관 규약의 목차와 같은 언어를 쓴다(헤어라인 목록 · 선택 = 굵게). 회색 박스를
   두지 않는다. 화면이 7개라 알약 탭으로는 한 줄에 담기지 않고 지금 어디 있는지도
   덜 보인다.

   각 화면은 이 셸에 제목과 본문만 넘긴다 — 상단바·머리글·메뉴·푸터를 화면마다
   다시 짜지 않는다.
   ========================================================================= */

export type MyPageSection =
  | "/mypage"
  | "/mypage/ticket-open"
  | "/mypage/facility-meeting"
  | "/mypage/settlement"
  | "/mypage/inquiries"
  | "/mypage/members"
  | "/mypage/profile"
  | "/mypage/withdraw";

const MENU: { label: string; items: { href: MyPageSection; label: string }[] }[] = [
  {
    label: "대관 현황",
    items: [
      { href: "/mypage", label: "대관 진행 내역" },
      { href: "/mypage/ticket-open", label: "티켓 오픈 정보" },
      { href: "/mypage/facility-meeting", label: "시설 회의" },
      { href: "/mypage/settlement", label: "정산" },
      { href: "/mypage/inquiries", label: "1:1 문의" },
    ],
  },
  {
    label: "나의 정보",
    items: [
      { href: "/mypage/profile", label: "나의 정보 수정" },
      { href: "/mypage/members", label: "담당자 관리" },
      { href: "/mypage/withdraw", label: "탈퇴" },
    ],
  },
];

export function MyPageMenu({
  active,
  isMaster = false,
}: {
  active: MyPageSection;
  /** 담당자 관리는 대표 담당자만 열 수 있다 — 아니면 목록에 올리지 않는다 */
  isMaster?: boolean;
}) {
  const menu = MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.href !== "/mypage/members" || isMaster),
  }));
  return (
    <nav aria-label="마이페이지 메뉴" className="lg:col-span-2">
      <div className="space-y-8 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
        {menu.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-bold text-muted">{group.label}</p>
            <ul className="mt-3 border-t border-border/25">
              {group.items.map((item) => (
                <li key={item.href} className="border-b border-border/25">
                  <Link
                    href={item.href}
                    aria-current={active === item.href ? "page" : undefined}
                    className={`block break-keep py-3 text-s transition-colors hover:text-foreground ${
                      active === item.href ? "font-bold text-foreground" : "text-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function MyPageShell({
  user,
  active,
  en,
  ko,
  lead,
  actions,
  children,
}: {
  user: AppUser;
  active: MyPageSection;
  /** H1 영문 슬로건 */
  en: string;
  /** H3 국문 제목 */
  ko: string;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active={active} currentUser={user} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead en={en} ko={ko} lead={lead} actions={actions} />
        </Band>

        <Band tone="light">
          <div className="grid-site">
            <MyPageMenu active={active} isMaster={user.companyRole === "MASTER"} />
            <div className="min-w-0 lg:col-span-4">{children}</div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}

/** 로그인한 사용자 정보 한 줄 — 이름 · 회사 · 이메일 */
export function MyPageIdentity({ user }: { user: AppUser }) {
  return (
    <span>
      {user.name} 님
      {user.companyName ? ` · ${user.companyName}` : ""} · {user.email}
    </span>
  );
}
