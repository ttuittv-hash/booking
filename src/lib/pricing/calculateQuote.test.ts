import { describe, expect, it } from "vitest";
import { calculateQuote } from "./calculateQuote";
import { resolveSelectedDates } from "./dateRange";
import { findAddon, findPackage, includedQuantity, packagePrice } from "./rateTableUtils";
import { buildSeedRateTable } from "./seed";
import type { QuoteSelection } from "./types";

const RATE_TABLE = buildSeedRateTable();

function baseSelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
  return {
    venueId: "arena",
    bookingMode: "SINGLE",
    packageId: 2,
    week: { year: 2027, month: 8, weekOfMonth: 1 },
    excludedDays: [],
    extraDays: 0,
    dayTags: {},
    dayShowCounts: {},
    expectedAudience: 8000,
    secondaryAudience: 1500,
    midHallDays: {},
    midHallExtraSetupHours: 0,
    midHallExtraLoadOutHours: 0,
    expectedRevenue: 0,
    addons: [],
    performanceInfo: {
      applicantCompanyName: "",
      applicantBusinessRegistrationNumber: "",
      applicantContactName: "",
      applicantContactPhone: "",
      operationsResponsible: { name: "", title: "", phone: "" },
      safetyResponsible: { name: "", title: "", phone: "" },
      pastPerformances: [],
      eventName: "",
      artist: "",
      organizer: "",
      eventScale: "",
      eventTypes: [],
      ageRating: null,
      ageLimitDetail: "",
      stageTypes: [],
      seatingTypes: [],
      retractableSeatUse: null,
      teardownCompletionTime: "",
      ticketOpenExpectedDate: "",
      expectedPaidSalesRate: 0,
      ancillaryBusinessPlans: [],
      castContractStatus: null,
      foreignArtistNotes: "",
      sensitiveInfoMaskingAcknowledged: false,
      safetyPledgeSigned: false,
    },
    ...overrides,
  };
}

// [기능정의서 2-48] 아레나 유틸리티(필수) 자동 산입 합계 — HIDDEN, ESTIMATE, UTILITY 카테고리 항목의 합.
function arenaHiddenUtilityTotal(): number {
  return RATE_TABLE.addons
    .filter((a) => a.category === "UTILITY" && a.visibility === "HIDDEN" && a.billingPhase === "ESTIMATE")
    .reduce((sum, a) => sum + a.unitPrice, 0);
}

describe("calculateQuote — 명세서 7장 검증 케이스", () => {
  const pkg2 = findPackage(RATE_TABLE, 2)!;
  const cleaning = findAddon(RATE_TABLE, "cleaning")!;
  const utilityTotal = arenaHiddenUtilityTotal();

  it("케이스 A: 기본만 — 기본료 + 청소비 + 유틸리티(자동산입)", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const expectedSubtotal = packagePrice(RATE_TABLE, pkg2) + 8000 * cleaning.unitPrice + utilityTotal;
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
      packagePrice(RATE_TABLE, pkg2) +
      8000 * cleaning.unitPrice +
      waitingRoom.unitPrice +
      smartStage.unitPrice +
      utilityTotal;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("케이스 C: 추가 일수 — 일요일 이후 2일 연장 시 셋업 추가 단가 × 2일 과금 (2-38 확정)", () => {
    const quote = calculateQuote(baseSelection({ extraDays: 2 }), RATE_TABLE);
    const extraDaysLine = quote.lineItems.find((i) => i.addonId === "extra_days")!;
    const dayPrice = pkg2.setupExtraDayFee;

    expect(extraDaysLine.requested).toBe(2);
    expect(extraDaysLine.billable).toBe(2);
    expect(extraDaysLine.amount).toBe(2 * dayPrice);
    expect(dayPrice).toBe(46_790_000);

    const expectedSubtotal =
      packagePrice(RATE_TABLE, pkg2) + 8000 * cleaning.unitPrice + 2 * dayPrice + utilityTotal;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("제외 요일 할인: 준비일 요일을 제외하면 셋업 추가 단가로 정액 차감된다 (2-37/2-38 확정 대칭 적용)", () => {
    // FRI는 패키지 기본값상 준비일(defaultPerformanceDays=2 → SAT·SUN만 공연일)
    const quote = calculateQuote(baseSelection({ excludedDays: ["FRI"] }), RATE_TABLE);
    const discountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount_prep")!;

    expect(discountLine.billable).toBe(1);
    expect(discountLine.amount).toBe(-pkg2.setupExtraDayFee);
    expect(quote.lineItems.find((i) => i.addonId === "day_exclusion_discount_performance")).toBeUndefined();

    const expectedSubtotal =
      packagePrice(RATE_TABLE, pkg2) + 8000 * cleaning.unitPrice - pkg2.setupExtraDayFee + utilityTotal;
    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("제외 요일 할인: 공연일 요일을 제외하면 공연 추가 단가로 정액 차감된다", () => {
    // SAT는 패키지 기본값상 공연일
    const quote = calculateQuote(baseSelection({ excludedDays: ["SAT"] }), RATE_TABLE);
    const discountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount_performance")!;

    expect(discountLine.billable).toBe(1);
    expect(discountLine.amount).toBe(-pkg2.performanceExtraDayFee);
  });

  it("패키지 가격은 요금표 고정값 그대로다 — 포함 항목 단가를 더해 역산하지 않는다 (2-20/2-42)", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const baseFeeLine = quote.lineItems.find((i) => i.addonId === "BASE_FEE")!;
    expect(baseFeeLine.amount).toBe(pkg2.baseFeePerWeek);
    expect(baseFeeLine.visibility).toBe("VISIBLE");
  });

  it("유틸리티(필수)는 신청자 화면에서 HIDDEN 등급으로, 견적에는 자동 산입된다 (2-48)", () => {
    const quote = calculateQuote(baseSelection(), RATE_TABLE);
    const utilityLine = quote.lineItems.find((i) => i.addonId === "utility_bundle")!;
    expect(utilityLine).toBeDefined();
    expect(utilityLine.visibility).toBe("HIDDEN");
    expect(utilityLine.amount).toBe(utilityTotal);
    expect(utilityTotal).toBe(61_000_000);
  });

  it("선택 부대시설(옥외광고 등)은 VISIBLE 등급으로 항목·단가·금액이 그대로 노출된다 (2-71)", () => {
    const outdoor = findAddon(RATE_TABLE, "outdoor_xbanner")!;
    const quote = calculateQuote(
      baseSelection({ addons: [{ addonId: "outdoor_xbanner", requestedQuantity: 2 }] }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "outdoor_xbanner")!;
    expect(line.visibility).toBe("VISIBLE");
    expect(line.amount).toBe(2 * outdoor.unitPrice);
  });

  it("제외 요일 할인(준비일+공연일 혼합) + 추가 일수는 함께 적용된다", () => {
    const quote = calculateQuote(
      baseSelection({ extraDays: 1, excludedDays: ["FRI", "SAT"] }),
      RATE_TABLE,
    );
    const prepDiscountLine = quote.lineItems.find((i) => i.addonId === "day_exclusion_discount_prep")!;
    const performanceDiscountLine = quote.lineItems.find(
      (i) => i.addonId === "day_exclusion_discount_performance",
    )!;
    const extraDaysLine = quote.lineItems.find((i) => i.addonId === "extra_days")!;
    expect(prepDiscountLine.billable).toBe(1);
    expect(performanceDiscountLine.billable).toBe(1);
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
    const unitPrice = pkg2.performanceExtraDayFee;
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
    const unitPrice = pkg2.performanceExtraDayFee;
    expect(line.requested).toBe(pkg2.defaultPerformanceDays - 1);
    expect(line.amount).toBe(-unitPrice);
  });

  it("패키지 미선택 시 라인아이템 없이 0원", () => {
    const quote = calculateQuote(baseSelection({ packageId: null }), RATE_TABLE);
    expect(quote.lineItems).toHaveLength(0);
    expect(quote.total).toBe(0);
  });
});

describe("calculateQuote — 중형공연장(DAILY) 요금 엔진", () => {
  const cfg = RATE_TABLE.midHall;

  function midHallOnlySelection(overrides: Partial<QuoteSelection> = {}): QuoteSelection {
    return baseSelection({
      venueId: "medium-hall",
      packageId: null,
      secondaryAudience: 3000,
      ...overrides,
    });
  }

  it("셋업 + 평일 공연 1회 — 기본 단가 그대로 과금된다", () => {
    // 2027-08-03(화)=셋업, 2027-08-04(수)=공연 1회 — 둘 다 평일
    const quote = calculateQuote(
      midHallOnlySelection({
        midHallDays: {
          "2027-08-03": { role: "SETUP", shows: 1 },
          "2027-08-04": { role: "PERFORMANCE", shows: 1 },
        },
      }),
      RATE_TABLE,
    );
    const setupLine = quote.lineItems.find((i) => i.addonId === "midhall_setup")!;
    const showLine = quote.lineItems.find((i) => i.addonId === "midhall_show_weekday-1")!;
    expect(setupLine.amount).toBe(cfg.setupDayFee);
    expect(showLine.amount).toBe(cfg.performanceWeekdayFee);
    expect(quote.blockingIssues).toHaveLength(0);
  });

  it("1일 2회 공연 — 그 날 요금에 할증 비율만큼 할증된다", () => {
    const quote = calculateQuote(
      midHallOnlySelection({
        midHallDays: { "2027-08-04": { role: "PERFORMANCE", shows: 2 } }, // 수요일(평일)
      }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "midhall_show_weekday-2")!;
    expect(line.amount).toBe(Math.round(cfg.performanceWeekdayFee * (1 + cfg.secondShowSurchargeRatio)));
  });

  it("주말 공연은 주말 단가로 과금된다", () => {
    const quote = calculateQuote(
      midHallOnlySelection({
        midHallDays: { "2027-08-07": { role: "PERFORMANCE", shows: 1 } }, // 토요일
      }),
      RATE_TABLE,
    );
    const line = quote.lineItems.find((i) => i.addonId === "midhall_show_weekend-1")!;
    expect(line.amount).toBe(cfg.performanceWeekendFee);
  });

  it("1일 3회 이상은 자동 계산하지 않고 blockingIssues로 제출을 막는다", () => {
    const quote = calculateQuote(
      midHallOnlySelection({
        midHallDays: { "2027-08-04": { role: "PERFORMANCE", shows: 3 } },
      }),
      RATE_TABLE,
    );
    const reviewLine = quote.lineItems.find((i) => i.addonId === "midhall_show_review_2027-08-04")!;
    expect(reviewLine.amount).toBe(0);
    expect(quote.blockingIssues.length).toBe(1);
    expect(quote.blockingIssues[0]).toContain("3회");
  });

  it("셋업 연장 · 철수 Load-Out 시간 과금", () => {
    const quote = calculateQuote(
      midHallOnlySelection({
        midHallDays: { "2027-08-03": { role: "SETUP", shows: 1 } },
        midHallExtraSetupHours: 2,
        midHallExtraLoadOutHours: 3,
      }),
      RATE_TABLE,
    );
    const setupExtra = quote.lineItems.find((i) => i.addonId === "midhall_extra_setup_hours")!;
    const loadOutExtra = quote.lineItems.find((i) => i.addonId === "midhall_extra_loadout_hours")!;
    expect(setupExtra.amount).toBe(2 * cfg.extraHourFee);
    expect(loadOutExtra.amount).toBe(3 * cfg.extraHourFee);
  });

  it("청소비 — 1회당 예상 관객 수 × 총 공연 횟수", () => {
    const quote = calculateQuote(
      midHallOnlySelection({
        secondaryAudience: 2000,
        midHallDays: {
          "2027-08-04": { role: "PERFORMANCE", shows: 2 },
          "2027-08-07": { role: "PERFORMANCE", shows: 1 },
        },
      }),
      RATE_TABLE,
    );
    const cleaningLine = quote.lineItems.find((i) => i.addonId === "midhall_cleaning")!;
    expect(cleaningLine.requested).toBe(2000 * 3); // 회차 합계 3
    expect(cleaningLine.amount).toBe(2000 * 3 * cfg.cleaningUnitPrice);
  });

  it("중형 일정이 없으면 중형 라인아이템이 생기지 않는다", () => {
    const quote = calculateQuote(midHallOnlySelection({ midHallDays: {} }), RATE_TABLE);
    expect(quote.lineItems).toHaveLength(0);
    expect(quote.total).toBe(0);
  });

  it("동시 대관(SIMULTANEOUS) — 아레나 소계 + 중형 소계가 할인 없이 단순 합산된다", () => {
    const midHallDays = { "2027-08-04": { role: "PERFORMANCE" as const, shows: 1 } };
    const arenaOnly = calculateQuote(baseSelection({ secondaryAudience: 3000 }), RATE_TABLE);
    const midHallOnly = calculateQuote(midHallOnlySelection({ midHallDays }), RATE_TABLE);
    const combined = calculateQuote(
      baseSelection({ bookingMode: "SIMULTANEOUS", secondaryAudience: 3000, midHallDays }),
      RATE_TABLE,
    );
    expect(combined.subtotal).toBe(arenaOnly.subtotal + midHallOnly.subtotal);
    expect(combined.lineItems.some((i) => i.addonId === "BASE_FEE")).toBe(true);
    expect(combined.lineItems.some((i) => i.addonId === "midhall_show_weekday-1")).toBe(true);
  });
});
