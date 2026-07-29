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

export interface RentalPackage {
  id: number; // 1~4
  name: string; // "패키지 1"
  audienceTier: {
    min: number;
    max: number;
    label: string; // "~5,000석 규모"
  };
  baseFeePerWeek: number; // 기본 대관료(1주, 고정가) — 요금표에서 주입
  includedWeeks: number; // 기본 포함 주차 (통상 1)
  includedItems: PackageInclusion[]; // 기본 포함사항 (3단계에 표시)
  mediaTier: MediaTier; // 홍보 디지털 매체(구좌) 등급 개방

  // 아래 항목은 "패키지 구성" 명세(대관시스템 노출)를 반영한 설명 정보입니다.
  // 과금 대상이 아니며(정찰제 대관료에 포함), 패키지 비교/안내용으로만 표시됩니다.
  dayBreakdown: string; // 세부 구성 — "준비 4일 + 공연 2일" (전 패키지 공통)
  defaultPerformanceDays: number; // dayBreakdown의 공연일수(숫자) — 준비일/공연일 조정 과금의 기준값
  rentalHours: string; // 대관시간 — "09:00~22:00" (전 패키지 공통)
  outdoorPlazaIncluded: boolean; // 야외광장 + 티켓박스 포함 여부 (전 패키지 공통)
  parkingPerDay: string; // 주차 기본 제공 — "100대/일" (패키지별 상이)
  waitingRoomNote: string; // 대기실 상세 — "지하 4실 · 지상 3실" (패키지별 상이)
  sideFacilities: string; // 부속공간 — 패키지별 상이

  // 아래 항목은 명세서 기준 "대관시스템 미노출" 항목 — 내부 참고용이며 신청자 화면에는 표시하지 않습니다.
  seatingType: string; // 객석 운영 형태
  stageType: string; // 무대형태
}

export type AvailabilityMode = "ALWAYS" | "IF_PACKAGE_IN" | "IF_NOT_INCLUDED";

export interface AvailabilityRule {
  mode: AvailabilityMode;
  packages?: number[]; // mode=IF_PACKAGE_IN 일 때 대상 패키지 id
  maxAddQuantity?: number | "UNLIMITED"; // 추가 가능 상한 (기본 포함 수량 위에 더 얹을 수 있는 양)
}

export type BillingPhase = "ESTIMATE" | "SETTLEMENT";

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
  note?: string;
}

export interface RateTable {
  version: string;
  vatRate: number; // 0.1
  extraWeekRatio: number; // 초과 주차 단가 = 패키지 기본 대관료 × 이 비율 (미확정 항목 임시 규칙)
  dayExclusionDiscountRatio: number; // 화~일 중 미사용(제외) 요일 1일당 할인 비율 (기본 대관료 × 이 비율)
  packages: RentalPackage[];
  addons: AddonItem[];
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

export type DayTag = "PREP" | "PERFORMANCE";

export interface QuoteSelection {
  packageId: number | null; // 1단계
  week: { year: number; month: number; weekOfMonth: number }; // 2단계 (화~일 시작 주)
  excludedDays: WeekDay[]; // 화~일 6일 중 실제 사용하지 않는 요일 (요일당 정액 할인, 최소 1일은 남겨야 함)
  extraDays: number; // 일요일 이후로 연장하는 추가 일수 (일 단위 과금, 0 이상)
  dayTags: Record<string, DayTag>; // 실제 대관일(ISO 날짜)별 준비일/공연일 지정 — 미지정 시 패키지 기본값 적용
  expectedAudience: number; // 관객수 (청소비 등 자동 산출 입력값)
  expectedRevenue?: number; // 온라인 송출 수수료 계산용 (선택)
  addons: SelectedAddon[]; // 4단계 선택 항목
}

export interface WeekDemand {
  year: number;
  month: number;
  weekOfMonth: number;
  companyCount: number; // 해당 주에 대관 신청서를 낸 회사(신청자) 수
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
>;

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

export interface Settlement {
  quoteId: string;
  onSiteAdditions: { label: string; amount: number }[]; // 현장 추가
  unusedDeductions: { label: string; amount: number }[]; // 미사용 차감
  meteredActuals: { label: string; amount: number }[]; // 유틸리티 실사용 확정
  finalTotal: number; // 최종 정산금액
  decidedAt: string;
  decidedBy: string;
}

// ---------------------------------------------------------------------------
// 보증금 (계좌이체 확인 방식 — 실제 PG 연동 전 임시 운영 방식)
// ---------------------------------------------------------------------------

export type DepositStatus = "PENDING" | "REPORTED" | "CONFIRMED";

export interface Deposit {
  id: string;
  quoteId: string;
  requiredAmount: number;
  depositRate: number; // 계약금액 대비 보증금 비율 (%)
  status: DepositStatus;
  depositorName: string | null; // 신청자가 입금신청 시 입력한 입금자명
  reportedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 첨부서류
// ---------------------------------------------------------------------------

export interface Attachment {
  id: string;
  quoteId: string;
  storedName: string; // 디스크에 저장된 파일명 (충돌/경로탐색 방지용 난수)
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 사용자 / 감사 로그
// ---------------------------------------------------------------------------

export type UserRole = "APPLICANT" | "ADMIN";

// 신청자(대관사) 계정은 일반인이 자유 가입할 수 없도록 운영자 승인이 필요하다.
// 운영자(ADMIN) 계정은 항상 APPROVED로 생성된다.
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

// 공연 기획사(법인) — 같은 회사 실무자(개인) 여러 명이 이 기획사에 연결되어
// 서로의 대관 신청 내역을 함께 조회·관리할 수 있다.
export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  companyId: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  quoteId: string;
  stage: QuoteStatus;
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
  quoteId: string;
  message: string;
  isRead: boolean;
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
// 정적 안내 페이지 (서울아레나 소개 / 대관 안내 하위 페이지 트리, 운영자 편집)
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
