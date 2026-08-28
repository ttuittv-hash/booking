import { describe, expect, it } from "vitest";
import { buildReportStats } from "./reportStats";
import type { Company, Quote } from "./pricing/types";

function makeQuote(overrides: Partial<Quote> & { createdAt: string }): Quote {
  return {
    id: overrides.id ?? "SA-TEST",
    applicantId: "user-1",
    selection: {
      venueId: "arena",
      bookingMode: "SINGLE",
    } as Quote["selection"],
    rateTableVersion: "v1",
    lineItems: [],
    subtotal: 0,
    vat: 0,
    total: 1_000_000,
    meteredNotice: "",
    status: "ESTIMATE",
    review: null,
    contract: null,
    settlement: null,
    ...overrides,
  } as Quote;
}

function makeCompany(status: Company["status"]): Company {
  return {
    id: `c-${status}`,
    name: "테스트기획",
    businessRegistrationNumber: null,
    representativeName: null,
    representativePhone: null,
    representativeFax: null,
    corporateRegistrationNumber: null,
    postalCode: null,
    address: null,
    businessCertUrl: null,
    businessCertName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    status,
    masterUserId: null,
    companyPhone: null,
    companyFax: null,
    corporateNumber: null,
    verification: null,
    companyType: null,
  };
}

describe("buildReportStats", () => {
  const now = new Date("2026-08-22T00:00:00.000Z");

  it("이번 달 신규 신청과 심사 대기를 센다", () => {
    const quotes = [
      makeQuote({ id: "q1", createdAt: "2026-08-10T00:00:00.000Z" }),
      makeQuote({ id: "q2", createdAt: "2026-07-01T00:00:00.000Z" }),
    ];
    const stats = buildReportStats(quotes, [], now);
    expect(stats.totalQuotes).toBe(2);
    expect(stats.newThisMonth).toBe(1);
    expect(stats.pendingReview).toBe(2);
  });

  it("심사 결과·계약 확정·정산 완료를 상태별로 집계한다", () => {
    const quotes = [
      makeQuote({
        id: "q1",
        createdAt: "2026-08-01T00:00:00.000Z",
        status: "CONTRACTED",
        review: { quoteId: "q1", decision: "APPROVED", score: null, rationale: "", decidedAt: "", decidedBy: "a" },
        contract: { quoteId: "q1", adjustments: [], contractTotal: 5_000_000, decidedAt: "", decidedBy: "a" } as Quote["contract"],
      }),
      makeQuote({
        id: "q2",
        createdAt: "2026-08-02T00:00:00.000Z",
        status: "SETTLED",
        review: { quoteId: "q2", decision: "APPROVED", score: null, rationale: "", decidedAt: "", decidedBy: "a" },
        total: 2_000_000,
      }),
      makeQuote({
        id: "q3",
        createdAt: "2026-08-03T00:00:00.000Z",
        review: { quoteId: "q3", decision: "REJECTED", score: null, rationale: "", decidedAt: "", decidedBy: "a" },
      }),
    ];
    const stats = buildReportStats(quotes, [], now);
    expect(stats.contractedCount).toBe(2); // CONTRACTED + SETTLED
    expect(stats.contractedTotal).toBe(5_000_000 + 2_000_000); // q1은 contract.contractTotal, q2는 total(계약서 미확정)
    expect(stats.settledCount).toBe(1);
    expect(stats.reviewBreakdown.find((r) => r.key === "APPROVED")?.count).toBe(2);
    expect(stats.reviewBreakdown.find((r) => r.key === "REJECTED")?.count).toBe(1);
  });

  it("공간(아레나/중형/동시 대관)별로 나눠 집계한다", () => {
    const quotes = [
      makeQuote({ id: "q1", createdAt: "2026-08-01T00:00:00.000Z" }),
      makeQuote({
        id: "q2",
        createdAt: "2026-08-01T00:00:00.000Z",
        selection: { venueId: "medium-hall", bookingMode: "SINGLE" } as Quote["selection"],
      }),
      makeQuote({
        id: "q3",
        createdAt: "2026-08-01T00:00:00.000Z",
        selection: { venueId: "arena", bookingMode: "SIMULTANEOUS" } as Quote["selection"],
      }),
    ];
    const stats = buildReportStats(quotes, [], now);
    expect(stats.venueBreakdown.map((r) => r.label).sort()).toEqual(
      ["동시 대관(아레나+중형)", "아레나", "중형공연장"].sort(),
    );
  });

  it("법인 상태별 건수를 센다", () => {
    const companies = [makeCompany("APPROVED"), makeCompany("PENDING"), makeCompany("APPROVED")];
    const stats = buildReportStats([], companies, now);
    expect(stats.companyBreakdown.find((r) => r.key === "APPROVED")?.count).toBe(2);
    expect(stats.companyBreakdown.find((r) => r.key === "PENDING")?.count).toBe(1);
    expect(stats.companyBreakdown.find((r) => r.key === "REJECTED")?.count).toBe(0);
  });

  it("월별 버킷은 최근 6개월을 항상 만들어 둔다(값이 없어도 0건)", () => {
    const stats = buildReportStats([], [], now, 6);
    expect(stats.monthly).toHaveLength(6);
    expect(stats.monthly[stats.monthly.length - 1].key).toBe("2026-08");
    expect(stats.monthly.every((b) => b.count === 0)).toBe(true);
  });
});

describe("공간 탭 필터", () => {
  const arena = makeQuote({ id: "A", createdAt: "2026-08-10T00:00:00.000Z" });
  const mid = makeQuote({
    id: "M",
    createdAt: "2026-08-10T00:00:00.000Z",
    selection: { venueId: "medium-hall", bookingMode: "SINGLE" } as Quote["selection"],
  });
  const both = makeQuote({
    id: "S",
    createdAt: "2026-08-10T00:00:00.000Z",
    selection: { venueId: "arena", bookingMode: "SIMULTANEOUS" } as Quote["selection"],
  });
  const all = [arena, mid, both];
  const now = new Date("2026-08-27T00:00:00.000Z");

  it("전체는 모든 신청서를 센다", () => {
    expect(buildReportStats(all, [], now, 6, "all").totalQuotes).toBe(3);
  });

  it("아레나 탭은 아레나 단독 + 동시 대관을 센다", () => {
    expect(buildReportStats(all, [], now, 6, "arena").totalQuotes).toBe(2);
  });

  it("중형 탭은 중형 단독 + 동시 대관을 센다", () => {
    expect(buildReportStats(all, [], now, 6, "medium-hall").totalQuotes).toBe(2);
  });

  it("동시 대관은 양쪽에 잡히므로 탭 합이 전체보다 클 수 있다", () => {
    const a = buildReportStats(all, [], now, 6, "arena").totalQuotes;
    const m = buildReportStats(all, [], now, 6, "medium-hall").totalQuotes;
    expect(a + m).toBeGreaterThan(buildReportStats(all, [], now, 6, "all").totalQuotes);
  });

  it("법인회원 승인 현황은 공간 탭과 무관하다", () => {
    const companies = [makeCompany("APPROVED"), makeCompany("PENDING")];
    const allTab = buildReportStats(all, companies, now, 6, "all").companyBreakdown;
    const arenaTab = buildReportStats(all, companies, now, 6, "arena").companyBreakdown;
    expect(arenaTab).toEqual(allTab);
  });
});
