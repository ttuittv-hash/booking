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
  // [수정 2026-09-08] "공연 2회 할증은 대관료에 포함되어야함" — second_show_surcharge
  // (아레나 1일 2회 공연 할증)가 이 목록에 없어 "옵션"으로 잘못 분류되고 있었다.
  // 중형의 같은 개념(midhall_show_*-2)은 addonId 접두사로 이미 core 취급되고 있어
  // 여기 맞춘다.
  "second_show_surcharge",
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
  "second_show_surcharge",
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

// [삭제 2026-09-08] "너무 다 감추니까 뭐가뭔지 안보이고.. 할인율 보여줘" — SummaryPanel
// (오른쪽 실시간 패널) 전용으로 할인율(%)까지 지우던 applicantLineLabel을 없앴다.
// 이제 SummaryPanel도 estimateLineLabel(할증 %만 감추고 할인 %는 보여준다)을 그대로
// 쓴다 — 왼쪽 예상 대관료·오른쪽 실시간 패널의 라벨 규칙이 갈릴 이유가 없어졌다.

const DISCOUNT_PCT_PATTERN = /(\d+)%\s*할인/;

// "추가일(공연일/준비일/휴무일 N일, 할인 M%)" 통일 포맷 — 할인율이 없으면(원문에 %가
// 없으면) 뒷부분을 생략한다.
function unifiedExtraDayLabel(kind: string, item: LineItem): string {
  const match = item.label.match(DISCOUNT_PCT_PATTERN);
  return match ? `추가일(${kind} ${item.billable}일, 할인 ${match[1]}%)` : `추가일(${kind} ${item.billable}일)`;
}

/**
 * [신규 2026-09-07] "예상 대관료"(QuoteLineItemsReport, 왼쪽 표 전용 — 오른쪽 실시간
 * 플로팅 박스는 그대로 applicantLineLabel을 쓴다) 라벨. "할증은 말고, 추가일에 대한
 * 할인율도 넣어줘" — applicantLineLabel과 반대로 추가일 계열(준비일·공연일 추가)의
 * 할인율(%)은 그대로 보여주고, 할증(2회 공연·중형 주말/평일 2회) %만 감춘다.
 *
 * [수정 2026-09-08] "추가일수는 두가지로 나눠져.. 추가일(공연일 N일), 추가일(준비일
 * N일), 추가일(휴무일 N일)" — 서로 다른 문구("추가 일수 (준비일...)", "추가일수
 * 휴무일...", "공연 일수 조정 (...)")로 흩어져 있던 세 항목을 같은 틀로 통일한다.
 * 공연 일수 조정은 기본보다 "늘어난" 경우만 이 틀("추가일...")을 쓴다 — "줄어든" 경우는
 * "추가"가 아니라 차감이므로(2026-09-08부터 할인율은 양쪽 다 붙지만 문구는 다르다)
 * 원문("공연 일수 조정 (기본 N일 대비 -N일, 공연일 단가 M% 할인)")을 그대로 둔다 —
 * splitParenDetail이 그 괄호 안(할인율 포함)을 세부내역 칸으로 그대로 옮긴다.
 */
export function estimateLineLabel(item: LineItem): string {
  switch (item.addonId) {
    // [수정 2026-09-08] "대관료 할인 항목의 경우 세부 내역에 퍼센테이지를 넣어야지" —
    // applicantLineLabel과 달리 여기서는 % 를 지우지 않는다. item.label 원문
    // "대관료 할인 (N%)" 그대로 두면 QuoteLineItemsReport의 splitParenDetail이
    // 괄호 안 "N%"를 세부내역 칸으로 옮긴다.
    case "extra_days":
      return unifiedExtraDayLabel("준비일", item);
    // [수정 2026-09-08] "휴무일도 준비일 10% 할인금액에서 또 50% 할인값이 들어가야함" —
    // 할인율이 두 개(준비일 10% → 휴무일 50%)로 겹치면서 unifiedExtraDayLabel의
    // "할인 N%" 한 자리로는 둘 다 못 담는다. 원문("...준비일 단가 10% 할인 후
    // 휴무일 50% 추가 할인)")을 그대로 둔다 — splitParenDetail이 그 괄호 전체를
    // 세부내역 칸으로 옮긴다.
    case "extra_days_rest":
      return item.label;
    case "performance_day_adjustment":
      return /대비 \+/.test(item.label) ? unifiedExtraDayLabel("공연일", item) : item.label;
    // [삭제 2026-09-08] "할증 앞에 퍼센테이지 노출 필요, 아레나는 50%, 중형은 25%" —
    // second_show_surcharge·midhall_show_*-2 라벨에서 할증률(%)을 지우던 case를
    // 없앤다. item.label 원문에 이미 "(N일 × 50%)"/"(1일 2회, 25% 할증 포함)"이
    // 들어 있으니 default로 그대로 보여준다.
    default:
      return item.label;
  }
}
