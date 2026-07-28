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
  mediaTier: MediaTier; // 홍보 디지털 매체 등급 개방
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
  packages: RentalPackage[];
  addons: AddonItem[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 견적/신청 상태
// ---------------------------------------------------------------------------

export interface QuoteSelection {
  packageId: number | null; // 1단계
  week: { year: number; month: number; weekOfMonth: number }; // 2단계 (화~일)
  extraWeeks: number; // 초과 주차 수
  expectedAudience: number; // 관객수 (청소비 등 자동 산출 입력값)
  expectedRevenue?: number; // 온라인 송출 수수료 계산용 (선택)
  addons: SelectedAddon[]; // 4단계 선택 항목
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
  contract: ContractAdjustment | null;
  settlement: Settlement | null;
}

// 제출 전 클라이언트/서버가 실시간으로 계산만 하는 견적 미리보기 (계정/DB 필드 없음)
export type EstimatedQuote = Omit<
  Quote,
  "id" | "applicantId" | "createdAt" | "contract" | "settlement"
>;

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

export interface AppUser {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  role: UserRole;
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
