/* ============================================================================
   관리자 CMS 로 편집하는 콘텐츠 타입.

   2026-08 정보구조 재구성으로 시설 정보·대관 절차·요금은 CMS 에서 코드 정본으로 옮겼다
   (`lib/content/venueFacts.ts` · `processFacts.ts` · `rateFacts.ts`).
   제원·절차·요금은 마케팅 카피가 아니라 정본 문서에서 온 사실이고, 두 곳에서 편집할 수
   있으면 반드시 어긋나기 때문이다.

   CMS 에 남긴 것은 **실제로 자주 바뀌는 리드 문구와 홈 카피**뿐이다.
   ========================================================================= */

/**
 * 브랜드 내러티브 진술.
 * 카카오 브랜드 가이드라인 3.4 "브랜드 선언문: BUSINESS › HOST IT." 본문을 블록으로 나눈 것.
 */
export interface HomeNarrativeStatement {
  title: string;
  desc: string;
}

export interface LegalContent {
  effectiveDate: string;
  bodyHtml: string;
}

export interface HomeContent {
  heroImage: string | null;
  /** 영문 디스플레이 */
  heroTitle: string;
  /** 국문 리드 */
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
