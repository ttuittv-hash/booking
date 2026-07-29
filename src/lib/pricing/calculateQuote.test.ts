import { describe, expect, it } from "vitest";
import { calculateQuote } from "./calculateQuote";
import { resolveSelectedDates } from "./dateRange";
import { extraDayPrice, findAddon, findPackage, includedQuantity } from "./rateTableUtils";
import { buildSeedRateTable } from "./seed";
import type { QuoteSelection } from "./types";

const RATE_TABLE = buildSeedRateTable();

function baseSelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
  return {
    packageId: 2,
    week: { year: 2027, month: 8, weekOfMonth: 1 },
    excludedDays: [],
    extraDays: 0,
    dayTags: {},
    expectedAudience: 8000,
    expectedRevenue: 0,
    addons: [],
    ...overrides,
  };
}

describe("calculateQuote — 명세서 7장 검증 케이스", () => {
  const pkg2 = findPackage(RATE_TABLE, 2)!;
  const cleaning = findAddon(RATE_TABLE, "cleaning")!;

  it("케이스 A: 기본만 — 기본료 + 청소비", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const expectedSubtotal = pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
    expect(quote.vat).toBe(Math.round(expectedSubtotal * 0.1));
    expect(quote.total).toBe(expectedSubtotal + quote.vat);
  });

  it("케이스 B: 초과분 과금 — 대기실 초과분 + 스마트스테이지 추가분만 과금", () => {
    const waitingRoomIncluded = includedQuantity(pkg2, "waiting_room");
    const smartStageIncluded = includedQuantity(pkg2, "smart_stage");
    const waitingRoom = findAddon(RATE_TABLE, "waiting_room")!;
    const smartStage = findAddon(RATE_TABLE, "smart_stage")!;

    const quote = calculateQuote(
      baseSelection({
        addons: [
          { addonId: "waiting_room", requestedQuantity: waitingRoomIncluded + 1 }, // 포함분+1개 신청 → 1개만 과금
          { addonId: "smart_stage", requestedQuantity: smartStageIncluded + 1 }, // 포함분+1개 신청 → 1개만 과금
        ],
      }),
      RATE_TABLE,
    );

    const waitingRoomLine = quote.lineItems.find((i) => i.addonId === "waiting_room")!;
    const smartStageLine = quote.lineItems.find((i) => i.addonId === "smart_stage")!;

    expect(waitingRoomLine.billable).toBe(1);
    expect(waitingRoomLine.amount).toBe(1 * waitingRoom.unitPrice);
    expect(smartStageLine.billable).toBe(1);
    expect(smartStageLine.amount).toBe(1 * smartStage.unitPrice);

    const expectedSubtotal =
      pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice + waitingRoom.unitPrice + smartStage.unitPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("케이스 C: 추가 일수 — 일요일 이후 2일 연장 시 일 단가 × 2일 과금", () => {
    const quote = calculateQuote(baseSelection({ extraDays: 2 }), RATE_TABLE);
    const extraDaysLine = quote.lineItems.find((i) => i.addonId === "extra_days")!;
    const dayPrice = extraDayPrice(RATE_TABLE, pkg2);

    expect(extraDaysLine.requested).toBe(2);
    expect(extraDaysLine.billable).toBe(2);
    expect(extraDaysLine.amount).toBe(2 * dayPrice);

    const expectedSubtotal = pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice + 2 * dayPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("제외 요일 할인: 화~일 중 1일 제외 시 요금표 비율만큼 정액 할인된다", () => {
    const quote = calculateQuote(baseSelection({ excludedDays: ["FRI"] }), RATE_TABLE);
    const discountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount")!;
    const perDayDiscount = Math.round(pkg2.baseFeePerWeek * RATE_TABLE.dayExclusionDiscountRatio);

    expect(discountLine.billable).toBe(1);
    expect(discountLine.amount).toBe(-perDayDiscount);

    const expectedSubtotal = pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice - perDayDiscount;
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

  it("케이스 D: 규칙 차단 — 패키지3은 마더트러스A가 기본 포함이므로 IF_NOT_INCLUDED 규칙상 선택 불가", () => {
    const pkg3 = findPackage(RATE_TABLE, 3)!;
    const included = includedQuantity(pkg3, "mother_truss_a");
    expect(included).toBeGreaterThan(0);

    // 이 항목을 강제로 addons에 담아도(= UI에서 노출되지 않아야 정상), 계산 엔진 규칙상
    // "포함 수량" 위에 얹은 신청량만 과금되어야 한다 — 전량 재과금되지 않음을 검증.
    const quote = calculateQuote(
      baseSelection({
        packageId: 3,
        addons: [{ addonId: "mother_truss_a", requestedQuantity: included }],
      }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "mother_truss_a")!;
    expect(line.billable).toBe(0);
    expect(line.amount).toBe(0);
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
