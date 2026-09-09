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
  | "/mypage/drafts"
  | "/mypage/ticket-open"
  | "/mypage/facility-meeting"
  | "/mypage/settlement"
  | "/mypage/inquiries"
  | "/mypage/members"
  | "/mypage/profile"
  | "/mypage/withdraw";

/*
 * 2차 오픈에 열 화면 (2026-09-04 팀 결정).
 *
 * 티켓 오픈 정보·시설 회의·정산은 대관이 확정된 뒤에 쓰는 화면이라 1차 오픈 범위가 아니다.
 * 메뉴에서만 감추고 화면과 코드는 그대로 둔다 — 2차 때 이 목록을 비우면 다시 나온다.
 * 주소를 아는 사람은 그대로 들어갈 수 있다(내부 확인용). 접근까지 막아야 하면 그때 다시 의논한다.
 */
const SECOND_PHASE_SECTIONS: MyPageSection[] = [
  "/mypage/ticket-open",
  "/mypage/facility-meeting",
  "/mypage/settlement",
];

const MENU: { label: string; items: { href: MyPageSection; label: string }[] }[] = [
  {
    label: "대관 현황",
    items: [
      { href: "/mypage", label: "대관 진행 내역" },
      // [신규 2026-09-08] "임시 저장 내역 메뉴 추가" — 대관 위저드의 "임시 저장"
      // 버튼(WizardShell.saveDraftNow)은 지금 브라우저(localStorage)에만 남는다.
      // 이 화면은 그 하나뿐인 임시저장본을 읽어 요약과 "이어서 작성"/"삭제"를 보여준다
      // (src/app/mypage/drafts).
      { href: "/mypage/drafts", label: "임시 저장 내역" },
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

function MyPageMenu({
  active,
  isMaster = false,
}: {
  active: MyPageSection;
  /** 담당자 관리는 대표 담당자만 열 수 있다 — 아니면 목록에 올리지 않는다 */
  isMaster?: boolean;
}) {
  const menu = MENU.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => !SECOND_PHASE_SECTIONS.includes(i.href))
      .filter((i) => i.href !== "/mypage/members" || isMaster),
  }));
  // [개정 2026-09-08] "하이라키가 명확히 보여야" — 그룹 라벨(대관 현황/나의 정보)이
  // text-xs로 항목(text-s)보다 오히려 작고 옅어 부모·자식 관계가 안 읽혔다. 그룹 라벨을
  // 굵은 밑줄 소제목으로 키우고, 항목 목록에 왼쪽 세로선(트리 가이드)을 둬 "이 그룹
  // 소속"임을 시각적으로 붙인다. 현재 위치는 굵은 글씨만으로는 옅은 회색 목록 속에서
  // 잘 안 보이던 걸 가는 검정 세로 바로 보강한다(시안 반영).
  return (
    <nav aria-label="마이페이지 메뉴" className="lg:col-span-3">
      <div className="space-y-9 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
        {menu.map((group) => (
          <div key={group.label}>
            <p className="border-b-2 border-foreground pb-2.5 text-s font-bold text-foreground">
              {group.label}
            </p>
            <ul className="mt-3 space-y-px border-l border-border-soft pl-3">
              {group.items.map((item) => (
                <li key={item.href} className="relative">
                  {active === item.href && (
                    <span aria-hidden className="absolute top-0 -left-3.5 h-full w-0.5 bg-foreground" />
                  )}
                  <Link
                    href={item.href}
                    aria-current={active === item.href ? "page" : undefined}
                    className={`block break-keep border-b border-border/15 py-2.5 pl-1 text-s transition-colors hover:text-foreground ${
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
            <div className="min-w-0 lg:col-span-9">{children}</div>
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
