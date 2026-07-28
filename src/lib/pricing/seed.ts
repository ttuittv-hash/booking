import type { AddonItem, RateTable, RentalPackage } from "./types";

// 모든 금액은 확정 전 플레이스홀더입니다. 실제 요금표 확정 시 운영자 백오피스(요금표 관리)에서
// 교체하면 됩니다. 이 파일은 DB가 비어 있을 때 최초 1회 시드하는 기본값입니다.

export const SEED_RATE_TABLE_VERSION = "2026-07-seed-v1";

export const SEED_PACKAGES: RentalPackage[] = [
  {
    id: 1,
    name: "패키지 1",
    audienceTier: { min: 0, max: 5000, label: "~5,000석 규모" },
    baseFeePerWeek: 30_000_000,
    includedWeeks: 1,
    mediaTier: "BASIC",
    includedItems: [
      { addonId: "waiting_room", quantity: 2 },
      { addonId: "follow_spot", quantity: 2 },
      { addonId: "intercom_wireless", quantity: 4 },
    ],
  },
  {
    id: 2,
    name: "패키지 2",
    audienceTier: { min: 5001, max: 10000, label: "~10,000석 규모" },
    baseFeePerWeek: 55_000_000,
    includedWeeks: 1,
    mediaTier: "EXTENDED",
    includedItems: [
      { addonId: "waiting_room", quantity: 2 },
      { addonId: "follow_spot", quantity: 4 },
      { addonId: "intercom_wireless", quantity: 6 },
    ],
  },
  {
    id: 3,
    name: "패키지 3",
    audienceTier: { min: 10001, max: 15000, label: "~15,000석 규모" },
    baseFeePerWeek: 85_000_000,
    includedWeeks: 1,
    mediaTier: "FULL",
    includedItems: [
      { addonId: "waiting_room", quantity: 3 },
      { addonId: "mother_truss_a", quantity: 1 },
      { addonId: "mother_truss_b", quantity: 1 },
      { addonId: "center_lift", quantity: 1 },
      { addonId: "reduction_curtain", quantity: 1 },
    ],
  },
  {
    id: 4,
    name: "패키지 4",
    audienceTier: { min: 15001, max: 99999, label: "20,000석+ 규모" },
    baseFeePerWeek: 120_000_000,
    includedWeeks: 1,
    mediaTier: "FULL",
    includedItems: [
      { addonId: "waiting_room", quantity: 4 },
      { addonId: "mother_truss_a", quantity: 1 },
      { addonId: "mother_truss_b", quantity: 1 },
      { addonId: "mother_truss_c", quantity: 1 },
      { addonId: "center_lift", quantity: 1 },
      { addonId: "reduction_curtain", quantity: 1 },
    ],
  },
];

export const SEED_ADDONS: AddonItem[] = [
  { id: "late_night_slot", category: "SCHEDULE", name: "심야 추가대관", pricingType: "PER_HOUR", unitPrice: 2_000_000, unitLabel: "원/시간", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", note: "특정 월요일·시간 선택 필요" },
  { id: "extra_slot", category: "SCHEDULE", name: "일반 추가대관", pricingType: "PER_HOUR", unitPrice: 1_000_000, unitLabel: "원/시간", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "cleaning", category: "SERVICE", name: "청소비", pricingType: "PER_PERSON", unitPrice: 1_000, unitLabel: "원/인", availability: { mode: "ALWAYS" }, autoQuantity: "AUDIENCE", billingPhase: "ESTIMATE", note: "예상 관객수 자동 산출" },
  { id: "meal", category: "SERVICE", name: "식사비", pricingType: "PER_MEAL", unitPrice: 12_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "artist_meal", category: "SERVICE", name: "아티스트 식사", pricingType: "PER_MEAL", unitPrice: 30_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "catering", category: "SERVICE", name: "케이터링", pricingType: "PER_MEAL", unitPrice: 25_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "retractable_seat", category: "FACILITY", name: "수납식 객석 사용료", pricingType: "PER_SECTION", unitPrice: 3_000_000, unitLabel: "원/섹션", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "waiting_room", category: "SPACE", name: "대기실", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", note: "패키지 기본 포함분 초과 시 과금" },
  { id: "practice_room", category: "SPACE", name: "연습실", pricingType: "PER_DAY", unitPrice: 800_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "multi_room", category: "SPACE", name: "다목적실", pricingType: "PER_DAY", unitPrice: 700_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "recording_room", category: "SPACE", name: "녹음실", pricingType: "PER_DAY", unitPrice: 1_500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "simulation_room", category: "SPACE", name: "시뮬레이션룸", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "press_room", category: "SPACE", name: "프레스룸", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "skybox", category: "PREMIUM", name: "스카이박스", pricingType: "PER_ROOM", unitPrice: 3_000_000, unitLabel: "원/실", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "mother_truss_a", category: "PRODUCTION", name: "마더트러스 A 추가", pricingType: "PER_DAY", unitPrice: 3_000_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", note: "선택 패키지 불포함 시에만 선택 가능" },
  { id: "mother_truss_b", category: "PRODUCTION", name: "마더트러스 B 추가", pricingType: "PER_DAY", unitPrice: 2_500_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE" },
  { id: "mother_truss_c", category: "PRODUCTION", name: "마더트러스 C 추가", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE" },
  { id: "reduction_curtain", category: "PRODUCTION", name: "리덕션 커튼", pricingType: "PER_DAY", unitPrice: 1_500_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE" },
  { id: "center_lift", category: "PRODUCTION", name: "센터리프트", pricingType: "PER_DAY", unitPrice: 4_000_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE" },
  { id: "smart_stage", category: "PRODUCTION", name: "스마트스테이지", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [1, 2], maxAddQuantity: 1 }, billingPhase: "ESTIMATE" },
  { id: "follow_spot", category: "PRODUCTION", name: "팔로우 스팟", pricingType: "PER_DAY", unitPrice: 500_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [1, 2] }, billingPhase: "ESTIMATE" },
  { id: "stair_led", category: "PRODUCTION", name: "계단 LED", pricingType: "PER_DAY", unitPrice: 800_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "intercom_wireless", category: "PRODUCTION", name: "무선 인터컴", pricingType: "PER_DAY", unitPrice: 300_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [1, 2] }, billingPhase: "ESTIMATE" },
  { id: "intercom_wired", category: "PRODUCTION", name: "유선 인터컴", pricingType: "PER_DAY", unitPrice: 200_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "online_streaming_fee", category: "FEE", name: "온라인 송출 수수료", pricingType: "REVENUE_PERCENT", unitPrice: 5, unitLabel: "매출 %", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "util_electricity", category: "UTILITY", name: "일반전기", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", note: "실사용 부과" },
  { id: "util_water", category: "UTILITY", name: "상하수도", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", note: "실사용 부과" },
  { id: "util_heating", category: "UTILITY", name: "난방비", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", note: "실사용 부과" },
  { id: "util_cooling", category: "UTILITY", name: "냉방비", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", note: "실사용 부과" },
  { id: "media_basic", category: "PROMOTION", name: "디지털 매체 (기본)", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [1] }, billingPhase: "ESTIMATE" },
  { id: "media_extended", category: "PROMOTION", name: "디지털 매체 (확장)", pricingType: "PER_DAY", unitPrice: 4_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [2] }, billingPhase: "ESTIMATE" },
  { id: "media_full", category: "PROMOTION", name: "디지털 매체 (풀팩)", pricingType: "PER_DAY", unitPrice: 6_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [3, 4] }, billingPhase: "ESTIMATE" },
  { id: "outdoor_streetlight", category: "PROMOTION", name: "옥외광고 (가로등 배너)", pricingType: "PER_DAY", unitPrice: 500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "outdoor_xbanner", category: "PROMOTION", name: "옥외광고 (엑스배너)", pricingType: "PER_DAY", unitPrice: 300_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
  { id: "outdoor_wrapping", category: "PROMOTION", name: "옥외광고 (래핑)", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE" },
];

// 초과 주차 단가는 아직 미확정 항목(명세서 4.3)이라, 패키지 기본 대관료의 60%를 임시 비율로 둔다.
export const SEED_EXTRA_WEEK_RATIO = 0.6;

export function buildSeedRateTable(): RateTable {
  return {
    version: SEED_RATE_TABLE_VERSION,
    vatRate: 0.1,
    extraWeekRatio: SEED_EXTRA_WEEK_RATIO,
    packages: SEED_PACKAGES,
    addons: SEED_ADDONS,
    updatedAt: new Date(0).toISOString(),
  };
}
