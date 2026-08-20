import { describe, expect, it } from "vitest";
import { calculateQuote } from "./calculateQuote";
import { resolveSelectedDates } from "./dateRange";
import { extraDayPrice, findAddon, findPackage, includedQuantity, packagePrice } from "./rateTableUtils";
import { buildSeedRateTable } from "./seed";
import type { QuoteSelection } from "./types";

const RATE_TABLE = buildSeedRateTable();

function baseSelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
  return {
    venueId: "arena",
    packageId: 2,
    week: { year: 2027, month: 8, weekOfMonth: 1 },
    excludedDays: [],
    extraDays: 0,
    dayTags: {},
    expectedAudience: 8000,
    expectedRevenue: 0,
    addons: [],
    performanceInfo: {
      eventName: "",
      artist: "",
      organizer: "",
      eventScale: "",
      eventTypes: [],
      stageTypes: [],
      seatingTypes: [],
      retractableSeatUse: null,
    },
    ...overrides,
  };
}

describe("calculateQuote — 명세서 7장 검증 케이스", () => {
  const pkg2 = findPackage(RATE_TABLE, 2)!;

  it("케이스 A: 기본만 — 패키지 정찰가 하나뿐", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const expectedSubtotal = packagePrice(RATE_TABLE, pkg2);
    expect(quote.subtotal).toBe(expectedSubtotal);
    expect(quote.vat).toBe(Math.round(expectedSubtotal * 0.1));
    expect(quote.total).toBe(expectedSubtotal + quote.vat);
  });

  it("케이스 B: 추가 항목은 첫 수량부터 전량 과금된다 (요금 시트에 수량 기준 포함분이 없다)", () => {
    const followSpot = findAddon(RATE_TABLE, "follow_spot")!;
    const intercom = findAddon(RATE_TABLE, "intercom_wireless")!;

    expect(includedQuantity(pkg2, "follow_spot")).toBe(0);

    const quote = calculateQuote(
      baseSelection({
        addons: [
          { addonId: "follow_spot", requestedQuantity: 5 },
          { addonId: "intercom_wireless", requestedQuantity: 10 },
        ],
      }),
      RATE_TABLE,
    );

    const followSpotLine = quote.lineItems.find((i) => i.addonId === "follow_spot")!;
    const intercomLine = quote.lineItems.find((i) => i.addonId === "intercom_wireless")!;

    expect(followSpotLine.billable).toBe(5);
    expect(followSpotLine.amount).toBe(5 * followSpot.unitPrice);
    expect(intercomLine.billable).toBe(10);
    expect(intercomLine.amount).toBe(10 * intercom.unitPrice);

    const expectedSubtotal =
      packagePrice(RATE_TABLE, pkg2) + 5 * followSpot.unitPrice + 10 * intercom.unitPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("케이스 C: 추가 일수 — 일요일 이후 2일 연장 시 일 단가 × 2일 과금", () => {
    const quote = calculateQuote(baseSelection({ extraDays: 2 }), RATE_TABLE);
    const extraDaysLine = quote.lineItems.find((i) => i.addonId === "extra_days")!;
    const dayPrice = extraDayPrice(RATE_TABLE, pkg2);

    expect(extraDaysLine.requested).toBe(2);
    expect(extraDaysLine.billable).toBe(2);
    expect(extraDaysLine.amount).toBe(2 * dayPrice);

    const expectedSubtotal = packagePrice(RATE_TABLE, pkg2) + 2 * dayPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("제외 요일 할인: 화~일 중 1일 제외 시 요금표 비율만큼 정액 할인된다", () => {
    const quote = calculateQuote(baseSelection({ excludedDays: ["FRI"] }), RATE_TABLE);
    const discountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount")!;
    const perDayDiscount = Math.round(pkg2.baseFeePerWeek * RATE_TABLE.dayExclusionDiscountRatio);

    expect(discountLine.billable).toBe(1);
    expect(discountLine.amount).toBe(-perDayDiscount);

    const expectedSubtotal = packagePrice(RATE_TABLE, pkg2) - perDayDiscount;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("제외 요일 할인 + 추가 일수는 함께 적용된다", () => {
    const quote = calculateQuote(
      baseSelection({ extraDays: 1, excludedDays: ["FRI", "SAT"] }),
      RATE_TABLE,
    );
    const discountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount")!;
    const extraDaysLine = quote.lineItems.find((i) => i.addonId === "extra_days")!;
    expect(discountLine.billable).toBe(2);
    expect(extraDaysLine.billable).toBe(1);
  });

  it("케이스 D: 패키지 가격은 정찰 총액이며 포함 항목 단가가 더해지지 않는다", () => {
    // 요금 시트의 패키지 대관료는 그 자체로 총액이다.
    // 서술형 RATE INCLUDES 는 금액을 갖지 않으므로 패키지 가격에 더해지지 않는다.
    for (const pkg of RATE_TABLE.packages) {
      expect(packagePrice(RATE_TABLE, pkg)).toBe(pkg.baseFeePerWeek);
      expect(pkg.rateIncludes.length).toBeGreaterThan(0);
    }
  });

  it("센터 리프트는 실물 1대이므로 추가 상한이 1이다", () => {
    const centerLift = findAddon(RATE_TABLE, "center_lift")!;
    expect(centerLift.availability.maxAddQuantity).toBe(1);
    for (const pkg of RATE_TABLE.packages) {
      expect(includedQuantity(pkg, "center_lift")).toBe(0);
    }
  });

  it("아레나 패키지 대관료는 요금 시트 값과 같다", () => {
    expect(RATE_TABLE.packages.map((p) => p.baseFeePerWeek)).toEqual([
      518_000_000, 548_000_000, 613_000_000, 660_000_000,
    ]);
    expect(RATE_TABLE.packages.at(-1)!.audienceTier.max).toBe(22_000);
  });

  it("송출 수수료는 매출의 3% 다", () => {
    expect(findAddon(RATE_TABLE, "online_streaming_fee")!.unitPrice).toBe(3);
  });

  it("유틸리티(METERED, SETTLEMENT) 항목은 예상견적에서 제외된다", () => {
    const quote = calculateQuote(
      baseSelection({ addons: [{ addonId: "util_electricity", requestedQuantity: 1 }] }),
      RATE_TABLE,
    );
    expect(quote.lineItems.find((i) => i.addonId === "util_electricity")).toBeUndefined();
  });

  it("REVENUE_PERCENT(온라인 송출 수수료)는 예상매출 × 요율로 계산된다", () => {
    const fee = findAddon(RATE_TABLE, "online_streaming_fee")!;
    const quote = calculateQuote(
      baseSelection({
        expectedRevenue: 100_000_000,
        addons: [{ addonId: "online_streaming_fee", requestedQuantity: 1 }],
      }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "online_streaming_fee")!;
    expect(line.amount).toBe(Math.round((100_000_000 * fee.unitPrice) / 100));
  });

  it("준비일/공연일 기본값(패키지 dayBreakdown) 그대로면 조정 항목이 생기지 않는다", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    expect(quote.lineItems.find((i) => i.addonId === "performance_day_adjustment")).toBeUndefined();
  });

  it("공연일을 기본값보다 늘리면 초과분만큼 할증된다", () => {
    const dates = resolveSelectedDates(baseSelection());
    const prepDate = dates[0]; // 기본값상 준비일(맨 앞 날짜)을 공연일로 재지정
    const quote = calculateQuote(
      baseSelection({ dayTags: { [prepDate]: "PERFORMANCE" } }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "performance_day_adjustment")!;
    const unitPrice = extraDayPrice(RATE_TABLE, pkg2);
    expect(line.requested).toBe(pkg2.defaultPerformanceDays + 1);
    expect(line.amount).toBe(unitPrice);
  });

  it("공연일을 기본값보다 줄이면 그만큼 차감된다", () => {
    const dates = resolveSelectedDates(baseSelection());
    const performanceDate = dates[dates.length - 1]; // 기본값상 공연일(맨 뒤 날짜)을 준비일로 재지정
    const quote = calculateQuote(
      baseSelection({ dayTags: { [performanceDate]: "PREP" } }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "performance_day_adjustment")!;
    const unitPrice = extraDayPrice(RATE_TABLE, pkg2);
    expect(line.requested).toBe(pkg2.defaultPerformanceDays - 1);
    expect(line.amount).toBe(-unitPrice);
  });

  it("패키지 미선택 시 라인아이템 없이 0원", () => {
    const quote = calculateQuote(baseSelection({ packageId: null }), RATE_TABLE);
    expect(quote.lineItems).toHaveLength(0);
    expect(quote.total).toBe(0);
  });
});
