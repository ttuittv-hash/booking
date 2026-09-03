/**
 * 사이트 정보구조 — 헤더 메뉴와 푸터가 같은 정의를 쓴다.
 *
 * 2026-08 재구성 (2차) — 중앙은 여정, 우측은 도구로 나눈다.
 *
 *   중앙  YOUR STAGE · GUIDE  (카테고리 타이틀. 링크가 아니다)
 *         BOOK IT                 (유일한 액션 — 대관 신청 위저드로 바로 간다)
 *   우측  지원 / 계정              (여정이 아니라 도구라 우측 유틸리티로 뺀다)
 *
 * 공간(아레나 / 중형공연장)과 내용 구분은 전부 페이지 안의 탭이다. 메뉴에 올리지 않는다.
 */
export interface NavPage {
  href: string;
  label: string;
  /** 열람에 로그인이 필요한 페이지 */
  loginRequired?: boolean;
}

export interface NavCategory {
  /** 카테고리 타이틀 (링크 아님) */
  label: string;
  pages: NavPage[];
}

/** 중앙 — 읽는 곳 두 묶음 */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Your Stage",
    pages: [
      { href: "/seoularena", label: "서울아레나" },
      { href: "/features", label: "시설 제원" },
    ],
  },
  {
    label: "Guide",
    pages: [
      { href: "/guide", label: "대관 절차" },
      { href: "/rates", label: "대관료", loginRequired: true },
      { href: "/rules", label: "대관 규약", loginRequired: true },
      { href: "/documents", label: "대관 자료", loginRequired: true },
    ],
  },
];

/** 중앙 — 누르는 곳 하나. 카테고리가 아니라 목적지다. */
export const NAV_ACTION = { href: "/apply", label: "Book It" } as const;

/**
 * Book It 을 상단바에서 **통째로 빼는** 스위치 (2026-09-03).
 *
 * 1차 오픈 때 한 번 켰다가 껐다 — "숨김처리 하지말고, 클릭 또는 마우스 오버하면
 * 오픈 예정이라고 레이어로 보여주는게 좋음"(팀 요청, 나중 결정). 메뉴를 감추면 이
 * 서비스가 무엇을 하는 곳인지 흐려지기 때문이다.
 *
 * 그래서 평소 쓰는 스위치는 이것이 아니라 **콘텐츠 관리 > 화면 문구 > BOOK IT
 * 「오픈 예정」 안내**다(배포 없이 껐다 켠다). 이 상수는 자리까지 없애야 할 때만 켠다.
 */
export const NAV_ACTION_HIDDEN = false;

/**
 * 우측 — 대관 공지. 한 뎁스로 꺼내 「지원」 왼쪽에 둔다 (2026-09-03).
 *
 * 대관 공고·정기대관 일정이 여기로 올라오는데, 드롭다운 **안**에 있으면 한 번 더 눌러야
 * 보이고 새 공지가 떠도 눈에 걸리지 않는다. 읽을 사람이 가장 많은 화면이라 링크 하나로
 * 꺼내 둔다. (이름은 같은 날 팀이 정한 「대관 공지」를 따른다.)
 *
 * 1차 오픈 동안 Book It 은 감추지 않고 「오픈 예정」 안내를 띄운다 — 그 판단은
 * 콘텐츠(화면 문구 > BOOK IT 오픈 예정 안내)에 있다.
 */
export const NOTICE_LINK: NavPage = { href: "/notices", label: "대관 공지", loginRequired: true };

/** 우측 — 지원. 여정의 한 단계가 아니라 어느 단계에서든 쓰는 도구다. */
export const SUPPORT_MENU: NavCategory = {
  label: "지원",
  pages: [
    { href: "/faq", label: "FAQ", loginRequired: true },
    { href: "/mypage/inquiries", label: "1:1 문의", loginRequired: true },
  ],
};

/**
 * 우측 — 계정. 드롭다운을 두지 않고 `○○○ 님` 자체가 마이페이지 링크다.
 * 마이페이지 안에 좌측 메뉴가 있으므로 상단바에서 같은 목록을 또 펼칠 이유가 없다.
 */
export const ACCOUNT_HREF = "/mypage";

/**
 * 푸터 사이트맵 — 중앙 2묶음 + 신청 + 지원.
 * 푸터는 상단바와 달리 **전체 목록**이라, 상단에서 꺼낸 공지사항도 지원 묶음에 함께 싣는다.
 */
export const FOOTER_CATEGORIES: NavCategory[] = [
  ...NAV_CATEGORIES,
  ...(NAV_ACTION_HIDDEN
    ? []
    : [{ label: "Book It", pages: [{ href: NAV_ACTION.href, label: "대관 신청", loginRequired: true }] }]),
  { ...SUPPORT_MENU, pages: [NOTICE_LINK, ...SUPPORT_MENU.pages] },
];

/* --------------------------------------------------------------- 탭 축 --- */

/** 공간 축 — 시설 제원·대관료·대관 자료가 공유한다. 기본 탭은 아레나. */
export const VENUE_TAB_PARAM = "venue";
export const VENUE_TABS = [
  { value: "arena", label: "아레나" },
  { value: "live-hall", label: "중형공연장" },
] as const;
export type VenueTabValue = (typeof VENUE_TABS)[number]["value"];

/** 내용 축 — 서울아레나(시설개요 / 시설 특징), 대관료·대관 자료(아레나 / 중형공연장) */
export const CONTENT_TAB_PARAM = "tab";
