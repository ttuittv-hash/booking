import {
  ABOUT_LEAD,
  ARENA_CAPACITY,
  ARENA_FLOOR_SEATING,
  ARENA_OVERVIEW,
  ARENA_SPEC_GROUPS,
  COMPLEX_FEATURES,
  COMPLEX_FEATURES_LEAD,
  LIVE_HALL_CAPACITY,
  LIVE_HALL_OVERVIEW,
  LIVE_HALL_SPEC_GROUPS,
  STAGE_FEATURES,
  VENUE_HEROES,
  WHY_LEAD,
} from "./venueFacts";
import { GUIDE_LEAD, RENTAL_PROCESS } from "./processFacts";
import {
  ARENA_ADDITIONAL_CHARGES,
  ARENA_INCLUDES_LEAD,
  ARENA_INCLUDE_GROUPS,
  ARENA_RATES,
  ARENA_RATE_INCLUDES,
  ARENA_RATE_INTRO,
  ARENA_RATE_NOTES,
  ARENA_RENTAL_PERIOD,
  ARENA_STANDARD_CONDITIONS,
  LIVE_HALL_ADDITIONAL_CHARGES,
  LIVE_HALL_INCLUDES_LEAD,
  LIVE_HALL_INCLUDE_GROUPS,
  LIVE_HALL_RATES,
  LIVE_HALL_RATE_INCLUDES,
  LIVE_HALL_RATE_INTRO,
  LIVE_HALL_RATE_NOTES,
  LIVE_HALL_STANDARD_CONDITIONS,
} from "./rateFacts";
import {
  ARENA_DOCUMENTS,
  DOCUMENTS_EMPTY_NOTE,
  DOCUMENTS_LEAD,
  FACILITY_DOCUMENTS,
  LIVE_HALL_DOCUMENTS,
} from "./documentFacts";
import { RULES_EFFECTIVE_DATE, RULES_TITLE, RULES_VERSION, RULE_CHAPTERS } from "./rulesFacts";

/* ============================================================================
   페이지 콘텐츠 — 운영자가 백오피스에서 편집하는 값.

   `site_content` 테이블에 페이지 키별 JSON 으로 저장한다. 저장된 값이 없거나
   일부만 있으면 아래 기본값(= Notion 콘텐츠 전문 · 요금 시트 · 규약 PDF 에서 옮긴 값)으로
   채운다. 화면은 항상 이 모듈을 거쳐 읽으므로 편집한 내용이 곧바로 반영된다.

   *Facts 모듈은 **초기값의 출처**이고, 운영 중 정본은 DB 다.
   ========================================================================= */

/* ------------------------------------------------------- 공용 조각 타입 --- */

export interface Pair {
  label: string;
  value: string;
}

export interface FeatureBlock {
  title: string;
  /** 설명 줄 — 한 줄씩 나눠 담는다 */
  lines: string[];
}

/* ------------------------------------------ 서울아레나 (`/seoularena`) --- */

export interface VenueHeroBlock {
  title: string;
  eyebrow: string;
  desc: string;
  /** 전면 배경 사진. 비우면 회색 플레이스홀더가 나온다 */
  image: string | null;
}

export interface SeoulArenaContent {
  /** 시설개요 탭 리드 (리치텍스트) */
  aboutLead: string;
  heroes: VenueHeroBlock[];
  complexFeaturesLead: string;
  complexFeatures: string[];
  /** 시설 특징 탭 리드 (리치텍스트) */
  whyLead: string;
  stageFeatures: FeatureBlock[];
}

export const DEFAULT_SEOULARENA_CONTENT: SeoulArenaContent = {
  aboutLead: ABOUT_LEAD,
  heroes: VENUE_HEROES.map((h) => ({ ...h })),
  complexFeaturesLead: COMPLEX_FEATURES_LEAD,
  complexFeatures: COMPLEX_FEATURES.map((f) => f.title),
  whyLead: WHY_LEAD,
  stageFeatures: STAGE_FEATURES.map((f) => ({ title: f.title, lines: [...f.lines] })),
};

/* ---------------------------------------------- 시설 소개 (`/features`) --- */

/** 라벨/값에 부연 한 줄이 더 붙는 행. `Pair` 의 상위 호환이라 예전 저장본도 그대로 읽힌다 */
export interface SpecRow extends Pair {
  note?: string;
}

export interface CapacityBlock {
  /** 무대 배치 이름. 비우면 배치 구분 없이 수치만 나온다 */
  stage: string;
  /** 카드 부제 — 이 구성이 어떤 공연에 맞는지 한 줄 */
  desc?: string;
  seated: string;
  standing: string;
  /** 층별 내역. 비우면 SEATED/STANDING 만 나온다 */
  floors: SpecRow[];
}

/** 부대시설 카드 한 장 — 카테고리 제목 + [시설명 · 부연] 목록 */
export interface FacilityGroup {
  title: string;
  items: Pair[];
}

/** 4칼럼 스펙 카드 — 라벨 / 큰 수치 / 설명 */
export interface SpecCard {
  label: string;
  value: string;
  desc: string;
}

/** 스펙 카드 섹션 하나 (PRODUCTION & RIGGING · LOAD-IN & SUPPORT …) */
export interface SpecCardGroup {
  title: string;
  cards: SpecCard[];
}

export interface VenueFacilityContent {
  overview: Pair[];
  capacity: CapacityBlock[];
  /** FLOOR & SEATING — 라인으로 나뉜 층별 구성 */
  features: FeatureBlock[];
  /** 검정 지면 위 4칼럼 스펙 카드 섹션들 */
  specGroups: SpecCardGroup[];
  facilityGroups: FacilityGroup[];
}

/**
 * 시설 제원 콘텐츠 판번호.
 *
 * 2026-09-02 디자인 개편으로 섹션 구성이 통째로 바뀌었다(FEATURES → FLOOR & SEATING,
 * 스펙 카드 섹션 신설, 배치 카드에서 층별 표 제거). 이전 판으로 저장된 콘텐츠를
 * 필드 단위로 섞으면 옛 섹션과 새 섹션이 함께 나와 화면이 무너지므로,
 * 판번호가 다르면 기본값을 통째로 쓴다(`getFeaturesContent`).
 */
export const FEATURES_CONTENT_VERSION = 2;

export interface FeaturesContent {
  /** 없으면 개편 이전 저장본이다 */
  version?: number;
  arena: VenueFacilityContent;
  liveHall: VenueFacilityContent;
}

const capacityBlocks = (rows: typeof ARENA_CAPACITY): CapacityBlock[] =>
  rows.map((c) => ({
    stage: c.stage,
    desc: c.desc,
    seated: c.seated,
    standing: c.standing,
    floors: c.floors.map(([label, value, note]) => ({ label, value, ...(note ? { note } : {}) })),
  }));

const specGroups = (groups: typeof ARENA_SPEC_GROUPS): SpecCardGroup[] =>
  groups.map((g) => ({ title: g.title, cards: g.cards.map((c) => ({ ...c })) }));

/*
  [2026-09-02 디자인 개편]
  · 아레나 ADDITIONAL FACILITIES 는 없앴다 — 그 내용(스카이박스·대기실·하역)이
    LOAD-IN & SUPPORT 스펙 카드로 옮겨 갔고, 같은 사실을 두 섹션이 말하게 되기 때문이다.
    원본 목록은 `venueFacts.ts` 의 ARENA_FACILITY_GROUPS 에 그대로 남아 있다.
  · 중형공연장 ADDITIONAL FACILITIES 는 스펙 카드 4장(임시 내용)으로 대체했다.
*/
export const DEFAULT_FEATURES_CONTENT: FeaturesContent = {
  version: FEATURES_CONTENT_VERSION,
  arena: {
    overview: ARENA_OVERVIEW.map((c) => ({ label: c.label, value: c.value })),
    capacity: capacityBlocks(ARENA_CAPACITY),
    features: ARENA_FLOOR_SEATING.map((f) => ({ title: f.title, lines: [...f.lines] })),
    specGroups: specGroups(ARENA_SPEC_GROUPS),
    facilityGroups: [],
  },
  liveHall: {
    overview: LIVE_HALL_OVERVIEW.map((c) => ({ label: c.label, value: c.value })),
    capacity: capacityBlocks(LIVE_HALL_CAPACITY),
    features: [],
    specGroups: specGroups(LIVE_HALL_SPEC_GROUPS),
    facilityGroups: [],
  },
};

/* ------------------------------------------------- 대관 절차 (`/guide`) --- */

export interface ProcessBlock {
  no: string;
  title: string;
  desc: string;
}

export interface GuidePageContent {
  intro: string;
  process: ProcessBlock[];
}

export const DEFAULT_GUIDE_PAGE_CONTENT: GuidePageContent = {
  intro: GUIDE_LEAD,
  process: RENTAL_PROCESS.map((p) => ({ ...p })),
};

/* --------------------------------------------------- 대관료 (`/rates`) --- */

export interface RateColumn {
  key: string;
  name: string;
  /** 표에 세로로 쌓이는 행 값들 — rowLabels 와 순서가 같다 */
  values: string[];
}

export interface ChargeBlock {
  group: string;
  item: string;
  cost: string;
  note: string;
}

/** 포함 항목 카드 한 장 — 카드 제목 + [항목 / 설명] 행 */
export interface RateIncludeGroup {
  title: string;
  rows: Pair[];
}

export interface VenueRateContent {
  /** 섹션 1 리드 — 패키지 카드 위 한 문단 */
  intro: string;
  /** 요금표 행 이름 (최대 수용인원 · 대관료 …) */
  rowLabels: string[];
  columns: RateColumn[];
  /** Details 토글 안 행 이름 */
  detailLabels: string[];
  detailColumns: RateColumn[];
  rentalPeriod: string;
  /**
   * 대관료에 무상 포함되는 항목의 **평면 목록**.
   * 대관료 화면은 아래 `includeGroups`(카드)를 쓰지만, 이 필드는 지우면 안 된다 —
   * 중형공연장 **대관 신청 위저드**의 「기본 항목」 박스(`StepConfigOptions`)와
   * 어드민 `PackagesForm` 이 이 값을 그대로 읽는다.
   */
  includes: Pair[];
  /** 섹션 2 리드 */
  includesLead: string;
  /** 섹션 2 — 카드 한 장씩. 대관료 화면 전용이다 */
  includeGroups: RateIncludeGroup[];
  charges: ChargeBlock[];
  /** 섹션 3 기본 이용 기준 — 라벨/값/부연 */
  limits: SpecRow[];
  notes: string[];
}

/**
 * 대관료 콘텐츠 판번호 — 시설 제원과 같은 이유다.
 * 2026-09-02 개편으로 섹션 구성(원칼럼 · 포함 항목 카드화 · 기본 이용 기준 4-up)이
 * 바뀌어 이전 저장본을 필드 단위로 섞으면 빈 섹션이 생긴다.
 */
export const RATES_CONTENT_VERSION = 2;

export interface RatesContent {
  /** 없으면 개편 이전 저장본이다 */
  version?: number;
  arena: VenueRateContent;
  liveHall: VenueRateContent;
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

const includeGroups = (groups: typeof ARENA_INCLUDE_GROUPS): RateIncludeGroup[] =>
  groups.map((g) => ({ title: g.title, rows: g.rows.map(([label, value]) => ({ label, value })) }));

const conditions = (rows: typeof ARENA_STANDARD_CONDITIONS): SpecRow[] =>
  rows.map(([label, value, note]) => ({ label, value, note }));

export const DEFAULT_RATES_CONTENT: RatesContent = {
  version: RATES_CONTENT_VERSION,
  arena: {
    intro: ARENA_RATE_INTRO,
    rowLabels: ["최대 수용인원", "권장 무대 형태", "권장 객석 형태", "대관료"],
    columns: ARENA_RATES.map((r) => ({
      key: r.key,
      name: r.name,
      values: [r.capacity, r.stageType, r.seatingType, won(r.total)],
    })),
    detailLabels: [
      "셋업일 전용 사용료",
      "공연일 전용 사용료",
      "시설 사용료",
      "셋업 변경 대관료",
      "공연 변경 대관료",
    ],
    detailColumns: ARENA_RATES.map((r) => ({
      key: r.key,
      name: r.name,
      values: [r.setupExclusive, r.showExclusive, r.facility, r.setupChange, r.showChange],
    })),
    rentalPeriod: ARENA_RENTAL_PERIOD,
    includes: ARENA_RATE_INCLUDES.map(([label, value]) => ({ label, value })),
    includesLead: ARENA_INCLUDES_LEAD,
    includeGroups: includeGroups(ARENA_INCLUDE_GROUPS),
    charges: ARENA_ADDITIONAL_CHARGES.map((c) => ({ ...c, note: c.note ?? "" })),
    limits: conditions(ARENA_STANDARD_CONDITIONS),
    notes: [...ARENA_RATE_NOTES],
  },
  liveHall: {
    intro: LIVE_HALL_RATE_INTRO,
    rowLabels: ["대관료"],
    columns: LIVE_HALL_RATES.map((r) => ({ key: r.key, name: r.name, values: [r.total] })),
    detailLabels: ["전용 사용료 / 일당", "시설 사용료 / 일당"],
    detailColumns: LIVE_HALL_RATES.map((r) => ({
      key: r.key,
      name: r.name,
      values: [r.exclusive, r.facility],
    })),
    rentalPeriod: "",
    includes: LIVE_HALL_RATE_INCLUDES.map(([label, value]) => ({ label, value })),
    includesLead: LIVE_HALL_INCLUDES_LEAD,
    includeGroups: includeGroups(LIVE_HALL_INCLUDE_GROUPS),
    charges: LIVE_HALL_ADDITIONAL_CHARGES.map((c) => ({ ...c, note: c.note ?? "" })),
    limits: conditions(LIVE_HALL_STANDARD_CONDITIONS),
    notes: [...LIVE_HALL_RATE_NOTES],
  },
};

/* --------------------------------------------- 화면 문구 (`screenText`) --- */

/**
 * 페이지 하나를 위한 콘텐츠 편집기가 없는 화면들의 문구.
 * 공지사항·FAQ·대관 신청·오시는 길처럼 본문이 게시물이나 폼인 화면도
 * 상단 리드 한 줄은 운영자가 고쳐야 하므로 여기 모아 둔다.
 */
/**
 * 대관 신청 위저드 각 STEP의 제목·리드 문구 — StepHeading(제목 + 리드)을 쓰는
 * 화면과, 리드 없이 제목만 있는 화면을 함께 담는다(2026-08-24, "대관 위저드
 * 프로세스에서 시스템 메시지들이 많은데 이런 부분도 운영툴에서 수정할수
 * 있도록"). 위저드 컴포넌트는 이 값을 기본값처럼 그대로 쓴다 — 값이 비어
 * 있어도 별도 fallback을 두지 않는다(다른 screenText 필드와 동일한 규칙).
 */
export interface WizardStepTexts {
  venuePickerTitle: string;
  venuePickerLead: string;
  configArenaTitle: string; // 리드는 선택한 패키지 정보로 동적 생성돼 편집 대상이 아니다
  configMidHallOnlyTitle: string;
  configMidHallOnlyLead: string;
  configSimultaneousTitle: string;
  configSimultaneousLead: string;
  audienceTitle: string;
  audienceLead: string;
  performanceInfoTitle: string;
  publicInterestTitle: string;
  marketingTitle: string;
  marketingLead: string;
  safetyPledgeTitle: string;
  safetyPledgeLead: string;
  estimateTitle: string;
  submitNewTitle: string;
  submitNewLead: string;
  submitEditingTitle: string;
  submitEditingLead: string;
}

export const DEFAULT_WIZARD_STEP_TEXTS: WizardStepTexts = {
  venuePickerTitle: "공간 선택",
  venuePickerLead: "아레나, 중형공연장, 동시 대관 중 이용할 공간을 선택하세요.",
  configArenaTitle: "아레나",
  configMidHallOnlyTitle: "구성 · 옵션",
  configMidHallOnlyLead:
    "중형공연장은 패키지가 없는 일 단위 요금제입니다 — 아래는 예약 일수와 무관하게 항상 포함되는 기본 구성입니다.",
  configSimultaneousTitle: "구성 · 옵션",
  configSimultaneousLead: "동시 대관은 두 공간의 구성이 서로 달라 탭으로 나눠 보여줍니다.",
  audienceTitle: "규모",
  audienceLead: "관객 수는 공간별로 자동 산정됩니다.",
  performanceInfoTitle: "신청자 정보",
  publicInterestTitle: "공공/공익 참여 여부",
  marketingTitle: "홍보 및 서비스 계획",
  marketingLead: "프로모션 및 협업 관련 정보를 입력해 주세요.",
  safetyPledgeTitle: "안전관리 서약서",
  safetyPledgeLead: "공연 안전 관리를 위한 서약 항목을 확인하고 동의해 주세요.",
  estimateTitle: "예상 대관료",
  submitNewTitle: "최종 제출",
  submitNewLead: "아래 산출내역으로 대관 신청서가 생성됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다.",
  submitEditingTitle: "신청서 수정",
  submitEditingLead: "아래 산출내역으로 신청서 내용이 수정됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다.",
};

/* ---------------------------------------------- 회원가입 STEP1 안내 카드 --- */

/**
 * 회원가입 첫 화면(STEP1)의 안내 카드. 가입 조건·심사 흐름은 운영하면서 계속 다듬게 되는
 * 문구라 코드에 박아 두지 않고 백오피스에서 고칠 수 있게 한다(2026-08-30).
 * 카드 자체가 "기업회원으로 가입하기" 버튼이므로 항목 수는 자유롭게 늘리고 줄일 수 있다.
 */
export interface RegisterIntroTexts {
  /** 화면 제목. 고를 유형이 하나뿐이라 "선택하세요" 가 아니다 */
  heading: string;
  /** 카드 왼쪽 위 작은 표시 */
  badge: string;
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  /** 카드 아래 한 줄 — 개인회원을 아직 받지 않는다는 안내 */
  individualNote: string;
}

export const DEFAULT_REGISTER_INTRO: RegisterIntroTexts = {
  heading: "기업회원으로 가입합니다.",
  badge: "가입 가능",
  title: "기업회원",
  // [개정 2026-09-02] 한 기업에서 여러 담당자가 들어오는 구조(대표 담당자 → 구성원 추가)를
  // 안내에 명시한다. 예전 문구는 회사의 첫 가입자 경로만 설명해, 이미 등록된 기업의
  // 담당자가 자기도 가입할 수 있는지 알 수 없었다.
  subtitle: "사업자등록증이 있는 법인 · 개인사업자 및 소속 임직원",
  bullets: [
    "공연 기획사 · 제작사 · 대행사 등 대관 업무 관련 기업의 담당자",
    "기업에서 최초로 승인된 가입자가 대표 담당자로 지정됩니다.",
    "대표 담당자는 소속 임직원을 구성원으로 추가할 수 있습니다.",
    "이미 등록된 기업의 담당자는 개인 정보만 추가 입력하여 가입할 수 있습니다.",
    "가입 신청 후 심사를 거쳐 승인 시 이용 가능",
    "대관 신청 · 계약 · 정산 전 과정 이용",
  ],
  cta: "기업회원으로 가입하기",
  individualNote:
    "사업자등록증이 없는 개인 회원 가입은 준비 중입니다. 열리면 공지사항으로 안내드립니다.",
};

export interface ScreenTextContent {
  noticesLead: string;
  noticesEmptyDesc: string;
  faqLead: string;
  applyLead: string;
  locationLead: string;
  locationRows: Pair[];
  wizardSteps: WizardStepTexts;
  /** 회원가입 STEP1 안내 카드 */
  registerIntro: RegisterIntroTexts;
  /**
   * [2026-08-25] "모든 텍스트 수정 가능" — 위저드 스텝 제목·리드(20개, wizardSteps) 밖의
   * 나머지 문구(체크박스 라벨, 안내 문단, 서약 조항 전문 등)는 필드를 하나하나 타입으로
   * 선언하지 않고 key → 값의 평평한 맵으로 둔다. 각 스텝 컴포넌트는 useWizardText()의
   * t(key, fallback)/tStr(key, fallback)로 문자열을 읽고, 여기 맵에 key가 없으면
   * fallback(컴포넌트에 남아있는 원래 한국어 문구)을 그대로 쓴다 — 그래서 이 맵은 항상
   * 빈 값({})에서 시작해도 되고, 관리자가 고친 문구만 여기 쌓인다.
   */
  wizardStrings: Record<string, string>;
}

export const DEFAULT_SCREEN_TEXT_CONTENT: ScreenTextContent = {
  noticesLead: "대관 접수 일정과 변경 사항, 시설·요금 안내를 확인하세요.",
  noticesEmptyDesc: "대관 공고와 운영 안내가 등록되면 이곳에 표시됩니다.",
  faqLead:
    "신청부터 심의, 계약·정산, 공연 당일까지 자주 묻는 질문을 단계별로 모았습니다. " +
    "찾는 내용이 없다면 1:1 문의로 남겨 주세요.",
  applyLead: "주차와 규모를 입력하면 예상 대관료를 바로 확인하고, 그대로 신청서까지 제출할 수 있습니다.",
  locationLead: "주소 · 대중교통 · 주차 안내는 준비 중입니다. 확정되는 대로 이 페이지에 업데이트됩니다.",
  locationRows: [
    { label: "주소", value: "서울특별시 도봉구 창동 1-24" },
    { label: "대중교통", value: "확정 후 안내" },
    { label: "주차", value: "확정 후 안내" },
  ],
  wizardStrings: {},
  wizardSteps: DEFAULT_WIZARD_STEP_TEXTS,
  registerIntro: DEFAULT_REGISTER_INTRO,
};

/* ---------------------------------------------- 대관 자료 (`/documents`) - */

export interface DocumentBlock {
  title: string;
  desc: string;
  /** [라벨, 값] 메타 — 형식·버전·갱신일 */
  meta: Pair[];
  /** 업로드된 파일 경로. 비우면 pendingNote 가 대신 나온다 */
  href: string;
  pendingNote: string;
}

export interface DocumentsContent {
  lead: string;
  /** 시설소개 탭 — 두 공간을 함께 담은 자료 */
  facility: DocumentBlock[];
  arena: DocumentBlock[];
  liveHall: DocumentBlock[];
  /** 목록이 빈 탭에 나오는 한 줄 */
  emptyNote: string;
}

function toDocBlock(d: (typeof ARENA_DOCUMENTS)[number]): DocumentBlock {
  return {
    title: d.title,
    desc: d.desc ?? "",
    meta: (d.meta ?? []).map(([label, value]) => ({ label, value })),
    href: d.href ?? "",
    pendingNote: d.pendingNote ?? "",
  };
}

export const DEFAULT_DOCUMENTS_CONTENT: DocumentsContent = {
  lead: DOCUMENTS_LEAD,
  facility: FACILITY_DOCUMENTS.map(toDocBlock),
  arena: ARENA_DOCUMENTS.map(toDocBlock),
  liveHall: LIVE_HALL_DOCUMENTS.map(toDocBlock),
  emptyNote: DOCUMENTS_EMPTY_NOTE,
};

/* ------------------------------------------------- 대관 규약 (`/rules`) -- */

/**
 * 규약은 조문을 한 칸씩 편집하는 문서가 아니라 **판본을 통째로 갈아 끼우는** 문서다.
 * 그래서 원문을 그대로 붙여 넣는 한 칸으로 두고, 렌더할 때 장·조로 파싱한다.
 * 파싱 규칙은 `parseRules()` 참조.
 */
export interface RulesContent {
  title: string;
  version: string;
  effectiveDate: string;
  /** 페이지 상단 리드 — 운영자가 콘텐츠 관리에서 고친다 */
  intro: string;
  /** 판본 아래 안내 박스 문구 */
  revisionNote: string;
  /** 규약 전문 — `제N장 …` / `제N조 (…)` 로 시작하는 줄이 제목이 된다 */
  body: string;
  /**
   * 내려받기용 규약 파일 (2026-09-02). 콘텐츠 관리에서 올리면 채워지고, 비어 있으면
   * 화면에 내려받기 버튼이 나오지 않는다. 웹 본문(body)이 정본이고 이 파일은 사본이다 —
   * 규약을 고칠 때 파일도 함께 올려야 둘이 어긋나지 않는다.
   */
  fileUrl: string;
  /** 내려받을 때 쓸 원본 파일명 */
  fileName: string;
}

function chaptersToText(): string {
  return RULE_CHAPTERS.map((ch) =>
    [ch.title, ...ch.articles.flatMap((a) => [a.title, ...a.paragraphs])].join("\n"),
  ).join("\n");
}

export const DEFAULT_RULES_CONTENT: RulesContent = {
  title: RULES_TITLE,
  version: RULES_VERSION,
  effectiveDate: RULES_EFFECTIVE_DATE,
  intro:
    `${RULES_TITLE} 전문입니다. 대관을 신청하시면 이 규약에 동의하신 것으로 보며, ` +
    "신청서 제출 단계에서 동의를 확인합니다.",
  revisionNote:
    "개정된 내용은 홈페이지 공지 또는 별도 통지 중 빠른 시점 이후 신규 체결되는 " +
    "대관계약부터 적용합니다. 이미 체결된 대관계약에는 계약 체결 시점의 규약을 적용합니다.",
  body: chaptersToText(),
  fileUrl: "",
  fileName: "",
};

export interface ParsedRuleChapter {
  id: string;
  title: string;
  articles: { title: string; paragraphs: string[] }[];
}

const RE_CHAPTER = /^제\s*\d+\s*장/;
const RE_ARTICLE = /^제\s*\d+\s*조/;
// [신규 2026-09-02] 부칙도 목차에 오른다. 장 번호가 없어 RE_CHAPTER 에 걸리지 않아
// 본문에는 있는데 좌측 목차에서만 빠졌고, 시행일을 찾으려면 끝까지 스크롤해야 했다.
// "부칙" 한 단어이거나 "부칙 (2026.9.1.)" 처럼 뒤에 날짜가 붙는 형태를 받는다.
const RE_ADDENDUM = /^부\s*칙(\s|$|[(（])/;

/** 규약 원문을 장·조로 파싱한다. 장·조로 시작하지 않는 줄은 직전 조의 항이 된다. */
export function parseRules(body: string): ParsedRuleChapter[] {
  const chapters: ParsedRuleChapter[] = [];
  let chapter: ParsedRuleChapter | null = null;
  let article: { title: string; paragraphs: string[] } | null = null;

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (RE_CHAPTER.test(line) || RE_ADDENDUM.test(line)) {
      chapter = { id: `chapter-${chapters.length + 1}`, title: line, articles: [] };
      chapters.push(chapter);
      article = null;
      continue;
    }
    if (RE_ARTICLE.test(line)) {
      if (!chapter) {
        chapter = { id: "chapter-1", title: "총칙", articles: [] };
        chapters.push(chapter);
      }
      article = { title: line, paragraphs: [] };
      chapter.articles.push(article);
      continue;
    }
    if (article) article.paragraphs.push(line);
  }
  return chapters;
}
