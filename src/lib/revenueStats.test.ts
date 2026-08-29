import { describe, expect, it } from "vitest";
import { buildRevenueStats } from "./revenueStats";
import type { Quote } from "./pricing/types";

// reportStats.test.ts 와 같은 방식 — 집계에 쓰는 필드만 채운 최소 Quote 를 만든다.
function quote(overrides: Partial<Quote> & { id: string; createdAt: string }): Quote {
  return {
    total: 0,
    status: "ESTIMATE",
    review: null,
    contract: null,
    settlement: null,
    selection: { bookingMode: "SINGLE", venueId: "arena" },
    ...overrides,
  } as unknown as Quote;
}

/** 집계가 보는 필드(금액·확정일)만 의미가 있고 나머지는 형식을 맞추기 위한 값이다. */
function contract(contractTotal: number, decidedAt: string) {
  return { quoteId: "q", adjustments: [], contractTotal, decidedAt, decidedBy: "admin" };
}
function settlement(finalTotal: number, decidedAt: string) {
  return {
    quoteId: "q",
    onSiteAdditions: [],
    unusedDeductions: [],
    meteredActuals: [],
    finalTotal,
    decidedAt,
    decidedBy: "admin",
  };
}

const NOW = new Date("2026-08-15T00:00:00Z");

describe("buildRevenueStats", () => {
  it("접수·계약·확정 세 단계를 따로 센다", () => {
    const s = buildRevenueStats(
      [
        // 견적만 낸 건 — 접수에만 잡힌다
        quote({ id: "q1", createdAt: "2026-08-01", total: 1000 }),
        // 계약까지 간 건 — 접수 + 계약. 정산 전이라 확정 매출은 아니다
        quote({
          id: "q2",
          createdAt: "2026-07-01",
          total: 2000,
          status: "CONTRACTED",
          contract: contract(2500, "2026-08-05"),
        }),
        // 정산까지 끝난 건 — 접수 + 계약 + 확정
        quote({
          id: "q3",
          createdAt: "2026-06-01",
          total: 3000,
          status: "SETTLED",
          contract: contract(3200, "2026-07-10"),
          settlement: settlement(3400, "2026-08-12"),
        }),
      ],
      new Map(),
      NOW,
    );

    expect(s.submittedCount).toBe(3);
    expect(s.submittedTotal).toBe(6000);

    expect(s.contractedCount).toBe(2);
    expect(s.contractedTotal).toBe(5700); // 2500 + 3200

    // 확정 매출은 정산이 끝난 건만 — 계약금액(3200)이 아니라 정산금액(3400)
    expect(s.settledCount).toBe(1);
    expect(s.settledTotal).toBe(3400);

    // 계약만 되고 정산 전인 건은 따로 센다
    expect(s.pendingSettlementCount).toBe(1);
    expect(s.pendingSettlementTotal).toBe(2500);
  });

  it("부속합의 금액을 계약금액에 더한다", () => {
    const s = buildRevenueStats(
      [
        quote({
          id: "q1",
          createdAt: "2026-08-01",
          total: 1000,
          status: "CONTRACTED",
          contract: contract(1000, "2026-08-02"),
        }),
      ],
      new Map([["q1", 300]]),
      NOW,
    );
    expect(s.contractedTotal).toBe(1300);
    expect(s.addendumTotal).toBe(300);
    // 감액(음수)도 그대로 반영된다.
    const minus = buildRevenueStats(
      [
        quote({
          id: "q1",
          createdAt: "2026-08-01",
          total: 1000,
          status: "CONTRACTED",
          contract: contract(1000, "2026-08-02"),
        }),
      ],
      new Map([["q1", -200]]),
      NOW,
    );
    expect(minus.contractedTotal).toBe(800);
  });

  it("계약금액이 없으면 견적 금액을 쓴다", () => {
    // 계약 상태인데 금액이 0으로 보이면 안 된다.
    const s = buildRevenueStats(
      [quote({ id: "q1", createdAt: "2026-08-01", total: 1500, status: "CONTRACTED" })],
      new Map(),
      NOW,
    );
    expect(s.contractedTotal).toBe(1500);
  });

  it("월별은 단계마다 다른 날짜로 잡는다", () => {
    // 6월 접수 → 7월 계약 → 8월 정산. 한 건이 세 달에 각각 다른 이름으로 나타난다.
    const s = buildRevenueStats(
      [
        quote({
          id: "q1",
          createdAt: "2026-06-20",
          total: 1000,
          status: "SETTLED",
          contract: contract(1100, "2026-07-20"),
          settlement: settlement(1200, "2026-08-20"),
        }),
      ],
      new Map(),
      NOW,
    );
    const june = s.monthly.find((m) => m.key === "2026-06")!;
    const july = s.monthly.find((m) => m.key === "2026-07")!;
    const august = s.monthly.find((m) => m.key === "2026-08")!;
    expect(june.submittedTotal).toBe(1000);
    expect(june.contractedTotal).toBe(0);
    expect(july.contractedTotal).toBe(1100);
    expect(august.settledTotal).toBe(1200);
  });

  it("SETTLED 인데 정산 기록이 없으면 확정 매출로 세지 않는다", () => {
    // 금액을 알 수 없는 건을 확정 매출에 넣으면 숫자가 거짓이 된다.
    const s = buildRevenueStats(
      [
        quote({
          id: "q1",
          createdAt: "2026-08-01",
          total: 1000,
          status: "SETTLED",
          contract: contract(1000, "2026-08-02"),
        }),
      ],
      new Map(),
      NOW,
    );
    expect(s.settledCount).toBe(0);
    expect(s.settledTotal).toBe(0);
    expect(s.pendingSettlementCount).toBe(1);
  });

  it("공간 탭으로 좁힌다", () => {
    const s = buildRevenueStats(
      [
        quote({ id: "q1", createdAt: "2026-08-01", total: 1000 }),
        quote({
          id: "q2",
          createdAt: "2026-08-01",
          total: 2000,
          selection: { bookingMode: "SINGLE", venueId: "medium-hall" },
        } as Partial<Quote> & { id: string; createdAt: string }),
      ],
      new Map(),
      NOW,
      6,
      "medium-hall",
    );
    expect(s.submittedCount).toBe(1);
    expect(s.submittedTotal).toBe(2000);
  });
});
