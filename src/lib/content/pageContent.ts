import {
  ABOUT_LEAD,
  ARENA_CAPACITY,
  ARENA_FACILITIES,
  ARENA_OVERVIEW,
  COMPLEX_FEATURES,
  COMPLEX_FEATURES_LEAD,
  LIVE_HALL_CAPACITY,
  LIVE_HALL_FACILITIES,
  LIVE_HALL_OVERVIEW,
  STAGE_FEATURES,
  VENUE_HEROES,
  WHY_LEAD,
} from "./venueFacts";
import { GUIDE_LEAD, RENTAL_PROCESS } from "./processFacts";
import {
  ARENA_ADDITIONAL_CHARGES,
  ARENA_LIMITS,
  ARENA_RATES,
  ARENA_RATE_INCLUDES,
  ARENA_RATE_NOTES,
  ARENA_RENTAL_PERIOD,
  LIVE_HALL_ADDITIONAL_CHARGES,
  LIVE_HALL_LIMITS,
  LIVE_HALL_RATES,
  LIVE_HALL_RATE_INCLUDES,
  LIVE_HALL_RATE_NOTES,
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

export interface CapacityBlock {
  /** 무대 배치 이름. 비우면 배치 구분 없이 표만 나온다 */
  stage: string;
  seated: string;
  standing: string;
  floors: Pair[];
}

export interface VenueFacilityContent {
  overview: Pair[];
  capacity: CapacityBlock[];
  features: FeatureBlock[];
  facilities: Pair[];
}

export interface FeaturesContent {
  arena: VenueFacilityContent;
  liveHall: VenueFacilityContent;
}

export const DEFAULT_FEATURES_CONTENT: FeaturesContent = {
  arena: {
    overview: ARENA_OVERVIEW.map((c) => ({ label: c.label, value: c.value })),
    capacity: ARENA_CAPACITY.map((c) => ({
      stage: c.stage,
      seated: c.seated,
      standing: c.standing,
      floors: c.floors.map(([label, value]) => ({ label, value })),
    })),
    features: STAGE_FEATURES.map((f) => ({ title: f.title, lines: [...f.lines] })),
    facilities: ARENA_FACILITIES.map((f) => ({ label: f.label, value: f.desc ?? "" })),
  },
  liveHall: {
    overview: LIVE_HALL_OVERVIEW.map((c) => ({ label: c.label, value: c.value })),
    capacity: LIVE_HALL_CAPACITY.map((c) => ({
      stage: c.stage,
      seated: c.seated,
      standing: c.standing,
      floors: c.floors.map(([label, value]) => ({ label, value })),
    })),
    features: [],
    facilities: LIVE_HALL_FACILITIES.map((f) => ({ label: f.label, value: f.desc ?? "" })),
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

export interface VenueRateContent {
  /** 요금표 행 이름 (최대 수용인원 · 대관료 …) */
  rowLabels: string[];
  columns: RateColumn[];
  /** Details 토글 안 행 이름 */
  detailLabels: string[];
  detailColumns: RateColumn[];
  rentalPeriod: string;
  includes: Pair[];
  charges: ChargeBlock[];
  limits: Pair[];
  notes: string[];
}

export interface RatesContent {
  arena: VenueRateContent;
  liveHall: VenueRateContent;
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export const DEFAULT_RATES_CONTENT: RatesContent = {
  arena: {
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
    charges: ARENA_ADDITIONAL_CHARGES.map((c) => ({ ...c, note: c.note ?? "" })),
    limits: ARENA_LIMITS.map(([label, value]) => ({ label, value })),
    notes: [...ARENA_RATE_NOTES],
  },
  liveHall: {
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
    charges: LIVE_HALL_ADDITIONAL_CHARGES.map((c) => ({ ...c, note: c.note ?? "" })),
    limits: LIVE_HALL_LIMITS.map(([label, value]) => ({ label, value })),
    notes: [...LIVE_HALL_RATE_NOTES],
  },
};

/* --------------------------------------------- 화면 문구 (`screenText`) --- */

/**
 * 페이지 하나를 위한 콘텐츠 편집기가 없는 화면들의 문구.
 * 공지사항·FAQ·대관 신청·오시는 길처럼 본문이 게시물이나 폼인 화면도
 * 상단 리드 한 줄은 운영자가 고쳐야 하므로 여기 모아 둔다.
 */
export interface ScreenTextContent {
  noticesLead: string;
  noticesEmptyDesc: string;
  faqLead: string;
  applyLead: string;
  locationLead: string;
  locationRows: Pair[];
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
};

export interface ParsedRuleChapter {
  id: string;
  title: string;
  articles: { title: string; paragraphs: string[] }[];
}

const RE_CHAPTER = /^제\s*\d+\s*장/;
const RE_ARTICLE = /^제\s*\d+\s*조/;

/** 규약 원문을 장·조로 파싱한다. 장·조로 시작하지 않는 줄은 직전 조의 항이 된다. */
export function parseRules(body: string): ParsedRuleChapter[] {
  const chapters: ParsedRuleChapter[] = [];
  let chapter: ParsedRuleChapter | null = null;
  let article: { title: string; paragraphs: string[] } | null = null;

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (RE_CHAPTER.test(line)) {
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
