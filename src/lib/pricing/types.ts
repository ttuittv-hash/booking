// 서울아레나 대관 견적 시스템 — 도메인 타입 (명세서 3장 기준)

export type PricingType =
  | "FIXED_PER_WEEK" // 패키지 기본 대관료 (주 단위 고정가)
  | "PER_WEEK" // 초과 주차
  | "PER_HOUR" // 심야/일반 추가대관
  | "PER_PERSON" // 청소비 등 — 관객수로 자동 산출
  | "PER_MEAL" // 식사비·아티스트식사·케이터링
  | "PER_SECTION" // 수납식 객석 사용료
  | "PER_DAY" // 공간·프로덕션·홍보 대부분
  | "PER_ROOM" // 스카이박스
  | "REVENUE_PERCENT" // 온라인 송출 수수료 (매출 n%)
  | "METERED"; // 유틸리티 실사용 (사후 정산, 예상견적 제외)

export type AddonCategory =
  | "SCHEDULE" // 일정 (추가대관)
  | "SERVICE" // 서비스 (청소·식사·케이터링)
  | "FACILITY" // 시설 (수납식 객석)
  | "SPACE" // 공간 (대기실·연습실 등)
  | "PREMIUM" // 프리미엄 공간 (스카이박스)
  | "PRODUCTION" // 프로덕션 (트러스·리프트·스테이지 등)
  | "FEE" // 수수료 (온라인 송출)
  | "UTILITY" // 유틸리티 (전기·수도·냉난방)
  | "PROMOTION"; // 홍보 구좌 (디지털 매체·옥외광고)

export const ADDON_CATEGORY_LABEL: Record<AddonCategory, string> = {
  SCHEDULE: "일정",
  SERVICE: "서비스",
  FACILITY: "시설",
  SPACE: "공간",
  PREMIUM: "프리미엄 공간",
  PRODUCTION: "프로덕션",
  FEE: "수수료",
  UTILITY: "유틸리티 (실사용 정산)",
  PROMOTION: "홍보 구좌",
};

export interface PackageInclusion {
  addonId: string; // 어떤 부대시설 항목이
  quantity: number; // 몇 개/며칠 기본 포함되는지 (초과분 계산의 기준값)
  note?: string;
}

export type MediaTier = "BASIC" | "EXTENDED" | "FULL" | null;

export const MEDIA_TIER_LABEL: Record<Exclude<MediaTier, null>, string> = {
  BASIC: "A세트",
  EXTENDED: "B세트",
  FULL: "C세트",
};

// ---------------------------------------------------------------------------
// 공간(대관 공연장) — 아레나/중형공연장 등, 추후 계속 확대 예정이므로 배열에
// 항목만 추가하면 위저드·요금표 전체에 반영된다.
// ---------------------------------------------------------------------------

export interface Venue {
  id: string;
  name: string;
}

/** 중형공연장 — 유일하게 시간 단가 모델을 쓰는 공간이라 여러 곳에서 따로 분기한다. */
export const MID_HALL_VENUE_ID = "medium-hall";
/** 세 번째 공간 — 아레나와 같은 패키지 모델(2026-09-02). 화면 이름은 "패키지" */
export const SPECIAL_VENUE_ID = "special-hall";

export const VENUES: Venue[] = [
  { id: "arena", name: "아레나" },
  { id: "medium-hall", name: "중형공연장" },
  // [신규 2026-09-02] 세 번째 공간. 아레나와 같은 패키지 모델을 쓴다(공간별 패키지를
  // 운영자가 요금표에서 만든다) — 중형공연장만 시간 단가 모델이라 별도 취급이다.
  // 화면에 나가는 이름은 운영자가 문구 관리에서 바꾼다(`venueLabel`).
  { id: SPECIAL_VENUE_ID, name: "패키지" },
];

export const DEFAULT_VENUE_ID = "arena"; // venueId 미지정(기존) 데이터의 하위호환 기본값

export interface RentalPackage {
  id: number; // 1~4
  venueId: string; // VENUES 중 하나 — 이 패키지가 속한 공간
  name: string; // "패키지 1"
  tagline: string; // 한 줄 소개 문구 — "OOO을 위한 OOO" 형태로 패키지별 핵심 특징을 요약
  audienceTier: {
    min: number;
    max: number;
    label: string; // "~5,000석 규모"
  };
  // 표시 대관료(1주, 고정가) — 요금표에서 주입되는 독립 고정값. [개정 2026-08-14, 기능정의서 2-20/2-42]
  // 기존 "기본 대관료 + 포함 항목 정가 합산" 규칙은 폐기됐다 — 이 값 자체가 최종 표시 금액이며,
  // includedItems 단가를 더해 역산·검증하지 않는다(Bowl 사용료가 이 값에 내재되어 있다, 2-43).
  baseFeePerWeek: number;
  // [화면 뼈대 2026-08-19, 패키지 구성 산정표] baseFeePerWeek(신청자 노출 총액)은 그대로
  // 계산의 기준값으로 쓰고 건드리지 않는다 — bowlFee는 "이 중 얼마가 관객 규모별 Bowl
  // 사용료 몫인지"를 관리자가 참고·감사할 수 있게 하는 부가 필드일 뿐, 견적 계산에는
  // 관여하지 않는다(신청자에게는 항상 완전히 숨김). 기본 구성 항목 합계는 별도 필드로
  // 저장하지 않고 includedItems 중 visibility="ITEM_ONLY"인 항목의 단가×수량을 그때그때
  // 합산해서 쓴다(관리자 화면 참고).
  bowlFee: number; // Bowl 사용료 참고값 — baseFeePerWeek에 이미 내재, 신청자 비노출
  includedWeeks: number; // 기본 포함 주차 (통상 1)
  includedItems: PackageInclusion[]; // 기본 포함사항 (3단계에 표시)
  mediaTier: MediaTier; // 홍보 디지털 매체(구좌) 등급 개방
  discountRatio: number; // 0=할인 없음, 0.1=기본 대관료 10% 할인 — 견적 계산 시 기본 대관료에 적용

  // [확정 2026-08-14, 기능정의서 2-38/2-49] 추가일 단가 — 기존 "기본 대관료 × 60% ÷ 6" 임시
  // 규칙 폐기. 산정표에서 역산 검증 완료(2-49): 셋업 추가 = 준비 1일 + 6일연동 항목 1일분,
  // 공연 추가 = 공연 1일 + Bowl 1일분 + 2일연동 항목 1일분 + 6일연동 항목 1일분 + 대기실 1일분.
  // 화~일 6일 중 요일 제외 시의 차감 단가(2-37)도 동일 단가를 대칭 적용한다 — 세션에서 확정.
  setupExtraDayFee: number; // 셋업(준비일) 추가/차감 단가·1일 — 전 패키지 동일 46,790,000원
  performanceExtraDayFee: number; // 공연일 추가/차감 단가·1일 — 패키지별 상이

  // 아래 항목은 "패키지 구성" 명세(대관시스템 노출)를 반영한 설명 정보입니다.
  // 과금 대상이 아니며(정찰제 대관료에 포함), 패키지 비교/안내용으로만 표시됩니다.
  dayBreakdown: string; // 세부 구성 — "준비 4일 + 공연 2일" (전 패키지 공통)
  defaultPerformanceDays: number; // dayBreakdown의 공연일수(숫자) — 준비일/공연일 조정 과금의 기준값
  rentalHours: string; // 대관시간 — "09:00~22:00" (전 패키지 공통)
  outdoorPlazaIncluded: boolean; // 야외광장 + 티켓박스 포함 여부 (전 패키지 공통)
  parkingPerDay: string; // 주차 기본 제공 — "100대/일" (패키지별 상이)
  waitingRoomNote: string; // 대기실 상세 — "지하 4실 · 지상 3실" (패키지별 상이)
  sideFacilities: string; // 부속공간 — 패키지별 상이

  // 원래는 명세서 기준 "대관시스템 미노출"(내부 참고용) 항목이었으나, 위저드 구성·옵션
  // 화면의 패키지 카드에 대관료 페이지(/rates)의 권장 무대·객석 정보와 같은 값을
  // 보여주기로 하면서 신청자 화면에도 노출한다(2026-08-22).
  seatingType: string; // 객석 운영 형태 — 위저드 패키지 카드 "권장 객석"
  stageType: string; // 무대형태 — 위저드 패키지 카드 "권장 무대"
}

export type AvailabilityMode = "ALWAYS" | "IF_PACKAGE_IN" | "IF_NOT_INCLUDED";

export interface AvailabilityRule {
  mode: AvailabilityMode;
  packages?: number[]; // mode=IF_PACKAGE_IN 일 때 대상 패키지 id
  maxAddQuantity?: number | "UNLIMITED"; // 추가 가능 상한 (기본 포함 수량 위에 더 얹을 수 있는 양)
}

export type BillingPhase = "ESTIMATE" | "SETTLEMENT";

// 산출내역표 노출 등급 (기능정의서 2-71). 신청자 화면 기준이며 운영자 화면(어드민)에는
// 적용하지 않는다 — 운영자는 항상 전체 내역을 본다.
// VISIBLE    — 항목·수량·단가·금액 전부 노출 (예: 선택 옵션)
// ITEM_ONLY  — 항목명·수량만 노출, 단가·금액은 감춘다 (예: 패키지 기본 포함 항목)
// HIDDEN     — 항목 자체가 드러나지 않고 금액에만 자동 반영된다 (예: 유틸리티)
export type LineItemVisibility = "VISIBLE" | "ITEM_ONLY" | "HIDDEN";

export interface AddonItem {
  id: string; // "waiting_room", "smart_stage" ...
  category: AddonCategory;
  name: string; // "대기실"
  pricingType: PricingType;
  unitPrice: number; // 요금표에서 주입
  unitLabel: string; // "원/일", "원/실", "매출 %" ...
  availability: AvailabilityRule;
  autoQuantity?: "AUDIENCE"; // 있으면 관객수로 수량 자동 채움 (청소비)
  billingPhase: BillingPhase; // 예상견적 포함 여부 (유틸리티=SETTLEMENT)
  visibility: LineItemVisibility; // 신청자 화면 노출 등급 (2-71)
  note?: string;
  // optional — 항목 스펙(규격·사양) 참고용 텍스트(2026-08-26 추가). 과금·계산에는
  // 관여하지 않는다. 신청자 화면(StepConfigOptions AddonRow)에도 note 옆에 노출한다.
  spec?: string;
}

export interface RateTable {
  version: string;
  vatRate: number; // 0.1
  extraWeekRatio: number; // 초과 주차 단가 = 패키지 기본 대관료 × 이 비율 (미확정 항목 임시 규칙)
  dayExclusionDiscountRatio: number; // 화~일 중 미사용(제외) 요일 1일당 할인 비율 (기본 대관료 × 이 비율)
  packages: RentalPackage[];
  addons: AddonItem[];
  midHall: MidHallRateConfig;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 견적/신청 상태
// ---------------------------------------------------------------------------

export type WeekDay = "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const WEEKDAYS: WeekDay[] = ["TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const WEEKDAY_LABEL: Record<WeekDay, string> = {
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

// [화면 뼈대 2026-08-18, 화면시나리오 INTERACTION "아레나 — 일자 역할 드롭다운"] 셋업/공연일/
// 철수/삭제(미사용) 4가지 상태. 철수(LOAD_OUT)는 가격 반영 방식이 아직 미정이라(BLOCKERS
// P1) 당분간 PREP과 동일하게 비공연일로 취급한다 — 상태 구분 자체는 화면에 노출한다.
export type DayTag = "PREP" | "PERFORMANCE" | "LOAD_OUT";

// ---------------------------------------------------------------------------
// 동시 대관 / 중형 일 단위 캘린더 — [화면 뼈대 2026-08-18, 화면시나리오·기능정의 v6.3]
// 이용 시설을 아레나/중형공연장/동시 대관 3택으로 통합한다(기능정의 2-13, 확정).
// [개정 2026-08-19] 중형(DAILY) 요금 계산 엔진을 연동했다 — MidHallRateConfig 참고.
// ---------------------------------------------------------------------------

// 중형공연장 일 단위 요금표(DAILY) — 패키지가 없어 RentalPackage와 별도 구조로 관리한다.
// 관리자 화면(요금표 관리)에서 편집 가능. 2회 공연 초과(3회 이상)는 자동 계산하지 않고
// 운영자 확인이 필요한 항목으로 남긴다(계산 엔진에서 별도 처리).
/** 중형 일 요금의 내역 — 전용 사용료 + 시설 사용료 = 총액 */
export interface MidHallFeeBreakdown {
  exclusive: number; // 전용 사용료 / 일당
  facility: number; // 시설 사용료 / 일당
}

export interface MidHallRateConfig {
  setupDayFee: number; // 셋업 Load-In 1일 — 평일/주말 동일
  performanceWeekdayFee: number; // 공연 1일 — 평일
  performanceWeekendFee: number; // 공연 1일 — 주말
  extraHourFee: number; // 셋업 연장(22:00~24:00) · 철수 Load-Out 시간당
  secondShowSurchargeRatio: number; // 1일 2회 공연 시 그 날 요금에 곱하는 할증 비율 (0.5=50%)
  cleaningUnitPrice: number; // 청소비 원/인 — (1회당 예상 관객 수 × 총 공연 횟수)에 곱한다
  /**
   * 전용/시설 내역 — 합이 위 세 총액이 된다. 견적 엔진은 총액만 쓰고, 내역은
   * 공개 대관료 페이지 표기용이다. 요금표 저장 시 공개 콘텐츠도 이 값으로 갱신된다.
   * (내역 도입 전에 저장된 버전에는 없다 — 없으면 화면이 공개 콘텐츠에서 가져온다.)
   */
  breakdown?: {
    setup: MidHallFeeBreakdown;
    weekday: MidHallFeeBreakdown;
    weekend: MidHallFeeBreakdown;
  };
}

export type BookingMode = "SINGLE" | "SIMULTANEOUS";

// 중형공연장은 패키지 개념이 없다 — 날짜를 하루씩 골라 셋업/공연만 지정한다(2-25, 확정).
// 아레나(Step1Calendar)와 동일하게 셋업/공연/철수 3가지 상태를 둔다 — 철수는 아레나와
// 마찬가지로 가격 반영 방식이 아직 미정이라 당분간 셋업과 동일하게 취급한다(DayTag 주석
// 참고, 2026-08-19).
export type MidHallDayRole = "SETUP" | "PERFORMANCE" | "LOAD_OUT";

export interface MidHallDaySelection {
  role: MidHallDayRole;
  shows: number; // 공연일에만 의미 있음 — 1일 2회 이상 회차 지정 (2-29)
}

// [신규 2026-08-21] "기본 정보" 그룹의 4번째 서브탭 — 공연 안전 관리 서약서. 아레나/중형
// 동시 대관이어도 행사 전체에 대한 서약 1건으로 충분하다고 보고 venue별로 나누지 않는다
// (performanceInfo처럼 midHall 전용 값을 따로 두지 않음).
// [개정 2026-08-23] 서약 항목 4개 → 6개(+미준수 시 조치 동의 1개, 총 7개)로 확장하고
// 제출 서류(안전관리계획서·출연자 계약서) 2건을 추가했다(목업 반영).
export interface SafetyPledge {
  safetyStructure: boolean; // 안전관리 체계 구성(가이드 준수·재해대책계획/안전관리계획 수립·책임자 지정)
  legalInspection: boolean; // 염·전기안전·임시구조물·특수효과 등 법정 안전검사 및 서류 기한 내 완료·제출
  staffSafetyTraining: boolean; // 출연자·스태프 안전교육 이수 및 비상대피훈련 등 조치 이행
  followVenueGuidance: boolean; // 서울아레나 안전 가이드·담당자 지시 준수, 공연 지연·중단·시설사용제한 조치 협조
  audienceSafetyMeasures: boolean; // 승인 수용인원·객석 운영기준 준수, 스탠딩 밀집관리·이동약자 관람환경 확보
  insuranceCoverage: boolean; // 영업배상책임보험·단체상해보험 가입, 시설손상·제3자 피해 책임 부담
  consequenceAcknowledged: boolean; // 미준수 시 시설사용 제한·계약 해지·향후 신청 제한 등 조치 동의
  signature: string;
}

export interface MarketingChannel {
  platform: string; // 채널명 (인스타그램, 유튜브, X 등)
  handle: string; // 계정 · URL
  followers: string; // 구독자·팔로워 수 — 참고용 문자열, 형식 강제 안 함
}

export interface MarketingSponsorship {
  brandName: string; // 스폰서 · 브랜드사명
  campaignSummary: string; // 연계 캠페인 개요
}

// [신규 2026-08-23] "마케팅 실행 계획" — 4요소 모두 자유 서술 문자열이다(구체적
// 수치·금액·일자를 문장으로 받는 게 목적이라 formatting을 강제하지 않는다, followers와
// 동일한 패턴). 4개 중 몇 개를 채워야 하는지는 검사하지 않는다 — 안내 문구
// ("4요소 중 2개 이상을 구체적 수치·금액·일자로 작성해 주세요")로만 유도하고 이 단계
// 전체가 선택 항목이라 필수 검증 대상이 아니다.
export interface MarketingExecutionPlan {
  targetDefinition: string; // 타겟 정의
  // 매체 믹스 — mediaMixOnline/mediaMixOffline에서 자동 합성(하위호환).
  // scoreQuote.ts의 A-MKT 채점이 이 필드를 그대로 읽는다.
  mediaMix: string;
  // optional — "온라인/오프라인 마케팅 계획을 구분해서 입력" 요청(2026-08-26)으로
  // 매체 믹스를 둘로 나눴다. 화면은 이 두 필드만 입력받는다.
  mediaMixOnline?: string;
  mediaMixOffline?: string;
  budget: string; // 집행 예산(원)
  timeline: string; // 타임라인(기간)
  // optional — 2026-08-27 추가. 온라인/오프라인 각각을 줄글 하나로 받던 걸 항목 목록으로
  // 바꿨다("크게 온오프라인만 구분하고 그 하위에 다양한 항목을 추가/삭제"). 위
  // mediaMixOnline/mediaMixOffline 은 이 배열에서 합성해 계속 채운다 — 심사 채점(A-MKT)과
  // 예전 신청서가 그 문자열을 읽는다.
  mediaMixOnlineItems?: string[];
  mediaMixOfflineItems?: string[];
}

export interface MarketingCooperation {
  channels: MarketingChannel[];
  // 미선택은 null — 동의/비동의 둘 다 아직 고르지 않은 상태와 "비동의를 골랐다"를
  // 구분해야 해서 boolean 대신 tri-state로 둔다.
  seoulArenaPromotionConsent: boolean | null;
  sponsorships: MarketingSponsorship[];
  // [신규 2026-08-25] "협조 동의 항목" — 공동 프로모션/스폰서십 협업 자체에 대한
  // 동의·비동의. 위 seoulArenaPromotionConsent와 같은 이유로 tri-state.
  coPromotionConsent: boolean | null;
  coSponsorshipConsent: boolean | null;
  ticketSalesDataConsent: boolean;
  pollstarConsent: boolean;
  executionPlan: MarketingExecutionPlan;
}

export interface QuoteSelection {
  venueId: string | null; // 0단계: 공간 선택
  bookingMode: BookingMode; // SIMULTANEOUS = 아레나 + 중형을 신청서 1건으로 묶는 동시 대관(2-13, 할인 없음)
  packageId: number | null; // 1단계 — 아레나 전용. 중형은 패키지가 없어 항상 null.
  week: { year: number; month: number; weekOfMonth: number }; // 2단계 (화~일 시작 주) — 아레나 일정
  excludedDays: WeekDay[]; // 화~일 6일 중 실제 사용하지 않는 요일 (요일당 정액 할인, 최소 1일은 남겨야 함)
  extraDays: number; // 일요일 이후로 연장하는 추가 일수 (일 단위 과금, 0 이상)
  dayTags: Record<string, DayTag>; // 실제 대관일(ISO 날짜)별 준비일/공연일/철수 지정 — 미지정 시 패키지 기본값 적용
  dayShowCounts: Record<string, number>; // 공연일로 지정된 날짜의 1일 회차(기본 1) — 2회 이상 할증은 미정(2-20), 화면 입력만 우선 반영
  expectedAudience: number; // 관객수 (청소비 등 자동 산출 입력값) — 동시 대관 시 아레나 값
  secondaryAudience: number; // 중형 예상 관객 규모 — 동시 대관 또는 중형 단독일 때만 의미 있음(2-14)
  midHallDays: Record<string, MidHallDaySelection>; // 중형 일정 — ISO 날짜별 셋업/공연 지정(2-25~2-29)
  midHallExtraSetupHours: number; // 셋업 연장(22:00~24:00) 시간 — 100만원/시간(2-28, 참고용 표시만)
  midHallExtraLoadOutHours: number; // 철수 Load-Out 시간 — 100만원/시간(2-28, 참고용 표시만)
  expectedRevenue?: number; // 온라인 송출 수수료 계산용 (선택)
  addons: SelectedAddon[]; // 4단계 선택 항목
  performanceInfo: PerformanceInfo; // 공연 정보 입력 단계 — 동시 대관 시 아레나(및 각각 입력 안 했을 때 중형) 정보
  // 동시 대관에서 중형 정보를 아레나와 다르게 입력할 때만 값이 있다 — null(기본값)이면
  // "동일하게" 상태로 performanceInfo를 그대로 공유한다(2026-08-19, 기본정보 탭 분리 요청).
  midHallPerformanceInfo: PerformanceInfo | null;
  // optional — 이 필드가 추가되기 전에 제출된 기존 신청서(DB의 selection_json)에는 없다.
  safetyPledge?: SafetyPledge;
  // optional — 마케팅 협조 및 계획 탭(2026-08-22 추가) 도입 이전 신청서에는 없다.
  marketingCooperation?: MarketingCooperation;
}

// ---------------------------------------------------------------------------
// 공연 정보 입력 — 예상 대관료 확인 이후, 신청서 제출 전 공통 프로세스
// ---------------------------------------------------------------------------

// 신청하는 기업의 유형 — 회원가입 화면의 "공연 기획사 · 제작사 · 대행사 등" 문구와
// 같은 분류를 쓴다. optional — 이 필드가 추가되기 전에 제출된 기존 신청서에는 없다.
export type ApplicantCompanyType = "PROMOTER" | "PRODUCER" | "AGENCY" | "ARTIST_MANAGEMENT" | "OTHER";

export const APPLICANT_COMPANY_TYPE_LABEL: Record<ApplicantCompanyType, string> = {
  PROMOTER: "기획사",
  PRODUCER: "제작사",
  AGENCY: "대행사",
  ARTIST_MANAGEMENT: "아티스트 소속사",
  OTHER: "기타",
};

export type EventType = "CONCERT" | "FANMEETING_CONCERT" | "CORPORATE" | "PUBLIC";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  CONCERT: "콘서트",
  FANMEETING_CONCERT: "팬미팅·콘서트",
  CORPORATE: "기업행사",
  PUBLIC: "공공행사",
};

export type StageType = "END_STAGE" | "CENTER_STAGE" | "UNDECIDED" | "OTHER";

export const STAGE_TYPE_LABEL: Record<StageType, string> = {
  END_STAGE: "엔드 스테이지",
  CENTER_STAGE: "센터 스테이지",
  UNDECIDED: "미정",
  OTHER: "기타",
};

// [개정 2026-09-02] "객석"을 "지정석"으로 고치고 "혼합"을 더했다 — 아레나는 한 공연
// 안에서 플로어는 스탠딩, 2·3층은 지정석으로 파는 경우가 흔한데 고를 값이 없었다.
export type SeatingType = "SEATED" | "STANDING" | "MIXED" | "OTHER";

export const SEATING_TYPE_LABEL: Record<SeatingType, string> = {
  SEATED: "지정석",
  STANDING: "스탠딩",
  MIXED: "혼합",
  OTHER: "기타",
};

export type RetractableSeatUse = "USE" | "NOT_USE";

export const RETRACTABLE_SEAT_USE_LABEL: Record<RetractableSeatUse, string> = {
  USE: "사용",
  NOT_USE: "미사용",
};

/**
 * 수납식 객석은 1층·3층에 따로 있고 층마다 쓰고 안 쓰고가 갈린다 (2026-09-02).
 * 위의 retractableSeatUse 는 "쓰긴 쓰는가" 를 묻는 상위 답이고, [사용] 을 고른 뒤
 * 층별로 다시 받는다. [미사용] 이면 층별 값은 비운다.
 */
export type RetractableSeatFloor = "FLOOR_1" | "FLOOR_3";

export const RETRACTABLE_SEAT_FLOOR_LABEL: Record<RetractableSeatFloor, string> = {
  FLOOR_1: "1층 수납식 객석",
  FLOOR_3: "3층 수납식 객석",
};

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 06/12 · 08/12] STEP 3-1(신청자 정보 · 공연
// 기본정보) · STEP 3-3(개최 신뢰도 · 안전관리) 반영. 대관기간 · 공연일시 · 총 공연 횟수는
// selection(캘린더 결과)에서 읽기 전용으로 자동 계산하므로 이 타입에는 넣지 않는다.
export interface ResponsiblePerson {
  name: string;
  title: string; // 공연 운영 총괄: 직책 / 안전관리 총괄: 소속
  phone: string;
}

export interface PastPerformanceRecord {
  eventName: string;
  venue: string;
  period: string;
  audience: string;
  role: string; // 주최·주관 역할
}

// [신규 2026-08-26] "공연 주최, 공연 주관, 공연 기획 따로따로 별도의 행으로 추가할수
// 있게" 요청 — 기존 organizer(단일 텍스트)를 역할별 반복 행으로 바꾼다. organizer
// 문자열 필드는 지우지 않고 이 배열이 바뀔 때마다 자동으로 합성해 채운다 — 인쇄본·
// 관리자 화면·채점 로직이 이미 organizer를 그대로 읽고 있어(하위호환) 여기서 새로
// 손대지 않는다.
export type OrganizerRole = "HOST" | "ORGANIZER" | "PRODUCTION";

export const ORGANIZER_ROLE_LABEL: Record<OrganizerRole, string> = {
  HOST: "주최",
  ORGANIZER: "주관",
  PRODUCTION: "기획",
};

export interface OrganizerEntry {
  role: OrganizerRole;
  name: string;
}

// [신규 2026-08-26] "아티스트 이력" — 기존 artist(단일 텍스트, "아티스트 / 출연진")와는
// 별개로 신설한다. artist 필드는 그대로 두고(인쇄본·관리자 화면이 이미 참조), 이
// 두 배열은 더 상세한 이력 확인용으로 추가된 것이다.
export interface ArtistMainHistoryRecord {
  artistName: string; // 아티스트명
  agency: string; // 소속사
  debutYear: string; // 데뷔연도
  achievements: string; // 주요 활동 및 수상·성과
}

export interface ArtistRecentPerformanceRecord {
  eventName: string; // 공연명
  eventDate: string; // 공연일
  venue: string; // 공연장
  cityCountry: string; // 도시·국가
  showCount: string; // 공연 횟수
  seatsPerShow: string; // 회당 객석 규모
  audience: string; // 관객 수
  sellRate: string; // 티켓 판매율
}

// [신규 2026-08-26] "티켓 유형별로 행 추가(R석, VIP석 등), 티켓가·예상 판매율을 각각"
// 요청 — 기존 단일 expectedPaidSalesRate(%)를 유형별 반복 행으로 대체한다.
// expectedPaidSalesRate/expectedPaidSalesRateMidHall 필드는 과거 신청서 하위호환을
// 위해 타입에는 남기되(이미 제출된 신청서 표시용), 새 화면에서는 이 배열만 입력받는다.
export interface TicketTypeRecord {
  label: string; // "R석", "VIP석" 등 티켓 유형명
  price: number; // 티켓가(원)
  expectedSalesRate: number; // 예상 판매율(%)
}

export type CastContractStatus = "COMPLETED" | "IN_PROGRESS" | "PLANNED";

export const CAST_CONTRACT_STATUS_LABEL: Record<CastContractStatus, string> = {
  COMPLETED: "계약 완료",
  IN_PROGRESS: "협의 중",
  PLANNED: "섭외 예정",
};

export type AgeRating = "ALL" | "AGE_LIMIT" | "UNDECIDED";

export const AGE_RATING_LABEL: Record<AgeRating, string> = {
  ALL: "전체관람가",
  AGE_LIMIT: "연령제한",
  UNDECIDED: "미정",
};

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 07/12 · STEP 3-2] 부대사업 계획 — 복수 선택.
export type AncillaryBusinessPlan = "MD_SALES" | "POPUP_STORE" | "SPONSOR_BOOTH" | "OTHER" | "NONE";

export const ANCILLARY_BUSINESS_PLAN_LABEL: Record<AncillaryBusinessPlan, string> = {
  MD_SALES: "MD 판매",
  POPUP_STORE: "팝업스토어",
  SPONSOR_BOOTH: "협찬부스",
  OTHER: "기타",
  NONE: "해당 없음",
};

// 공공/공익 참여 및 연계 프로그램 — 복수 선택(2026-08-22, 정보 안내에서 선택형으로 전환).
export type PublicInterestItem =
  | "DISCOUNT_ACCESS"
  | "ACCESSIBILITY_SUPPORT"
  | "VENUE_LINKED_PROGRAM"
  | "ANTI_SCALPING"
  | "CONSUMER_PROTECTION"
  | "PUBLIC_AGENCY_LINKED_EVENT"
  | "LOCAL_COMMUNITY_PROGRAM"
  | "REGIONAL_VENUE_ACTIVATION_PROGRAM"
  | "PUBLIC_INTEREST_SEATS"
  | "FACILITY_LINKED_PROGRAM"
  | "COMPLAINT_REDUCTION_PLEDGE"
  | "OTHER"
  | "UNDER_REVIEW"
  | "NONE";

export const PUBLIC_INTEREST_ITEM_LABEL: Record<PublicInterestItem, string> = {
  DISCOUNT_ACCESS: "문화소외계층 할인 · 초청석",
  ACCESSIBILITY_SUPPORT: "장애인 관람 접근성 지원",
  VENUE_LINKED_PROGRAM: "공연장 연계사업 참여",
  ANTI_SCALPING: "암표 · 부정거래 방지대책",
  CONSUMER_PROTECTION: "소비자 보호계획",
  PUBLIC_AGENCY_LINKED_EVENT: "공공기관 · 지자체 연계 행사",
  LOCAL_COMMUNITY_PROGRAM: "지역상생 프로그램",
  REGIONAL_VENUE_ACTIVATION_PROGRAM: "지역 상생 및 공연장 활성화 특화 프로그램",
  PUBLIC_INTEREST_SEATS: "공익 목적 객석 제공",
  FACILITY_LINKED_PROGRAM: "시설 연계 프로그램",
  COMPLAINT_REDUCTION_PLEDGE: "민원 저감 및 책임 서약",
  OTHER: "그외 기타",
  UNDER_REVIEW: "검토 중",
  NONE: "없음",
};

export const PUBLIC_INTEREST_ITEM_HINT: Record<PublicInterestItem, string> = {
  DISCOUNT_ACCESS: "대상, 할인율 또는 좌석 수",
  ACCESSIBILITY_SUPPORT: "배리어프리, 전담인력, 안내계획",
  VENUE_LINKED_PROGRAM: "커넥티드 라이브 등 협조 · 제안",
  ANTI_SCALPING: "본인인증, 예매 제한, 모니터링",
  CONSUMER_PROTECTION: "공정 운영, 환불 · 취소, 민원 대응",
  PUBLIC_AGENCY_LINKED_EVENT: "기관명, 주최 · 주관 · 후원 관계",
  LOCAL_COMMUNITY_PROGRAM: "지역 업체 · 인력, 주민 프로그램",
  REGIONAL_VENUE_ACTIVATION_PROGRAM: "지역 상권 연계, 공연장 활성화 협력 계획",
  PUBLIC_INTEREST_SEATS: "제공 대상과 좌석 수",
  FACILITY_LINKED_PROGRAM: "판매시설, 중형공연장, MD 팝업",
  COMPLAINT_REDUCTION_PLEDGE: "소음 · 교통완화계획",
  OTHER: "위 항목에 해당하지 않는 참여 · 연계 계획",
  UNDER_REVIEW: "아직 확정되지 않은 항목",
  NONE: "해당 없음",
};

// [개정 2026-08-27] 항목을 성격별로 묶어 보여준다("각 항목들은 성격에 맞게 그룹핑").
// 화면 순서는 이 배열이 정하고, 항목에 붙는 번호는 아래 PUBLIC_INTEREST_ITEM_NUMBER 가
// 정한다 — 그룹을 다시 나눠도 심사표·기획서가 가리키는 번호가 흔들리지 않게 분리했다.
export interface PublicInterestGroup {
  key: string;
  label: string;
  items: PublicInterestItem[];
}

export const PUBLIC_INTEREST_GROUPS: PublicInterestGroup[] = [
  {
    key: "ACCESS",
    label: "접근성 · 사회공헌",
    items: ["DISCOUNT_ACCESS", "ACCESSIBILITY_SUPPORT", "PUBLIC_INTEREST_SEATS"],
  },
  {
    key: "CONSUMER",
    label: "소비자 보호 · 공정거래",
    items: ["ANTI_SCALPING", "CONSUMER_PROTECTION", "COMPLAINT_REDUCTION_PLEDGE"],
  },
  {
    key: "LOCAL",
    label: "지역상생 · 공연장 활성화",
    items: [
      "LOCAL_COMMUNITY_PROGRAM",
      "REGIONAL_VENUE_ACTIVATION_PROGRAM",
      "PUBLIC_AGENCY_LINKED_EVENT",
    ],
  },
  {
    key: "FACILITY",
    label: "시설 · 연계사업",
    items: ["VENUE_LINKED_PROGRAM", "FACILITY_LINKED_PROGRAM", "OTHER"],
  },
];

// 참여 항목이 아니라 "아직 못 정했다 / 해당 없다"는 응답이라, 그룹 밖 맨 아래에 따로 둔다.
export const PUBLIC_INTEREST_STATUS_ITEMS: PublicInterestItem[] = ["UNDER_REVIEW", "NONE"];

// 화면에 붙는 번호(1~14) — PUBLIC_INTEREST_ITEM_LABEL 선언 순서가 정본이다.
export const PUBLIC_INTEREST_ITEM_NUMBER: Record<PublicInterestItem, number> = Object.fromEntries(
  (Object.keys(PUBLIC_INTEREST_ITEM_LABEL) as PublicInterestItem[]).map((item, i) => [item, i + 1]),
) as Record<PublicInterestItem, number>;

export interface PerformanceInfo {
  // 신청자 정보 (STEP 3-1 좌측) — 회원정보에서 자동 입력되나 수정 가능
  applicantCompanyName: string; // 대관신청사명
  // optional — 이 필드가 추가되기 전에 제출된 기존 신청서에는 없다.
  applicantCompanyType?: ApplicantCompanyType | null; // 신청 기업 유형
  applicantBusinessRegistrationNumber: string; // 사업자등록번호
  // optional — 대표자명(2026-08-26 추가, 계정/회사 정보에서 자동 입력·읽기 전용)
  applicantRepresentativeName?: string;
  applicantContactName: string; // 담당자
  applicantContactPhone: string; // 담당자 연락처
  operationsResponsible: ResponsiblePerson; // 공연 운영 총괄 책임자
  safetyResponsible: ResponsiblePerson; // 안전관리 총괄 책임자
  pastPerformances: PastPerformanceRecord[]; // 대관사 최근 3년간 공연 실적 (반복 입력)

  // 공연 기본정보 (STEP 3-1 우측)
  eventName: string; // 공연(행사)명
  artist: string; // 아티스트
  organizer: string; // 주최·주관·기획 — organizers 배열에서 자동 합성(하위호환용)
  // optional — 2026-08-26 추가. 화면은 이 배열만 입력받고, organizer(string)는 여기서 파생된다.
  organizers?: OrganizerEntry[];
  eventScale: string; // 행사규모
  eventTypes: EventType[]; // 행사유형
  ageRating: AgeRating | null; // 공연등급
  ageLimitDetail: string; // 연령제한 상세(예: 15세 이상)
  stageTypes: StageType[]; // 무대형태
  // optional — 무대형태 "기타" 선택 시 상세 설명(2026-08-26 추가)
  stageTypeOtherDetail?: string;
  seatingTypes: SeatingType[]; // 객석형태
  // optional — 객석형태 "기타" 선택 시 상세 설명(2026-08-26 추가)
  seatingTypeOtherDetail?: string;
  retractableSeatUse: RetractableSeatUse | null; // 수납식 객석 사용여부
  // optional — 위에서 [사용]을 고른 경우 층별 사용여부(2026-09-02). 예전 신청서에는 없다.
  retractableSeatFloorUse?: Partial<Record<RetractableSeatFloor, RetractableSeatUse>>;
  teardownCompletionTime: string; // 철수 완료 예정시간
  ticketOpenExpectedDate: string; // 티켓 오픈 예정일

  // 아티스트 이력(2026-08-26 추가) — artist(요약 텍스트)와는 별개로 상세 이력을 받는다.
  artistMainHistory?: ArtistMainHistoryRecord[]; // ① 아티스트 주요 이력
  artistRecentPerformances?: ArtistRecentPerformanceRecord[]; // ② 최근 공연 이력(최대 3~5건 권장)

  // 예상 관객 및 사업규모 · 공공성 (STEP 3-2)
  // [2026-08-26] 화면은 이제 ticketTypes(티켓 유형별 가격·판매율)만 입력받는다 — 아래 두
  // 필드는 그 이전에 제출된 신청서를 그대로 보여주기 위한 하위호환용으로만 남긴다.
  expectedPaidSalesRate: number; // 예상 유료 판매율(%) — 아레나 (레거시)
  // optional — 아레나/중형을 한 화면에서 나눠 입력하게 된(2026-08-22) 이후 추가된 필드라
  // 그 전에 저장된 신청서에는 없다.
  expectedPaidSalesRateMidHall?: number; // 예상 유료 판매율(%) — 중형 (레거시)
  // optional — 2026-08-26 추가. 티켓 유형(R석·VIP석 등)별 가격·예상 판매율 반복 입력.
  ticketTypes?: TicketTypeRecord[];
  // optional — 2026-08-26 추가. 같은 주차에 여러 신청이 몰려 경합이 붙었을 때, 신청자가
  // 추가로 제시할 수 있는 대관료 옵션의 범위(최소~최대, 원)와 티켓 매출 중 서울아레나에
  // 배분하는 RS(Revenue Share) 요율(%) — 둘 다 경합 심사에서 참고하는 경쟁력 지표다.
  competitionFeeOptionMin?: number;
  competitionFeeOptionMax?: number;
  ticketRevenueShareRate?: number; // 티켓 매출 RS 요율(%)
  ancillaryBusinessPlans: AncillaryBusinessPlan[]; // 부대사업 계획

  // 공공/공익 참여 여부 (STEP 3-2.5) — 선택사항. optional: 선택형으로 바뀌기 전(2026-08-22)
  // 저장된 신청서에는 없을 수 있다.
  publicInterestItems?: PublicInterestItem[];
  // optional — 2026-08-27 추가. 체크한 항목별 상세 기입란. 체크를 풀어도 값은 남겨두므로
  // (실수로 푼 뒤 다시 켜면 쓰던 글이 살아난다) 읽는 쪽은 publicInterestItems 에 든
  // 항목만 유효한 것으로 본다.
  publicInterestDetails?: Partial<Record<PublicInterestItem, string>>;

  // 개최 신뢰도 및 안전관리 (STEP 3-3) — 회원 유형이 기획사 직접 신청이면 화면에서 섹션 숨김
  castContractStatus: CastContractStatus | null; // 주요 출연진 계약 상태
  foreignArtistNotes: string; // 해외 아티스트 추가사항 (비자·입국 일정·국내 에이전시)
  sensitiveInfoMaskingAcknowledged: boolean; // 민감정보(금액·개인정보) 마스킹 제출 허용 고지 확인
  safetyPledgeSigned: boolean; // 안전규정 준수 확약서 작성 여부
}

export interface WeekDemand {
  year: number;
  month: number;
  weekOfMonth: number;
  companyCount: number; // 해당 주에 대관 신청서를 낸 회사(신청자) 수
}

export interface DateBlock {
  date: string; // ISO yyyy-mm-dd
  // "ALL" = 두 공간 모두(과거 이관 데이터 · 공간 구분 없이 막던 시절의 값). 2026-08-22부터는
  // 새로 등록하는 대관 불가 일정은 항상 특정 공간(arena/medium-hall) 하나로만 등록된다.
  venueId: "arena" | "medium-hall" | "ALL";
  reason: string | null; // 예: "정기 대관", "내부 행사"
}

export interface SelectedAddon {
  addonId: string;
  requestedQuantity: number; // 신청 수량 (초과분 계산 전 총량)
}

export type QuoteStatus = "ESTIMATE" | "CONTRACTED" | "SETTLED";

export interface LineItem {
  addonId: string | "BASE_FEE";
  label: string;
  pricingType: PricingType;
  requested: number; // 신청 수량
  included: number; // 기본 포함 수량
  billable: number; // 실제 과금 수량 = MAX(requested - included, 0)
  unitPrice: number;
  amount: number; // billable * unitPrice
  phase: BillingPhase;
  visibility: LineItemVisibility; // 신청자 화면 노출 등급 (2-71)
  // 동시 대관(SIMULTANEOUS)에서 아레나·중형 항목이 한 목록에 섞여 어느 공간 몫인지
  // 구분이 안 된다는 지적으로 추가(2026-08-22). calculateQuote가 채운다 — 기존에
  // 저장된 신청서(이 필드 도입 전)는 undefined일 수 있으므로 optional로 둔다.
  venue?: "arena" | "medium-hall";
}

export interface Quote {
  id: string;
  applicantId: string;
  selection: QuoteSelection;
  rateTableVersion: string; // 계산 시점 요금표 버전 (재현성)
  lineItems: LineItem[]; // 산출내역
  subtotal: number; // VAT 전 소계
  vat: number; // subtotal * 0.1
  total: number; // subtotal + vat
  meteredNotice: string; // 유틸리티 실사용 안내 문구
  status: QuoteStatus;
  createdAt: string;
  review: Review | null;
  contract: ContractAdjustment | null;
  settlement: Settlement | null;
}

// 제출 전 클라이언트/서버가 실시간으로 계산만 하는 견적 미리보기 (계정/DB 필드 없음)
export type EstimatedQuote = Omit<
  Quote,
  "id" | "applicantId" | "createdAt" | "review" | "contract" | "settlement"
> & {
  // 중형(DAILY) 공연일에 1일 3회 이상 지정된 경우 등 — 자동 계산하지 않고 운영자 확인이
  // 필요한 사유 목록. 비어있지 않으면 신청서 제출을 막는다(Step6Submit). 제출 시점에는
  // 반드시 비어있어야 하므로 영구 저장되는 Quote에는 두지 않는다.
  blockingIssues: string[];
};

// 계약 전 심사 단계 — 운영자가 신청서를 검토하고 승인/보류/거절을 기록한다.
export type ReviewDecision = "APPROVED" | "HOLD" | "REJECTED";

export interface Review {
  quoteId: string;
  decision: ReviewDecision;
  score: number | null; // 0~100, 선택
  rationale: string; // 심사 근거/코멘트
  decidedAt: string;
  decidedBy: string;
}

export interface ContractAdjustment {
  quoteId: string;
  adjustments: { label: string; amount: number; reason: string }[]; // 특약·할인(음수 가능)
  contractTotal: number; // 계약금액
  decidedAt: string;
  decidedBy: string;
}

// 부속합의 — 계약 체결 후 일정·공연 횟수 변경 등으로 금액이 달라질 때의 변경 이력
// (2026-08-22 대관료 정산프로세스 반영). append-only로 쌓이며, 계약금액 자체(contractTotal)는
// 건드리지 않고 화면에서 "계약금액 + 부속합의 합계"로 표시만 더한다 — 이 금액 변동을
// 계약금/잔금 청구 중 어느 쪽에 반영할지는 정책 미정이라 자동 반영하지 않는다.
export interface ContractAddendum {
  id: string;
  quoteId: string;
  description: string; // 변경 사유
  amountDelta: number; // 이번 부속합의로 인한 금액 변동 (감액은 음수)
  agreedAt: string; // 부속합의 체결일 (운영자가 입력하는 실제 합의 날짜)
  createdBy: string;
  createdAt: string;
}

export interface Settlement {
  quoteId: string;
  onSiteAdditions: { label: string; amount: number }[]; // 현장 추가
  unusedDeductions: { label: string; amount: number }[]; // 미사용 차감
  meteredActuals: { label: string; amount: number }[]; // 유틸리티 실사용 확정
  finalTotal: number; // 최종 정산금액
  decidedAt: string;
  decidedBy: string;
  mutualConfirmedAt?: string | null; // 신청자가 정산 내역을 확인한 시점 (상호 확인)
  mutualConfirmedBy?: string | null;
}

// ---------------------------------------------------------------------------
// 계약금 (계좌이체 확인 방식 — 실제 PG 연동 전 임시 운영 방식)
// 화면 문구는 "계약금"이다(2026-08-26, "보증금 아니고 계약금이야" 정정) — 타입·필드명은
// Deposit/depositRate 그대로 두고 화면에 노출되는 한글 문구만 바꿨다.
// ---------------------------------------------------------------------------

export type DepositStatus = "PENDING" | "REPORTED" | "CONFIRMED";

export interface Deposit {
  id: string;
  quoteId: string;
  requiredAmount: number;
  depositRate: number; // 계약금액 대비 계약금 비율 (%)
  status: DepositStatus;
  depositorName: string | null; // 신청자가 입금신청 시 입력한 입금자명
  reportedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 대관 현황 — 계약 이후 진행 단계 (전자 날인 / 세금계산서 / 티켓오픈 / 시설회의)
// 명세상 정식 연동 서비스(전자서명·세금계산서 발행 API) 도입 전까지는, 계약금과 동일하게
// 운영자가 수동으로 상태를 체크하는 방식으로 운영한다.
// ---------------------------------------------------------------------------

export interface ContractSignature {
  id: string;
  quoteId: string;
  venueSignedAt: string | null; // 공연장(운영자) 측 날인
  venueSignedBy: string | null;
  applicantSignedAt: string | null; // 대관사(신청자) 측 날인
  applicantSignedBy: string | null;
  createdAt: string;
}

// 세금계산서 — 계약금(CONTRACT)·잔금(CONTRACT_BALANCE)·정산금액(SETTLEMENT) 공용.
// 발행 → 입금신청 → 입금확인, 발행 후 미입금 상태가 5일 이상 지속되면 알림이
// 재발송된다(lastReminderAt 기준 lazy 체크).
//
// CONTRACT_BALANCE(잔금, 2026-08-22 대관료 정산프로세스 반영)는 계약금(CONTRACT)과
// 별개로, 계약 확정 후 운영자가 필요할 때 직접 금액을 정해 만든다 — 계약금:잔금 비율이
// 항상 고정인지, 청구 시점(D-n)을 몇일로 할지는 아직 사내에서 확정되지 않아 자동으로
// 만들지 않는다(AGENTS.md에 남긴 검토 필요 사항). PENDING 상태로 미리 만들어두는 CONTRACT와
// 달리, CONTRACT_BALANCE는 존재 자체가 "잔금 청구서를 만들었는지" 여부를 뜻한다.
export type InvoicePurpose = "CONTRACT" | "CONTRACT_BALANCE" | "SETTLEMENT";
export type InvoiceStatus = "PENDING" | "ISSUED" | "REPORTED" | "PAID";

export interface TaxInvoice {
  id: string;
  quoteId: string;
  purpose: InvoicePurpose;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string | null;
  issuedBy: string | null;
  payerName: string | null; // 신청자가 입금신청 시 입력
  reportedAt: string | null;
  paidAt: string | null;
  paidConfirmedBy: string | null;
  lastReminderAt: string | null;
  createdAt: string;
}

export interface TicketOpen {
  id: string;
  quoteId: string;
  openDate: string | null; // ISO yyyy-mm-dd — 계약금 입금 확인 후 운영자가 등록
  materialsUploadedAt: string | null; // 포스터/상세페이지/좌석배치도 등 자료 업로드 시점
  lastReminderAt: string | null; // 오픈일 D-30 미업로드 알림 최근 발송 시점
  createdAt: string;
}

export interface FacilityMeeting {
  id: string;
  quoteId: string;
  meetingDate: string | null; // ISO yyyy-mm-dd — 티켓오픈 등록 후 운영자가 등록
  materialsUploadedAt: string | null; // 운영 매뉴얼/프로덕션 노트 등 자료 업로드 시점
  lastReminderAt: string | null; // 회의일 D-7 미업로드 알림 최근 발송 시점
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 첨부서류
// ---------------------------------------------------------------------------

// [2026-09-02] MARKETING_PLAN — 마케팅 실행 계획을 글이 아니라 파일로 받는다.
// 자유 서술로 받던 온라인·오프라인 계획이 한 줄짜리 메모가 되기 일쑤라, 기획사가
// 이미 만들어 둔 계획서를 그대로 올리게 바꿨다.
export type AttachmentCategory =
  | "TICKET_OPEN"
  | "FACILITY_MEETING"
  | "MARKETING_PLAN"
  | null;

export interface Attachment {
  id: string;
  quoteId: string;
  storedName: string; // 디스크에 저장된 파일명 (충돌/경로탐색 방지용 난수)
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  category: AttachmentCategory; // null = 일반 신청서류, 그 외 = 티켓오픈/시설회의 전용 자료
  // optional — 2026-08-27 추가. 공공/공익 STEP 에서 항목별로 올린 자료면 그 항목 키가 들어간다.
  // 그 밖의 첨부는 null.
  publicInterestItem?: PublicInterestItem | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 사용자 / 감사 로그
// ---------------------------------------------------------------------------

export type UserRole = "APPLICANT" | "ADMIN";

// 회원 유형. 지금은 기업회원만 가입할 수 있고 개인회원은 화면에서 비활성 상태로 노출된다.
// 나중에 열 때 기존 행을 손대지 않아도 되게 컬럼과 타입을 먼저 둔다(기획서 A7).
export type MemberType = "CORPORATE" | "INDIVIDUAL";

// 회사 안에서의 권한. 운영자 등급인 AdminTier(MASTER/BASIC)와는 완전히 다른 축이다 —
// 이쪽은 대관사(회사) 대표 담당자인지 일반 담당자인지를 가른다.
export type CompanyRole = "MASTER" | "STAFF";

/**
 * 회사(대관단체)의 상태. 회원 개인의 승인 상태와 별개다 —
 * 회사는 최초 가입자가 승인될 때 함께 확정된다(기획서 1-37).
 *
 *  PENDING   최초 가입자가 아직 심사 중. 이 회사로 합류하려는 사람도 함께 기다린다.
 *  APPROVED  승인 완료. 검색 목록에 노출되고 합류 신청을 받을 수 있다.
 *  REJECTED  미승인 처리. 재신청은 다시 최초 가입자 심사로 돌아간다.
 *  SUSPENDED 휴업·폐업·부도로 확인됨. 대관 계약 상대로 부적격이다.
 */
export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

// 신청자(대관사) 계정은 일반인이 자유 가입할 수 없도록 운영자 승인이 필요하다.
// 운영자(ADMIN) 계정은 항상 APPROVED로 생성된다.
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

// 운영자(ADMIN) 계정의 등급. role이 ADMIN인 계정에만 의미가 있다.
// BASIC(일반관리자) — 가입 시 기본으로 부여되는 등급, 일상적인 운영 화면 접근 가능
// PRO(프로 관리자) — 마스터 관리자가 별도로 승급
// MASTER(마스터 관리자) — 최상위 등급. 다른 운영자 등급을 조정할 수 있고, 기능정의서처럼
//   민감한 내부 문서 편집 권한은 이 등급에만 부여한다.
//
// 전체 5단계 계정 등급(참고):
//   1. 일반인   — role=APPLICANT, approvalStatus=PENDING (가입만 하고 미승인)
//   2. 기본     — role=APPLICANT, approvalStatus=APPROVED (가입+승인)
//   3. 일반관리자 — role=ADMIN, adminTier=BASIC (가입+관리자 권한 부여)
//   4. 프로 관리자 — role=ADMIN, adminTier=PRO (마스터 관리자가 별도 부여)
//   5. 마스터 관리자 — role=ADMIN, adminTier=MASTER
export type AdminTier = "BASIC" | "PRO" | "MASTER";

// 공연 기획사(법인) — 같은 회사 실무자(개인) 여러 명이 이 기획사에 연결되어
// 서로의 대관 신청 내역을 함께 조회·관리할 수 있다.
export interface CompanyVerification {
  /** VERIFIED: 실존 확인 / NOT_FOUND: 조회되지 않음 / UNCHECKED: 확인 못함 */
  status: "VERIFIED" | "NOT_FOUND" | "UNCHECKED";
  companyName: string | null;
  representativeName: string | null;
  compStatus: string | null;
  compStatusLabel: string | null;
  compTypeLabel: string | null;
  message: string | null;
  checkedAt: string | null;
}

export interface Company {
  id: string;
  name: string;
  businessRegistrationNumber: string | null;
  representativeName: string | null;
  representativePhone: string | null;
  representativeFax: string | null;
  corporateRegistrationNumber: string | null;
  postalCode: string | null;
  address: string | null;
  businessCertUrl: string | null;
  businessCertName: string | null;
  createdAt: string;
  /** 회사 자체의 승인 상태 — 최초 가입자가 승인될 때 함께 확정된다. */
  status: CompanyStatus;
  /** 대표 담당자(마스터) 계정 id — 아직 정해지지 않았으면 null */
  masterUserId: string | null;
  companyPhone: string | null;
  companyFax: string | null;
  corporateNumber: string | null;
  /** 사업자 진위확인(NICE 법인실명확인) 결과 — 확인 이력이 없으면 null */
  verification: CompanyVerification | null;
  /** 신청 기업 유형(기획사/제작사/대행사/아티스트 소속사/기타) — 가입 시 설정, 미설정이면 null */
  companyType: ApplicantCompanyType | null;
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  officePhone: string | null;
  faxNumber: string | null;
  // 재직증명서(선택) — 가입 시 첨부한 파일. 미첨부면 둘 다 null.
  employmentCertUrl: string | null;
  employmentCertName: string | null;
  // 가입자 본인이 올린 사업자등록증(2026-08-27). 회사 행(Company.businessCertUrl)은 회사를
  // 처음 등록한 사람의 것 하나뿐이라, 기존 회사에 합류하는 사람이 올린 파일을 여기 따로 남긴다.
  businessCertUrl: string | null;
  businessCertName: string | null;
  name: string;
  companyName: string | null;
  companyId: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  // role이 ADMIN일 때만 값이 있다 (APPLICANT는 항상 null).
  adminTier: AdminTier | null;
  // 회원 유형 — 지금은 전부 CORPORATE.
  memberType: MemberType;
  // 회사 소속 신청자일 때만 값이 있다. 운영자(ADMIN)는 회사가 없어 null.
  companyRole: CompanyRole | null;
  // 휴대폰 본인인증을 마친 시각. null 이면 미인증 계정이다.
  identityVerifiedAt: string | null;
  // 탈퇴 시각. null 이면 유효한 계정이다. 탈퇴해도 행은 남으므로(신청서·감사로그의
  // 작성자를 잃지 않기 위해) 목록에서는 이 값으로 구분해 표시해야 한다.
  withdrawnAt: string | null;
  // 가입 승인·반려를 처리한 사람의 id 와 시각. 승인은 운영자와 회사 대표 담당자 둘 다
  // 할 수 있어, 처리 완료 목록에서 주체를 밝히려면 남겨야 한다.
  approvalDecidedBy: string | null;
  approvalDecidedAt: string | null;
  /** 반려 사유 — REJECTED 일 때만 값이 있다(승인·재심사 요청 시 지워진다) */
  approvalRejectReason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 기능정의서(내부 기획 문서) — 마스터 관리자 전용
// ---------------------------------------------------------------------------

// 표 하나의 한 행. 시트마다 컬럼 구성이 달라 자유 형식(컬럼명 -> 값)으로 저장한다.
export type FeatureSpecRow = Record<string, string>;

export const FEATURE_SPEC_SHEET_KEYS = [
  "메뉴트리(프론트)",
  "메뉴트리(어드민)",
  "기능정의(프론트)",
  "기능정의(어드민)",
  // [신규 2026-08-29] 회원가입·관리·권한·알림톡을 한자리에 모은 시트.
  // 계정 관련 규칙이 프론트/어드민 두 시트에 흩어져 있어 "누가 무엇을 할 수 있는가"를
  // 한 번에 볼 수 없었다. 새 키라 다음 기동 때 시드가 들어간다(기존 시트는 안 덮인다).
  "회원·권한",
  // [신규 2026-08-30] 역할 × 액션 격자. "회원·권한" 시트는 규칙을 문장으로 적어 두는데,
  // "이 역할이 이 화면에서 무엇을 할 수 있나"를 확인할 땐 격자가 있어야 빠지는 칸이 보인다.
  "권한 매트릭스",
  // [신규 2026-08-29] QA 체크리스트. 기능정의와 짝을 이루는 검증 목록이라 같은 화면에 둔다.
  "QA 체크리스트",
  "버그",
  "약관",
  "추가 개발 내역",
  "패키지 참고",
  "옵션 참고",
] as const;

export type FeatureSpecSheetKey = (typeof FEATURE_SPEC_SHEET_KEYS)[number];

// 감사 로그의 stage — 3단계 굵은 상태(QuoteStatus)뿐 아니라 그 사이에서 실제로 발생하는
// 개별 전이 이벤트도 함께 남긴다(리포트 12-B-7 운영 리드타임 지표의 전제). 기존 3개 값은
// 하위 호환을 위해 그대로 남겨둔다.
export type AuditLogAction =
  | QuoteStatus
  | "SUBMITTED"
  | "EDITED"
  | "REVIEW_APPROVED"
  | "REVIEW_HOLD"
  | "REVIEW_REJECTED"
  | "DEPOSIT_REPORTED"
  | "DEPOSIT_CONFIRMED"
  | "SIGNED_VENUE"
  | "SIGNED_APPLICANT"
  | "CONTRACT_ADDENDUM"
  | "INVOICE_ISSUED"
  | "INVOICE_PAYMENT_REPORTED"
  | "INVOICE_PAYMENT_CONFIRMED"
  | "TICKET_OPEN_SET"
  | "FACILITY_MEETING_SET"
  | "SETTLEMENT_MUTUAL_CONFIRMED";

export interface AuditLogEntry {
  id: string;
  quoteId: string;
  stage: AuditLogAction;
  snapshot: unknown;
  actorId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 인앱 알림 (이메일 발송 인프라가 없어 앱 내 알림으로 대체)
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  recipientId: string;
  /** 신청서와 무관한 알림(가입 승인·비밀번호 변경 등)은 null 이다. */
  quoteId: string | null;
  /** 눌렀을 때 갈 곳 — 없으면 역할별 기본 목록으로 간다. */
  link: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 1:1 문의
// ---------------------------------------------------------------------------

export type InquiryStatus = "OPEN" | "ANSWERED";

export interface Inquiry {
  id: string;
  /** 비회원(비로그인) 문의는 계정이 없다 — 아래 contact* 로만 회신한다. */
  userId: string | null;
  /** 문의 유형 (INQUIRY_CATEGORIES 중 하나). 운영자가 담당 부서를 판단하는 근거 */
  category: string | null;
  /** 관련 신청번호. 특정 신청 건을 전제하는 유형에서는 필수 */
  quoteId: string | null;
  title: string;
  content: string;
  /*
    답변받을 곳 (2026-09-02).

    계정 정보(가입 명의)와 다를 수 있어 문의마다 따로 받는다 — 승인 전 회원은 대개
    담당자가 정해지기 전이고, 회신은 실무자 메일·번호로 받는 편이 빠르다.
    비우고 저장된 옛 문의는 계정 정보로 대신 보낸다.
  */
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: InquiryStatus;
  answer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 공지사항 / FAQ (운영자가 등록·수정하는 게시형 콘텐츠)
// ---------------------------------------------------------------------------

export interface Notice {
  id: string;
  tag: string | null; // 말머리 (예: "공지", "점검", "이벤트")
  title: string;
  body: string;
  imageUrl: string | null;
  attachmentUrl: string | null; // 첨부파일(규약/상세문서 등) 다운로드 링크
  attachmentName: string | null; // 첨부파일 원본 파일명
  // [신규 2026-08-23] 켜면 공지 상세에 "대관 현황 캘린더" 아이콘이 붙고, 누르면 아레나/
  // 중형 예약 현황(가능/불가만, 회사명·quoteId 등 기업 정보는 노출하지 않음)을 레이어로
  // 보여준다. 티켓오픈 공지처럼 캘린더를 같이 보여줘야 하는 공지에만 켠다.
  showBookingCalendar: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  id: string;
  tag: string | null; // 말머리 (예: "신청", "정산", "시설")
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 알림 트리거 (운영자가 등록·수정하는 알림 발송 규칙)
// ---------------------------------------------------------------------------

/**
 * typeCode 가 아래 셋 중 하나인 규칙만 스케줄러(runReminderSweep)가 실제로 평가한다
 * (reminders.ts 참고). 그 외 typeCode는 운영자가 직접 추가한 카탈로그 항목으로,
 * 화면에 안내 문구로만 노출되고 자동 발송에 연동되지 않는다 — isSystem이 그 구분이다.
 */
export type NotificationRuleTypeCode = "INVOICE_UNPAID" | "TICKET_OPEN_MISSING" | "FACILITY_MEETING_MISSING";

export interface NotificationRule {
  id: string;
  typeCode: string;
  label: string;
  description: string;
  enabled: boolean;
  /** 시스템 기본 3종(true)은 삭제할 수 없고 typeCode도 바꿀 수 없다. */
  isSystem: boolean;
  /** 마감일 기준 며칠 전부터 알릴지 (D-30, D-7 등). 간격형 알림(세금계산서)은 null. */
  thresholdDays: number | null;
  /** 조건이 유지되는 동안 재발송 간격(일). */
  repeatIntervalDays: number | null;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 정적 안내 페이지 (서울아레나 소개 / 대관 안내 하위 페이지 트리, 운영자 편집)
// 정적 안내 페이지 (서울아레나 소개 / 대관 절차 하위 페이지 트리, 운영자 편집)
// ---------------------------------------------------------------------------

export type PageGroup = "VENUE" | "GUIDE";

export interface StaticPage {
  id: string;
  group: PageGroup;
  slug: string; // 그룹 내 고유 — URL에 사용 (/venue/[slug], /guide/[slug])
  navLabel: string; // 하위 탭에 표시되는 짧은 이름
  title: string;
  body: string; // 리치 에디터 HTML
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
