import { describe, expect, it } from "vitest";
import { scoreQuote } from "./scoreQuote";
import type { MarketingCooperation, PerformanceInfo, QuoteSelection, SafetyPledge } from "@/lib/pricing/types";

function basePerformanceInfo(overrides: Partial<PerformanceInfo> = {}): PerformanceInfo {
  return {
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
    ...overrides,
  };
}

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
    performanceInfo: basePerformanceInfo(),
    midHallPerformanceInfo: null,
    ...overrides,
  };
}

const COMPLETE_PLEDGE: SafetyPledge = {
  safetyStructure: true,
  legalInspection: true,
  staffSafetyTraining: true,
  followVenueGuidance: true,
  audienceSafetyMeasures: true,
  insuranceCoverage: true,
  consequenceAcknowledged: true,
  signature: "홍길동",
};

describe("scoreQuote — A-REV-01 예상 관객 규모 구간", () => {
  it("2만 이상은 20점", () => {
    const [result] = scoreQuote(baseSelection({ expectedAudience: 20000 })).results;
    expect(result.categories[0].items[0]).toMatchObject({ code: "A-REV-01", score: 20 });
  });

  it("1만 미만은 3점", () => {
    const [result] = scoreQuote(baseSelection({ expectedAudience: 9000 })).results;
    expect(result.categories[0].items[0]).toMatchObject({ code: "A-REV-01", score: 3 });
  });
});

describe("scoreQuote — A-REV-02 패키지 등급 매핑", () => {
  it("패키지 4는 20점, 패키지 1은 5점", () => {
    const r4 = scoreQuote(baseSelection({ packageId: 4 })).results[0];
    const r1 = scoreQuote(baseSelection({ packageId: 1 })).results[0];
    expect(r4.categories[0].items[1]).toMatchObject({ code: "A-REV-02", score: 20 });
    expect(r1.categories[0].items[1]).toMatchObject({ code: "A-REV-02", score: 5 });
  });

  it("패키지 미확정(Custom 등)이면 산정 불가로 표시된다", () => {
    const r = scoreQuote(baseSelection({ packageId: null })).results[0];
    expect(r.categories[0].items[1]).toMatchObject({ code: "A-REV-02", score: null, confidence: "UNAVAILABLE" });
  });
});

describe("scoreQuote — A-PUB-01 공공성 체크리스트 distinct 카운트", () => {
  it("암표 방지·소비자 보호를 둘 다 체크해도 같은 항목(⑤)이라 1개로만 센다", () => {
    const selection = baseSelection({
      performanceInfo: basePerformanceInfo({ publicInterestItems: ["ANTI_SCALPING", "CONSUMER_PROTECTION"] }),
    });
    const r = scoreQuote(selection).results[0];
    const pub01 = r.categories[1].items.find((i) => i.code === "A-PUB-01")!;
    expect(pub01.evidence).toContain("1/5");
    expect(pub01.score).toBe(3); // n=1 -> 3점
  });

  it("체크리스트 5개(암표/소비자보호 병합 포함)를 전부 채우면 15점 만점", () => {
    const selection = baseSelection({
      performanceInfo: basePerformanceInfo({
        publicInterestItems: [
          "DISCOUNT_ACCESS",
          "ACCESSIBILITY_SUPPORT",
          "VENUE_LINKED_PROGRAM",
          "COMPLAINT_REDUCTION_PLEDGE",
          "ANTI_SCALPING",
        ],
      }),
    });
    const r = scoreQuote(selection).results[0];
    const pub01 = r.categories[1].items.find((i) => i.code === "A-PUB-01")!;
    expect(pub01.score).toBe(15);
  });
});

describe("scoreQuote — 협조 동의 항목(A-MKT-02/04)은 정책상 제외", () => {
  it("동의 여부와 무관하게 점수가 null이고 집계에서 빠진다", () => {
    const marketingCooperation: MarketingCooperation = {
      channels: [],
      seoulArenaPromotionConsent: true,
      sponsorships: [],
      coPromotionConsent: true,
      coSponsorshipConsent: true,
      ticketSalesDataConsent: true,
      pollstarConsent: true,
      executionPlan: { targetDefinition: "", mediaMix: "", budget: "", timeline: "" },
    };
    const r = scoreQuote(baseSelection({ marketingCooperation })).results[0];
    const mkt02 = r.categories[2].items.find((i) => i.code === "A-MKT-02")!;
    const mkt04 = r.categories[2].items.find((i) => i.code === "A-MKT-04")!;
    expect(mkt02).toMatchObject({ score: null, confidence: "EXCLUDED" });
    expect(mkt04).toMatchObject({ score: null, confidence: "EXCLUDED" });
    expect(r.unresolvedMax).toBeGreaterThanOrEqual(10);
  });
});

describe("scoreQuote — A-SAF-02 서약서 및 DQ-01 부적격 게이트", () => {
  it("서약 7항목 + 서명이 모두 있으면 10점, 부적격 게이트는 정상", () => {
    const r = scoreQuote(baseSelection({ safetyPledge: COMPLETE_PLEDGE })).results[0];
    const saf02 = r.categories[3].items.find((i) => i.code === "A-SAF-02")!;
    expect(saf02.score).toBe(10);
    expect(r.disqualifiers.find((d) => d.code === "DQ-01")?.triggered).toBe(false);
  });

  it("서약서가 없으면 0점이고 DQ-01이 자동 발동해 잠정 적격 판정도 false가 된다", () => {
    const r = scoreQuote(baseSelection()).results[0];
    const saf02 = r.categories[3].items.find((i) => i.code === "A-SAF-02")!;
    expect(saf02.score).toBe(0);
    expect(r.disqualifiers.find((d) => d.code === "DQ-01")?.triggered).toBe(true);
    expect(r.provisionalEligible).toBe(false);
  });
});

describe("scoreQuote — 동시 대관은 아레나·중형 독립 심사(13-C-5 가안)", () => {
  it("SIMULTANEOUS이면 두 공간 결과를 각각 반환한다", () => {
    const breakdown = scoreQuote(baseSelection({ bookingMode: "SIMULTANEOUS" }));
    expect(breakdown.results.map((r) => r.venueId)).toEqual(["arena", "medium-hall"]);
  });
});

describe("scoreQuote — M-REV-01 중형 회차 가중", () => {
  it("공연 3회면 관객수 구간 점수에 +2가 더해진다", () => {
    const selection = baseSelection({
      venueId: "medium-hall",
      secondaryAudience: 2000, // 8점 구간
      midHallDays: {
        "2027-08-03": { role: "PERFORMANCE", shows: 2 },
        "2027-08-04": { role: "PERFORMANCE", shows: 1 },
      },
    });
    const r = scoreQuote(selection).results[0];
    const rev01 = r.categories[0].items.find((i) => i.code === "M-REV-01")!;
    expect(rev01.score).toBe(10); // 8(구간) + 2(3회 가중)
  });
});
