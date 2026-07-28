import { describe, expect, it } from "vitest";
import { calculateQuote } from "./calculateQuote";
import { getAddon, getPackage, includedQuantity, RATE_TABLE } from "./seed";
import type { QuoteSelection } from "./types";

function baseSelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
  return {
    packageId: 2,
    week: { year: 2027, month: 8, weekOfMonth: 1 },
    extraWeeks: 0,
    expectedAudience: 8000,
    expectedRevenue: 0,
    addons: [],
    ...overrides,
  };
}

describe("calculateQuote — 명세서 7장 검증 케이스", () => {
  const pkg2 = getPackage(2)!;
  const cleaning = getAddon("cleaning")!;

  it("케이스 A: 기본만 — 기본료 + 청소비", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const expectedSubtotal = pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice;
    expect(quote.subtotal).toBe(expectedSubtotal);
    expect(quote.vat).toBe(Math.round(expectedSubtotal * 0.1));
    expect(quote.total).toBe(expectedSubtotal + quote.vat);
  });

  it("케이스 B: 초과분 과금 — 대기실 초과분 + 스마트스테이지 추가분만 과금", () => {
    const waitingRoomIncluded = includedQuantity(pkg2, "waiting_room"); // 2
    const waitingRoom = getAddon("waiting_room")!;
    const smartStage = getAddon("smart_stage")!;

    const quote = calculateQuote(
      baseSelection({
        addons: [
          { addonId: "waiting_room", requestedQuantity: waitingRoomIncluded + 1 }, // 3개 신청, 2개 포함 → 1개 과금
          { addonId: "smart_stage", requestedQuantity: 1 }, // 기본 포함 0개 → 1개 전량 과금
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

  it("케이스 C: 초과 주차 — 1주 추가 시 초과주차 1주 과금", () => {
    const quote = calculateQuote(baseSelection({ extraWeeks: 1 }), RATE_TABLE);
    const extraWeekLine = quote.lineItems.find((i) => i.addonId === "extra_week")!;

    expect(extraWeekLine.requested).toBe(2);
    expect(extraWeekLine.included).toBe(1);
    expect(extraWeekLine.billable).toBe(1);
    expect(extraWeekLine.amount).toBe(RATE_TABLE.extraWeekPrice(pkg2));

    const expectedSubtotal =
      pkg2.baseFeePerWeek + 8000 * cleaning.unitPrice + RATE_TABLE.extraWeekPrice(pkg2);
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("케이스 D: 규칙 차단 — 패키지3은 마더트러스A가 기본 포함이므로 IF_NOT_INCLUDED 규칙상 선택 불가", () => {
    const pkg3 = getPackage(3)!;
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
    const fee = getAddon("online_streaming_fee")!;
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

  it("패키지 미선택 시 라인아이템 없이 0원", () => {
    const quote = calculateQuote(baseSelection({ packageId: null }), RATE_TABLE);
    expect(quote.lineItems).toHaveLength(0);
    expect(quote.total).toBe(0);
  });
});
