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
  // [버그 수정 2026-09-08] "휴무일은 대관료에 포함되어야해 / 옵션 항목만 옵션 쪽에
  // 합산되어야지" — extra_days_rest(추가일수 휴무일 N일)가 이 목록에 없어서
  // isCoreLine이 false를 돌려주고, feeGroupOf가 "OPTION"으로 분류해 "추가 옵션"
  // 박스에 잘못 합산되고 있었다. 형제 항목 extra_days와 같은 취급으로 바로잡는다.
  "extra_days_rest",
  "performance_day_adjustment",
  "cleaning",
  "utility_bundle",
  "midhall_setup",
  "midhall_loadout_day",
  "midhall_extra_setup_hours",
  "midhall_extra_loadout_hours",
  "midhall_cleaning",
]);

/**
 * 신청자 화면(우측 실시간 내역)에서 줄로 보여주지 않는 항목 (2026-09-02).
 *
 * 청소비는 신청자가 고르는 항목이 아니라 예상 관객수로 자동 산출되는 값이다. 그런데
 * 계약 내역에 제 줄로 서 있어서 "이건 왜 여기만 따로 있느냐"는 물음이 반복됐다 —
 * 유틸리티(utility_bundle)와 성격이 같으므로 같이 감춘다.
 *
 * **합계에서 빼는 게 아니다.** quote.subtotal/total 은 전체 lineItems 로 이미 계산돼
 * 있고, 운영자 화면은 언제나 전체 내역을 그대로 본다(기능정의서 2-71).
 */
export const APPLICANT_HIDDEN_LINE_IDS = new Set(["cleaning", "midhall_cleaning"]);

export function isHiddenFromApplicant(item: LineItem): boolean {
  return item.visibility === "HIDDEN" || APPLICANT_HIDDEN_LINE_IDS.has(item.addonId);
}

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
  "extra_days_rest",
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
// [신규 2026-08-26] "패키지에 대한 실제 계약금액과 옵션 선택분(추가 예상 예산)은
// 성격이 다르니 슬롯을 나눠 보여달라"는 요청 — 기본 대관료·전용 사용료(패키지에
// 묶인 항목)는 "대관료"로, 옵션 사용료는 "추가 옵션"으로 묶는다.
export type ContractSection = "CONTRACT" | "ADDITIONAL";

export function sectionOf(item: LineItem): ContractSection {
  return feeGroupOf(item) === "OPTION" ? "ADDITIONAL" : "CONTRACT";
}

// [개정 2026-09-08] "예상 대관료 내역은 오른쪽 실시간 대관 신청내역과 필드값이
// 동일해야지" — 위저드(Step5Estimate) · 마이페이지 · 인쇄용 신청서가 함께 쓰는 이
// 라벨을, 실시간 요약 패널(SummaryPanel)의 박스 제목·소계 라벨과 같은 말로
// 맞췄다(예전 "계약 내역"/"실제 계약금액", "추가 예상 금액"/"추가 예상 금액").
export const SECTION_LABEL: Record<ContractSection, string> = {
  CONTRACT: "대관료",
  ADDITIONAL: "추가 옵션",
};

export const SECTION_SUBTOTAL_LABEL: Record<ContractSection, string> = {
  CONTRACT: "총 대관료",
  ADDITIONAL: "총 옵션비용",
};

export const SECTION_GROUPS: Record<ContractSection, FeeGroup[]> = {
  CONTRACT: ["BASE", "EXCLUSIVE"],
  ADDITIONAL: ["OPTION"],
};

export function sectionSubtotal(items: LineItem[], section: ContractSection): number {
  return items.filter((item) => sectionOf(item) === section).reduce((sum, item) => sum + item.amount, 0);
}

/**
 * [신규 2026-09-07, 이동 2026-09-08] "준비일의 10% 막 이런식으로 로직을 노출하지
 * 말라고" — calculateQuote·calculateMidHallQuote가 만드는 라벨에는 할인율·할증률(%)
 * 계산 근거가 그대로 박혀 있다. 신청자가 보는 화면(실시간 요약 패널·예상 대관료
 * STEP·마이페이지·인쇄용 신청서 — 전부 신청자 본인이 보는 화면이다)에서는 "얼마인지"만
 * 보여주면 되므로, %가 들어간 계산 근거 문구를 지우고 사실(일수 등)만 남긴다.
 * 운영자 화면(신청서 상세 등)은 이 함수를 쓰지 않고 item.label 원문을 그대로 쓴다.
 */
export function applicantLineLabel(item: LineItem): string {
  switch (item.addonId) {
    case "package_discount":
      return "대관료 할인";
    case "extra_days":
      return `추가 일수 (준비일 ${item.billable}일)`;
    case "performance_day_adjustment":
      return item.label.replace(/,\s*공연일 단가 \d+%\s*할인/, "");
    case "second_show_surcharge":
      return item.label.replace(/\s*×\s*\d+%/, "");
    case "midhall_show_weekday-2":
    case "midhall_show_weekend-2":
      return item.label.replace(/,\s*\d+%\s*할증\s*포함/, "");
    default:
      return item.label;
  }
}

/**
 * [신규 2026-09-07] "예상 대관료"(QuoteLineItemsReport, 왼쪽 표 전용 — 오른쪽 실시간
 * 플로팅 박스는 그대로 applicantLineLabel을 쓴다) 라벨. "할증은 말고, 추가일에 대한
 * 할인율도 넣어줘" — applicantLineLabel과 반대로 추가일 계열(준비일·공연일 추가)의
 * 할인율(%)은 그대로 보여주고, 할증(2회 공연·중형 주말/평일 2회) %만 감춘다.
 */
export function estimateLineLabel(item: LineItem): string {
  switch (item.addonId) {
    case "package_discount":
      return "대관료 할인";
    case "second_show_surcharge":
      return item.label.replace(/\s*×\s*\d+%/, "");
    case "midhall_show_weekday-2":
    case "midhall_show_weekend-2":
      return item.label.replace(/,\s*\d+%\s*할증\s*포함/, "");
    default:
      return item.label;
  }
}
