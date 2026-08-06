export interface VenueHall {
  no: string;
  title: string;
  titleEn: string;
  stat: string;
  desc: string;
  image: string | null;
}

export interface VenueSpec {
  name: string;
  rows: [string, string][];
  image: string | null;
}

export interface VenueAmenity {
  name: string;
  desc: string;
  image: string | null;
  featured: boolean;
}

export interface VenueKeyMap {
  url: string;
  label: string;
}

export interface VenueHighlightCard {
  title: string;
  desc: string;
  image: string | null;
}

export interface VenueHighlight {
  badges: string[];
  highlightBadge: string;
  title: string;
  subtitle: string;
  cards: VenueHighlightCard[];
}

export interface VenueContent {
  intro: string;
  overviewIntro: string;
  halls: VenueHall[];
  features: string[];
  specsIntro: string;
  specs: VenueSpec[];
  specHighlights: VenueHighlight[];
  providedFacilities: string[];
  arenaAmenities: VenueAmenity[];
  mediumHallAmenities: VenueAmenity[];
  amenityGallery: VenueKeyMap[];
  keyMaps: VenueKeyMap[];
}

export interface GuideStep {
  no: string;
  title: string;
  desc: string;
}

export interface GuideContent {
  intro: string;
  steps: GuideStep[];
  notices: string[];
  packageIntro: string;
  packageBullets: string[];
  rulesIntro: string;
}

/**
 * 브랜드 내러티브 진술.
 * 카카오 브랜드 가이드라인 3.4 "브랜드 선언문: BUSINESS › HOST IT." 본문을
 * 근거 페이지로 연결되는 블록 단위로 나눈 것.
 * 기존 MISSION / VISION / STRATEGY(MVC) 구조를 대체한다.
 */
export interface HomeNarrativeStatement {
  title: string;
  desc: string;
  /** 이 진술을 뒷받침하는 제원·안내 페이지 */
  href: string;
  linkLabel: string;
  image: string | null;
}

export interface HomeProcessStep {
  no: string;
  title: string;
  desc: string;
}

export interface HomeContent {
  heroImage: string | null;
  /** 영문 디스플레이 (Notion 대관 사이트 기획 히어로 후보안) */
  heroTitle: string;
  /** 국문 리드 — 브랜드 가이드라인 문장 */
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
  processLabel: string;
  processTitle: string;
  processSteps: HomeProcessStep[];
}
