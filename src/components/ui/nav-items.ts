/**
 * 사이트 정보구조 — 헤더 메뉴와 푸터가 같은 정의를 쓴다.
 *
 * YOUR STAGE / BOOK IT / KNOW IT / HOST IT 은 **카테고리 타이틀일 뿐 페이지가 아니다.**
 * 실제 페이지는 각 카테고리의 pages 목록이고, 이 목록이 유일한 기준이다.
 * 로그인·회원가입은 콘텐츠 페이지가 아니라 계정 동작이라 여기에 넣지 않고
 * 메뉴 하단 계정 행과 푸터 하단에서 따로 다룬다.
 *
 * 2026-08 재구성 — Notion 「대관 사이트 8/20 오픈 기준 정보구조 재구성」 확정안.
 * 내용 카테고리로 페이지를 나누고 공간(아레나 / 중형공연장)은 페이지 안의 탭으로 전환한다.
 * 공간별 페이지를 따로 두지 않는다.
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

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Your Stage",
    pages: [
      { href: "/seoularena", label: "서울아레나" },
      { href: "/features", label: "시설 소개", loginRequired: true },
    ],
  },
  {
    label: "Book It",
    pages: [
      { href: "/guide", label: "대관 안내", loginRequired: true },
      { href: "/rates", label: "대관료", loginRequired: true },
      { href: "/rules", label: "대관 규약", loginRequired: true },
      { href: "/documents", label: "대관 자료", loginRequired: true },
    ],
  },
  {
    label: "Know It",
    pages: [
      { href: "/notices", label: "공지사항", loginRequired: true },
      { href: "/faq", label: "FAQ", loginRequired: true },
      { href: "/mypage/inquiries", label: "1:1 문의", loginRequired: true },
    ],
  },
  {
    label: "Host It",
    pages: [
      { href: "/apply", label: "대관 신청", loginRequired: true },
      { href: "/mypage/process", label: "대관 신청 현황", loginRequired: true },
      { href: "/mypage/history", label: "대관 진행 내역", loginRequired: true },
    ],
  },
];

/* --------------------------------------------------------------- 탭 축 --- */

/** 공간 축 — 시설 소개·대관료·대관 자료가 공유한다. 기본 탭은 아레나. */
export const VENUE_TAB_PARAM = "venue";
export const VENUE_TABS = [
  { value: "arena", label: "아레나" },
  { value: "live-hall", label: "중형공연장" },
] as const;
export type VenueTabValue = (typeof VENUE_TABS)[number]["value"];

/** 내용 축 — 서울아레나(시설개요 / 시설 특징), 대관 안내(대관 안내 / 대관 절차) */
export const CONTENT_TAB_PARAM = "tab";
