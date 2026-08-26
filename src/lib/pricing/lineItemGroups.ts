import type { LineItem } from "./types";

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
export function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

const CORE_LINE_IDS = new Set([
  "BASE_FEE",
  "package_discount",
  "day_exclusion_discount_prep",
  "day_exclusion_discount_performance",
  "extra_days",
  "performance_day_adjustment",
  "cleaning",
  "utility_bundle",
  "midhall_setup",
  "midhall_loadout_day",
  "midhall_extra_setup_hours",
  "midhall_extra_loadout_hours",
  "midhall_cleaning",
]);

function isCoreLine(item: LineItem): boolean {
  return CORE_LINE_IDS.has(item.addonId) || item.addonId.startsWith("midhall_show_");
}

// 대관료는 기본 대관료 · 전용 사용료 · 옵션 사용료 3단으로 묶는다(2026-08-23).
//  - 기본 대관료: 패키지 대관료 원가(BASE_FEE)와 그에 딸린 할인
//  - 전용 사용료: 준비일/공연일 등 실제 사용 일수에 따라 붙는 요금(추가일·평일제외
//    할인·중형 셋업/철수일 등) — "셋업일, 공연일" 단위로 매겨지는 항목들
//  - 옵션 사용료: 신청자가 직접 고른 선택 옵션(부대시설 등) — 그 외 나머지는 청소비·
//    유틸리티처럼 패키지에 고정으로 딸려오는 항목이라 기본 대관료 쪽에 둔다
export type FeeGroup = "BASE" | "EXCLUSIVE" | "OPTION";

const EXCLUSIVE_USAGE_LINE_IDS = new Set([
  "extra_days",
  "performance_day_adjustment",
  "day_exclusion_discount_prep",
  "day_exclusion_discount_performance",
  "midhall_setup",
  "midhall_loadout_day",
  "midhall_extra_setup_hours",
  "midhall_extra_loadout_hours",
]);

export function feeGroupOf(item: LineItem): FeeGroup {
  if (!isCoreLine(item)) return "OPTION";
  if (EXCLUSIVE_USAGE_LINE_IDS.has(item.addonId) || item.addonId.startsWith("midhall_show_")) return "EXCLUSIVE";
  return "BASE";
}

export const FEE_GROUP_LABEL: Record<FeeGroup, string> = {
  BASE: "기본 대관료",
  EXCLUSIVE: "전용 사용료",
  OPTION: "옵션",
};
export const FEE_GROUP_ORDER: FeeGroup[] = ["BASE", "EXCLUSIVE", "OPTION"];

// [신규 2026-08-26] "패키지에 대한 실제 계약금액과 옵션 선택분(추가 예상 예산)은
// 성격이 다르니 슬롯을 나눠 보여달라"는 요청 — 기본 대관료·전용 사용료(패키지에
// 묶인 항목)는 "계약 내역"으로, 옵션 사용료는 "추가 예상 금액"으로 묶는다.
export type ContractSection = "CONTRACT" | "ADDITIONAL";

export function sectionOf(item: LineItem): ContractSection {
  return feeGroupOf(item) === "OPTION" ? "ADDITIONAL" : "CONTRACT";
}

export const SECTION_LABEL: Record<ContractSection, string> = {
  CONTRACT: "계약 내역",
  ADDITIONAL: "추가 예상 금액",
};

export const SECTION_GROUPS: Record<ContractSection, FeeGroup[]> = {
  CONTRACT: ["BASE", "EXCLUSIVE"],
  ADDITIONAL: ["OPTION"],
};

export function sectionSubtotal(items: LineItem[], section: ContractSection): number {
  return items.filter((item) => sectionOf(item) === section).reduce((sum, item) => sum + item.amount, 0);
}
