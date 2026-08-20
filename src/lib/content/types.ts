/* ============================================================================
   관리자 CMS 로 편집하는 콘텐츠 타입.

   2026-08 정보구조 재구성으로 시설 정보(YOUR STAGE 4개 페이지)와 대관 절차는
   CMS 에서 코드 정본으로 옮겼다 — `lib/content/venueFacts.ts`, `lib/content/processFacts.ts`.
   제원·절차는 마케팅 카피가 아니라 정본 문서에서 온 사실이고, 두 곳에서 편집할 수 있으면
   반드시 어긋나기 때문이다. 여기 남은 것은 실제로 자주 바뀌는 홈 카피뿐이다.
   ========================================================================= */

/**
 * 브랜드 내러티브 진술.
 * 카카오 브랜드 가이드라인 3.4 "브랜드 선언문: BUSINESS › HOST IT." 본문을 블록으로 나눈 것.
 * 근거 링크는 진술마다 붙이지 않고 섹션 하단에 한 번만 둔다.
 */
export interface HomeNarrativeStatement {
  title: string;
  desc: string;
}

export interface HomeContent {
  heroImage: string | null;
  /** 영문 디스플레이 */
  heroTitle: string;
  /** 국문 리드 — 개관 시점과 지금 할 일을 함께 말한다 */
  heroSubtitle: string;
  heroPrimaryLabel: string;
  heroPrimaryHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  narrativeLabel: string;
  narrativeTitle: string;
  narrativeLead: string;
  narrativeStatements: HomeNarrativeStatement[];
  narrativeClosing: string;
}
