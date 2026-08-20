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

export const VENUES: Venue[] = [
  { id: "arena", name: "아레나" },
  { id: "medium-hall", name: "중형공연장" },
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
  baseFeePerWeek: number; // 기본 대관료(1주, 고정가) — 요금표에서 주입
  includedWeeks: number; // 기본 포함 주차 (통상 1)
  includedItems: PackageInclusion[]; // 기본 포함사항 (3단계에 표시)
  mediaTier: MediaTier; // 홍보 디지털 매체(구좌) 등급 개방
  discountRatio: number; // 0=할인 없음, 0.1=기본 대관료 10% 할인 — 견적 계산 시 기본 대관료에 적용

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
  venueId: string | null; // 0단계: 공간 선택
  packageId: number | null; // 1단계
  week: { year: number; month: number; weekOfMonth: number }; // 2단계 (화~일 시작 주)
  excludedDays: WeekDay[]; // 화~일 6일 중 실제 사용하지 않는 요일 (요일당 정액 할인, 최소 1일은 남겨야 함)
  extraDays: number; // 일요일 이후로 연장하는 추가 일수 (일 단위 과금, 0 이상)
  dayTags: Record<string, DayTag>; // 실제 대관일(ISO 날짜)별 준비일/공연일 지정 — 미지정 시 패키지 기본값 적용
  expectedAudience: number; // 관객수 (청소비 등 자동 산출 입력값)
  expectedRevenue?: number; // 온라인 송출 수수료 계산용 (선택)
  addons: SelectedAddon[]; // 4단계 선택 항목
  performanceInfo: PerformanceInfo; // 공연 정보 입력 단계
}

// ---------------------------------------------------------------------------
// 공연 정보 입력 — 예상 대관료 확인 이후, 신청서 제출 전 공통 프로세스
// ---------------------------------------------------------------------------

export type EventType = "CONCERT" | "FANMEETING_CONCERT" | "CORPORATE" | "PUBLIC";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  CONCERT: "콘서트",
  FANMEETING_CONCERT: "팬미팅·콘서트",
  CORPORATE: "기업행사",
  PUBLIC: "공공행사",
};

export type StageType = "END_STAGE" | "CENTER_STAGE";

export const STAGE_TYPE_LABEL: Record<StageType, string> = {
  END_STAGE: "앤드스테이지",
  CENTER_STAGE: "센터스테이지",
};

export type SeatingType = "SEATED" | "STANDING";

export const SEATING_TYPE_LABEL: Record<SeatingType, string> = {
  SEATED: "객석",
  STANDING: "스탠딩",
};

export type RetractableSeatUse = "USE" | "NOT_USE";

export const RETRACTABLE_SEAT_USE_LABEL: Record<RetractableSeatUse, string> = {
  USE: "사용",
  NOT_USE: "미사용",
};

export interface PerformanceInfo {
  eventName: string; // 공연(행사)명
  artist: string; // 아티스트
  organizer: string; // 주최·주관·기획
  eventScale: string; // 행사규모
  eventTypes: EventType[]; // 행사유형
  stageTypes: StageType[]; // 무대형태
  seatingTypes: SeatingType[]; // 객석형태
  retractableSeatUse: RetractableSeatUse | null; // 수납식 객석 사용여부
}

export interface WeekDemand {
  year: number;
  month: number;
  weekOfMonth: number;
  companyCount: number; // 해당 주에 대관 신청서를 낸 회사(신청자) 수
}

export interface DateBlock {
  date: string; // ISO yyyy-mm-dd
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
  mutualConfirmedAt?: string | null; // 신청자가 정산 내역을 확인한 시점 (상호 확인)
  mutualConfirmedBy?: string | null;
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
// 대관 현황 — 계약 이후 진행 단계 (전자 날인 / 세금계산서 / 티켓오픈 / 시설회의)
// 명세상 정식 연동 서비스(전자서명·세금계산서 발행 API) 도입 전까지는, 보증금과 동일하게
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

// 세금계산서 — 계약금액(CONTRACT)·정산금액(SETTLEMENT) 공용. 발행 → 입금신청 → 입금확인,
// 발행 후 미입금 상태가 5일 이상 지속되면 알림이 재발송된다(lastReminderAt 기준 lazy 체크).
export type InvoicePurpose = "CONTRACT" | "SETTLEMENT";
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
  openDate: string | null; // ISO yyyy-mm-dd — 보증금 입금 확인 후 운영자가 등록
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

export type AttachmentCategory = "TICKET_OPEN" | "FACILITY_MEETING" | null;

export interface Attachment {
  id: string;
  quoteId: string;
  storedName: string; // 디스크에 저장된 파일명 (충돌/경로탐색 방지용 난수)
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  category: AttachmentCategory; // null = 일반 신청서류, 그 외 = 티켓오픈/시설회의 전용 자료
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 사용자 / 감사 로그
// ---------------------------------------------------------------------------

export type UserRole = "APPLICANT" | "ADMIN";

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
  postalCode: string | null;
  address: string | null;
  businessCertUrl: string | null;
  businessCertName: string | null;
  createdAt: string;
  /** 사업자 진위확인(NICE 법인실명확인) 결과 — 확인 이력이 없으면 null */
  verification: CompanyVerification | null;
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  companyName: string | null;
  companyId: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  // role이 ADMIN일 때만 값이 있다 (APPLICANT는 항상 null).
  adminTier: AdminTier | null;
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
  "버그",
  "약관",
  "추가 개발 내역",
  "패키지 참고",
  "옵션 참고",
] as const;

export type FeatureSpecSheetKey = (typeof FEATURE_SPEC_SHEET_KEYS)[number];

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
// 1:1 문의
// ---------------------------------------------------------------------------

export type InquiryStatus = "OPEN" | "ANSWERED";

export interface Inquiry {
  id: string;
  userId: string;
  /** 문의 유형 (INQUIRY_CATEGORIES 중 하나). 운영자가 담당 부서를 판단하는 근거 */
  category: string | null;
  /** 관련 신청번호. 특정 신청 건을 전제하는 유형에서는 필수 */
  quoteId: string | null;
  title: string;
  content: string;
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
