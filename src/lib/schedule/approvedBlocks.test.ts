import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/pricing/types";
import { APPROVED_BLOCK_REASON, approvedQuoteBlocks, quoteOccupiedDates } from "./approvedBlocks";

// 심사 승인이 곧 그 날짜를 내준다는 뜻인데, 승인해도 달력이 열려 있어 다른 회사가
// 계속 신청할 수 있었다(2026-09-02 QA). 승인 건은 대관 불가 일정과 같은 자리에서 막는다.
function quote(over: Partial<Quote> & { id: string }): Quote {
  return {
    id: over.id,
    applicantId: "u1",
    selection: {
      venueId: "arena",
      bookingMode: "SINGLE",
      packageId: 1,
      week: { year: 2027, month: 7, weekOfMonth: 2, startDate: "2027-07-06" },
      excludedDays: [],
      extraDays: 0,
      expectedAudience: 10000,
      addons: [],
      midHallDays: {},
      ...(over.selection ?? {}),
    } as Quote["selection"],
    rateTableVersion: "v1",
    lineItems: [],
    subtotal: 0,
    vat: 0,
    total: 0,
    meteredNotice: "",
    status: "ESTIMATE",
    createdAt: "2026-09-01T00:00:00.000Z",
    review: over.review ?? null,
    contract: null,
    settlement: null,
  };
}

const APPROVED = {
  quoteId: "q1",
  decision: "APPROVED" as const,
  score: null,
  rationale: "",
  decidedAt: "2026-09-02T00:00:00.000Z",
  decidedBy: "admin",
};

describe("approvedQuoteBlocks", () => {
  it("승인된 신청서의 날짜만 막는다", () => {
    const blocks = approvedQuoteBlocks([
      quote({ id: "q1", review: APPROVED }),
      quote({ id: "q2" }), // 심사 전 — 막지 않는다
    ]);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => b.reason === APPROVED_BLOCK_REASON)).toBe(true);
    expect(blocks.every((b) => b.venueId === "arena")).toBe(true);
  });

  it("보류·거절은 막지 않는다", () => {
    for (const decision of ["HOLD", "REJECTED"] as const) {
      expect(
        approvedQuoteBlocks([quote({ id: "q1", review: { ...APPROVED, decision } })]),
      ).toEqual([]);
    }
  });

  // 자기가 잡은 날짜에 막혀 자기 신청서를 못 고치면 안 된다.
  it("제외한 신청서는 빠진다", () => {
    const quotes = [quote({ id: "q1", review: APPROVED })];
    expect(approvedQuoteBlocks(quotes, "q1")).toEqual([]);
    expect(approvedQuoteBlocks(quotes, "다른건").length).toBeGreaterThan(0);
  });

  it("같은 날짜가 여러 건에 걸려도 한 번만 나온다", () => {
    const blocks = approvedQuoteBlocks([
      quote({ id: "q1", review: APPROVED }),
      quote({ id: "q2", review: { ...APPROVED, quoteId: "q2" } }),
    ]);
    const keys = blocks.map((b) => `${b.date}:${b.venueId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // 「패키지」는 공간 id 가 arena 인데 중형 날짜도 함께 잡는다 — 그 날짜도 막혀야 한다.
  it("중형 일정을 함께 잡은 건은 중형 날짜도 막는다", () => {
    const packaged = quote({
      id: "q3",
      review: { ...APPROVED, quoteId: "q3" },
      selection: {
        midHallDays: { "2027-07-08": { role: "PERFORMANCE", shows: 1 } },
      } as Partial<Quote["selection"]> as Quote["selection"],
    });
    const blocks = approvedQuoteBlocks([packaged]);
    expect(blocks.some((b) => b.venueId === "medium-hall" && b.date === "2027-07-08")).toBe(true);
  });

  it("차지하는 날짜는 공간별로 나뉜다", () => {
    const entries = quoteOccupiedDates(quote({ id: "q1" }));
    expect(entries.every((e) => e.venueId === "arena")).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });
});
