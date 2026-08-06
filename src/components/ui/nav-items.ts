/**
 * 사이트 정보구조 — 헤더 메뉴와 푸터가 같은 정의를 쓴다.
 *
 * YOUR STAGE / BOOK IT / KNOW IT / HOST IT 은 **카테고리 타이틀일 뿐 페이지가 아니다.**
 * 실제 페이지는 각 카테고리의 pages 목록이고, 이 목록이 유일한 기준이다.
 * 로그인·회원가입은 콘텐츠 페이지가 아니라 계정 동작이라 여기에 넣지 않고
 * 메뉴 하단 계정 행과 푸터 하단에서 따로 다룬다.
 */
export interface NavPage {
  href: string;
  label: string;
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
      { href: "/venue", label: "시설 개요" },
      { href: "/venue/specs", label: "시설 제원" },
      { href: "/venue/stage-features", label: "무대 특장" },
      { href: "/venue/amenities", label: "부대시설" },
    ],
  },
  {
    label: "Book It",
    pages: [
      { href: "/guide", label: "대관 안내" },
      { href: "/packages", label: "대관 패키지" },
      { href: "/guide/forms", label: "대관 양식함" },
      { href: "/guide/image-guide", label: "이미지 가이드" },
    ],
  },
  {
    label: "Know It",
    pages: [
      { href: "/notices", label: "공지사항" },
      { href: "/faq", label: "FAQ" },
      { href: "/mypage/inquiries", label: "1:1 문의" },
    ],
  },
  {
    label: "Host It",
    pages: [
      { href: "/apply", label: "대관 신청" },
      { href: "/mypage", label: "내 신청 내역" },
    ],
  },
];
