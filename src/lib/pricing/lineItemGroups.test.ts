import { describe, expect, it } from "vitest";
import { contractSectionAmounts } from "./lineItemGroups";
import type { LineItem } from "./types";

// [신규 2026-09-18] "계약금액 / 예상금액(추가옵션) / 총 예상금액 구분이 신청목록·
// 신청내역보기 금액계산서에는 반영이 안 되어 있다"(nora·niki) 로 운영자 화면 세 곳이
// 이 함수를 쓰게 됐다. 묶음이 어긋나거나 두 묶음의 합이 총액과 안 맞으면 운영자가
// 심사·정산에서 잘못된 금액을 읽으므로, 그 두 가지를 여기서 못 박는다.
function line(addonId: string, amount: number): LineItem {
  return {
    addonId,
    label: addonId,
    pricingType: "PER_DAY",
    requested: 1,
    included: 0,
    billable: 1,
    unitPrice: amount,
    amount,
    phase: "ESTIMATE",
    visibility: "VISIBLE",
  };
}

/** lineItems 에서 소계·부가세(10%)·합계를 만들어 저장된 신청서 모양으로 맞춘다. */
function quoteOf(lineItems: LineItem[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const vat = Math.round(subtotal * 0.1);
  return { lineItems, subtotal, vat, total: subtotal + vat };
}

describe("contractSectionAmounts — 운영자 화면의 계약금액 / 추후 정산 예정 금액 구분", () => {
  it("대관료 계열은 CONTRACT, 신청자가 고른 옵션은 ADDITIONAL 로 갈린다", () => {
    const quote = quoteOf([
      line("BASE_FEE", 100_000_000),
      line("package_discount", -10_000_000),
      line("extra_days", 5_000_000),
      line("parking_pass", 600_000),
      line("commercial_booth", 6_250_000),
    ]);

    const { sections } = contractSectionAmounts(quote);
    expect(sections.map((s) => s.section)).toEqual(["CONTRACT", "ADDITIONAL"]);
    expect(sections[0].items.map((i) => i.addonId)).toEqual([
      "BASE_FEE",
      "package_discount",
      "extra_days",
    ]);
    expect(sections[1].items.map((i) => i.addonId)).toEqual(["parking_pass", "commercial_booth"]);
    expect(sections[0].subtotal).toBe(95_000_000);
    expect(sections[1].subtotal).toBe(6_850_000);
  });

  it("2026-00042 실제 금액을 그대로 재현한다 — 계약 542,223,000 · 정산 7,535,000 · 총 549,758,000", () => {
    // 신청자가 마지막에 본 화면(위저드 최종 제출)의 숫자다. 운영자 화면이 이 숫자와
    // 갈리면 "백오피스 금액이 비정상"이라는 신고가 다시 들어온다.
    const quote = quoteOf([
      line("BASE_FEE", 547_700_000),
      line("package_discount", -54_770_000),
      line("outdoor_ad", 0),
      line("parking_pass", 600_000),
      line("commercial_booth", 6_250_000),
    ]);

    const { sections, vatPct } = contractSectionAmounts(quote);
    const [contract, additional] = sections;

    expect(vatPct).toBe(10);
    expect(contract.subtotal).toBe(492_930_000);
    expect(contract.vat).toBe(49_293_000);
    expect(contract.total).toBe(542_223_000);
    expect(additional.subtotal).toBe(6_850_000);
    expect(additional.vat).toBe(685_000);
    expect(additional.total).toBe(7_535_000);
    expect(quote.total).toBe(549_758_000);
  });

  it("두 묶음의 합은 언제나 저장된 총액과 정확히 같다 — 화면에서 덧셈이 떨어져야 한다", () => {
    // 묶음마다 따로 반올림하면 합이 quote.vat 과 1원 어긋날 수 있는 금액을 고른다.
    const quote = quoteOf([line("BASE_FEE", 1_000_005), line("parking_pass", 5)]);

    const { sections } = contractSectionAmounts(quote);
    const vatSum = sections.reduce((sum, s) => sum + s.vat, 0);
    const totalSum = sections.reduce((sum, s) => sum + s.total, 0);

    expect(sections.reduce((sum, s) => sum + s.subtotal, 0)).toBe(quote.subtotal);
    expect(vatSum).toBe(quote.vat);
    expect(totalSum).toBe(quote.total);
  });

  it("고른 옵션이 없으면 추후 정산 묶음은 0원으로 비어 있다(줄이 사라지지 않는다)", () => {
    const quote = quoteOf([line("BASE_FEE", 100_000_000)]);

    const { sections } = contractSectionAmounts(quote);
    expect(sections).toHaveLength(2);
    expect(sections[1].items).toEqual([]);
    expect(sections[1].subtotal).toBe(0);
    expect(sections[1].vat).toBe(0);
    expect(sections[1].total).toBe(0);
    expect(sections[0].total).toBe(quote.total);
  });

  it("신청서가 0원이어도 나누기를 시도하다 죽지 않는다", () => {
    const { sections, vatPct } = contractSectionAmounts({ lineItems: [], subtotal: 0, vat: 0 });
    expect(vatPct).toBe(10);
    expect(sections.every((s) => s.total === 0)).toBe(true);
  });

  it("감춤 항목(청소비·유틸리티)도 운영자 화면에서는 묶음에 그대로 들어간다", () => {
    // 신청자 화면은 이 항목들을 줄에서 감추지만 운영자는 항상 전체를 본다(기능정의서 2-71).
    const cleaning: LineItem = { ...line("cleaning", 3_000_000), visibility: "HIDDEN" };
    const quote = quoteOf([line("BASE_FEE", 100_000_000), cleaning]);

    const { sections } = contractSectionAmounts(quote);
    expect(sections[0].items.map((i) => i.addonId)).toContain("cleaning");
    expect(sections[0].subtotal).toBe(103_000_000);
  });
});
