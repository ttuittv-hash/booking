import { ARENA_PACKAGE_RATES } from "@/lib/content/rateFacts";
import { ARENA_RATE_INCLUDES } from "@/lib/content/venueFacts";
import type { AddonItem, RateTable, RentalPackage } from "./types";

/* ============================================================================
   요금표 시드 — DB 가 비어 있을 때 최초 1회 넣는 기본값.
   운영 중 값은 백오피스(요금표 관리)에서 교체한다.

   정본: `대관 오픈 준비_101.xlsx` › 대관료 시트 (2026-08)
   화면 표기 정본은 `src/lib/content/rateFacts.ts` 이며, 패키지 대관료는 그 파일에서 가져온다.
   두 곳에 금액을 적으면 반드시 어긋나므로 여기서 숫자를 다시 쓰지 않는다.

   2026-08 교체 내역
     ① 패키지 대관료 — 429/489/557/609백만(내부 검토안) → 518/548/613/660백만(요금 시트)
     ② 관객 규모 상한 — 패키지 4 의 99,999 → 22,000
     ③ 센터 리프트 — 실물 1 EA. "패키지 3·4 기본 포함 2대" 는 성립하지 않는다.
        기본 포함에서 빼고 추가 항목으로만 둔다 (1,500,000원 / 공연 회당)
     ④ 송출 수수료 — 매출 5% → 3%
     ⑤ 관계자 주차 — 전 패키지 150대 (단지 총량 915대와 구분)
     ⑥ 기본 포함사항 — 수량·초과 단가 모델에서 서술 목록(RATE INCLUDES)으로 전환.
        요금 시트에 초과 단가가 있는 항목만 추가 항목으로 남긴다
     ⑦ 유선 인터컴 — 시트에 요금이 없어 신청 항목에서 제외 (1:1 문의로 안내)
     ⑧ 홍보 디지털 매체 A/B/C 세트 — 시트에 없다. 옥외 광고물·디지털 매체 협의 항목 하나로 통합
     ⑨ 중형공연장 — 패키지 개념이 없다. 일수 기준 트랙은 9/1 대관오픈 범위이므로
        패키지 시드에서 제외한다 (근거 없는 금액을 만들지 않는다)
   ========================================================================= */

export const SEED_RATE_TABLE_VERSION = "2026-08-rate-sheet-v1";

/** 전 패키지 공통 운영 조건 — 요금 시트 기준·제한 사항 */
const COMMON = {
  includedWeeks: 1,
  discountRatio: 0,
  dayBreakdown: "셋업 4일 + 공연 2일",
  defaultPerformanceDays: 2,
  rentalHours: "09:00 ~ 22:00",
  outdoorPlazaIncluded: true,
  parkingPerDay: "150대/일",
  waitingRoomNote: "지하 8실 · 지상 6실 (총 14실)",
  sideFacilities: "다목적실 2실 · 운영관리실 · 프로덕션룸 · 녹음실 · 식당 · 프레스룸",
} as const;

const TAGLINE: Record<1 | 2 | 3 | 4, string> = {
  1: "엔드 스테이지와 플로어 지정석으로 여는 표준 구성",
  2: "엔드 스테이지에 플로어 스탠딩을 더한 구성",
  3: "센터 스테이지로 객석을 사방에 두는 구성",
  4: "센터 스테이지와 플로어 스탠딩으로 최대 규모를 담는 구성",
};

export const SEED_PACKAGES: RentalPackage[] = ARENA_PACKAGE_RATES.map((r, i) => {
  const prev = ARENA_PACKAGE_RATES[i - 1];
  return {
    id: r.id,
    venueId: "arena",
    name: r.name,
    tagline: TAGLINE[r.id],
    audienceTier: {
      min: prev ? Number(prev.capacity.replace(/\D/g, "")) + 1 : 0,
      max: Number(r.capacity.replace(/\D/g, "")),
      label: `${r.capacity} 규모`,
    },
    baseFeePerWeek: r.total,
    includedItems: [],
    rateIncludes: ARENA_RATE_INCLUDES,
    mediaTier: null,
    seatingType: r.seatingType,
    stageType: r.stageType,
    ...COMMON,
  } satisfies RentalPackage;
});

/**
 * 추가 사용료 — 요금 시트 ADDITIONAL CHARGES 를 그대로 옮긴 것.
 * 시트에 없는 항목은 만들지 않는다. 금액을 창작하지 않는다.
 */
export const SEED_ADDONS: AddonItem[] = [
  {
    id: "extra_slot",
    category: "SCHEDULE",
    name: "추가 대관 (종일 09:00~24:00)",
    pricingType: "PER_HOUR",
    unitPrice: 35_000_000,
    unitLabel: "원/시간",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
    note: "기준 이용시간(09:00~22:00)을 넘길 때",
  },
  {
    id: "late_night_slot",
    category: "SCHEDULE",
    name: "추가 대관 (철야 24:00~06:00)",
    pricingType: "PER_HOUR",
    unitPrice: 45_000_000,
    unitLabel: "원/시간",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
  },
  {
    id: "booth",
    category: "SPACE",
    name: "부스",
    pricingType: "PER_DAY",
    unitPrice: 1_000_000,
    unitLabel: "원/1일·개소",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
  },
  {
    id: "popup_space",
    category: "SPACE",
    name: "팝업 공간",
    pricingType: "PER_DAY",
    unitPrice: 2_000_000,
    unitLabel: "원/1일",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
    note: "20평 기준",
  },
  {
    id: "practice_room",
    category: "SPACE",
    name: "B1F 연습실",
    pricingType: "PER_DAY",
    unitPrice: 1_000_000,
    unitLabel: "원/1일",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
  },
  {
    id: "center_lift",
    category: "PRODUCTION",
    name: "센터 리프트",
    pricingType: "PER_DAY",
    unitPrice: 1_500_000,
    unitLabel: "원/공연 회당",
    availability: { mode: "ALWAYS", maxAddQuantity: 1 },
    billingPhase: "ESTIMATE",
    note: "1대 보유 — 같은 시간에 한 곳에서만 운용",
  },
  {
    id: "follow_spot",
    category: "PRODUCTION",
    name: "팔로우 스팟",
    pricingType: "PER_DAY",
    unitPrice: 150_000,
    unitLabel: "원/1일·대당",
    availability: { mode: "ALWAYS", maxAddQuantity: 15 },
    billingPhase: "ESTIMATE",
    note: "최대 15대",
  },
  {
    id: "intercom_wireless",
    category: "PRODUCTION",
    name: "무선 인터컴",
    pricingType: "PER_DAY",
    unitPrice: 30_000,
    unitLabel: "원/1일·팩당",
    availability: { mode: "ALWAYS", maxAddQuantity: 20 },
    billingPhase: "ESTIMATE",
    note: "최대 20팩",
  },
  {
    id: "extra_parking",
    category: "SERVICE",
    name: "추가 주차권",
    pricingType: "PER_DAY",
    unitPrice: 15_000,
    unitLabel: "원/1일권·대당",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
    note: "포함 150대를 넘길 때",
  },
  {
    id: "online_streaming_fee",
    category: "FEE",
    name: "송출 수수료",
    pricingType: "REVENUE_PERCENT",
    unitPrice: 3,
    unitLabel: "매출 %",
    availability: { mode: "ALWAYS" },
    billingPhase: "ESTIMATE",
  },
  {
    id: "outdoor_media",
    category: "PROMOTION",
    name: "옥외 광고물·디지털 매체",
    pricingType: "METERED",
    unitPrice: 0,
    unitLabel: "위치·규격에 따라 산정",
    availability: { mode: "ALWAYS" },
    billingPhase: "SETTLEMENT",
    note: "협의 요청으로 접수합니다",
  },
  {
    id: "util_electricity",
    category: "UTILITY",
    name: "일반전기",
    pricingType: "METERED",
    unitPrice: 0,
    unitLabel: "실사용 정산",
    availability: { mode: "ALWAYS" },
    billingPhase: "SETTLEMENT",
    note: "수도광열비 — 실사용량 기준 사후 정산",
  },
  {
    id: "util_water",
    category: "UTILITY",
    name: "상하수도",
    pricingType: "METERED",
    unitPrice: 0,
    unitLabel: "실사용 정산",
    availability: { mode: "ALWAYS" },
    billingPhase: "SETTLEMENT",
    note: "수도광열비 — 실사용량 기준 사후 정산",
  },
  {
    id: "util_heating",
    category: "UTILITY",
    name: "난방비",
    pricingType: "METERED",
    unitPrice: 0,
    unitLabel: "실사용 정산",
    availability: { mode: "ALWAYS" },
    billingPhase: "SETTLEMENT",
    note: "수도광열비 — 실사용량 기준 사후 정산",
  },
  {
    id: "util_cooling",
    category: "UTILITY",
    name: "냉방비",
    pricingType: "METERED",
    unitPrice: 0,
    unitLabel: "실사용 정산",
    availability: { mode: "ALWAYS" },
    billingPhase: "SETTLEMENT",
    note: "수도광열비 — 실사용량 기준 사후 정산",
  },
];

// 초과 주차 단가는 요금 시트에 없다(변경 대관료만 있다). 확정 전까지 임시 비율을 유지한다.
export const SEED_EXTRA_WEEK_RATIO = 0.6;

// 화~일 6일 중 미사용 요일 1일당 할인 비율. 6일 중 1일 = 약 16.7%를 임시 비율로 둔다.
export const SEED_DAY_EXCLUSION_DISCOUNT_RATIO = 1 / 6;

export function buildSeedRateTable(): RateTable {
  return {
    version: SEED_RATE_TABLE_VERSION,
    vatRate: 0.1,
    extraWeekRatio: SEED_EXTRA_WEEK_RATIO,
    dayExclusionDiscountRatio: SEED_DAY_EXCLUSION_DISCOUNT_RATIO,
    packages: SEED_PACKAGES,
    addons: SEED_ADDONS,
    updatedAt: new Date(0).toISOString(),
  };
}
