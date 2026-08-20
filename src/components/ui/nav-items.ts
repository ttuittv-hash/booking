import type { ReleasePhase } from "@/lib/release";

/**
 * 사이트 정보구조 — 헤더 메뉴와 푸터가 같은 정의를 쓴다.
 *
 * YOUR STAGE / BOOK IT / KNOW IT / HOST IT 은 **카테고리 타이틀일 뿐 페이지가 아니다.**
 * 실제 페이지는 각 카테고리의 pages 목록이고, 이 목록이 유일한 기준이다.
 * 로그인·회원가입은 콘텐츠 페이지가 아니라 계정 동작이라 여기에 넣지 않고
 * 메뉴 하단 계정 행과 푸터 하단에서 따로 다룬다.
 *
 * 2026-08 재구성 — 4 카테고리 유지 · 15 페이지 → 13 페이지.
 * 페이지는 내용 카테고리로 나누고 공간(아레나 / 중형공연장)은 페이지 안의 탭으로 전환한다.
 * 공간별 페이지(`/venue/arena`·`/venue/live-hall`)는 만들지 않는다.
 *
 * 폐지 — 대관 양식함 `/guide/forms` · 이미지 가이드 `/guide/image-guide`
 *        (둘 다 자료실 `/library` 로 흡수하고 301 리다이렉트)
 * 신설 — 자료실 `/library`
 */
export interface NavPage {
  href: string;
  label: string;
  /** 이 페이지가 열리는 시점. 미공개 페이지도 메뉴에서 숨기지 않는다 */
  phase?: ReleasePhase;
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
      { href: "/venue", label: "시설 개요", phase: "notice" },
      { href: "/venue/features", label: "무대 특장", phase: "notice" },
      { href: "/venue/specs", label: "시설 제원", phase: "open" },
      { href: "/venue/amenities", label: "부대시설", phase: "open" },
    ],
  },
  {
    label: "Book It",
    pages: [
      { href: "/guide", label: "대관 안내", phase: "notice" },
      { href: "/packages", label: "대관료", phase: "notice", loginRequired: true },
      { href: "/library", label: "자료실", phase: "notice" },
      { href: "/guide/connected-live", label: "커넥티드 라이브", phase: "open" },
    ],
  },
  {
    label: "Know It",
    pages: [
      { href: "/notices", label: "공지사항", phase: "notice" },
      { href: "/faq", label: "FAQ", phase: "notice" },
      { href: "/mypage/inquiries", label: "1:1 문의", phase: "notice" },
    ],
  },
  {
    label: "Host It",
    pages: [
      { href: "/apply", label: "대관 신청", phase: "notice" },
      { href: "/mypage", label: "내 신청 내역", phase: "open" },
    ],
  },
];

/** 공간 축 탭 — 페이지 안에서 아레나 / 중형공연장을 전환한다. 기본 탭은 아레나. */
export const VENUE_TAB_PARAM = "venue";
export const VENUE_TABS = [
  { value: "arena", label: "아레나" },
  { value: "live-hall", label: "중형공연장" },
] as const;
export type VenueTabValue = (typeof VENUE_TABS)[number]["value"];

/** YOUR STAGE 4개 페이지 — 형제 내비가 이 순서를 쓴다 */
export const VENUE_PAGES = NAV_CATEGORIES[0].pages;
