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
      contentCooperationConsent: null,
    };
    const r = scoreQuote(baseSelection({ marketingCooperation })).results[0];
    const mkt02 = r.categories[2].items.find((i) => i.code === "A-MKT-02")!;
    const mkt04 = r.categories[2].items.find((i) => i.code === "A-MKT-04")!;
    expect(mkt02).toMatchObject({ score: null, confidence: "EXCLUDED" });
    expect(mkt04).toMatchObject({ score: null, confidence: "EXCLUDED" });
    expect(r.unresolvedMax).toBeGreaterThanOrEqual(10);
  });
});

// [신규 2026-09-18, 감사] A-MKT-01(mediaMixOnline/Offline)·A-MKT-03(coSponsorshipConsent)은
// 위저드에서 입력 UI가 없어진 죽은 필드다 — 레거시 값이 남아있어도(옛 신청서 등)
// 자동으로 점수를 매기지 말고 UNAVAILABLE(위원 직접 판단)로 내려가야 한다.
describe("scoreQuote — A-MKT-01/03은 입력 UI가 없어진 죽은 필드라 산정 불가로 내려간다", () => {
  it("레거시 값이 남아있어도 UNAVAILABLE·score null이고 집계에서 빠진다", () => {
    const marketingCooperation: MarketingCooperation = {
      channels: [],
      seoulArenaPromotionConsent: true,
      sponsorships: [],
      coPromotionConsent: true,
      coSponsorshipConsent: true,
      ticketSalesDataConsent: true,
      pollstarConsent: true,
      executionPlan: { targetDefinition: "", mediaMix: "", budget: "", timeline: "" },
      contentCooperationConsent: null,
    };
    const r = scoreQuote(baseSelection({ marketingCooperation })).results[0];
    const mkt01 = r.categories[2].items.find((i) => i.code === "A-MKT-01")!;
    const mkt03 = r.categories[2].items.find((i) => i.code === "A-MKT-03")!;
    expect(mkt01).toMatchObject({ score: null, confidence: "UNAVAILABLE" });
    expect(mkt03).toMatchObject({ score: null, confidence: "UNAVAILABLE" });
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

// [신규 2026-09-18, 심사표 원본 재대조] 지역상생 프로그램 참여는 배점표에 한 줄뿐인데
// (아레나 5점), 위저드 체크박스가 두 개(LOCAL_COMMUNITY_PROGRAM ·
// REGIONAL_VENUE_ACTIVATION_PROGRAM)라 옛 코드는 둘을 A-BON-01·A-BON-04로 따로 채점해
// 둘 다 체크하면 10점이 나오는 이중 채점이었다.
describe("scoreQuote — A-BON-01 지역상생 프로그램 이중 채점 방지", () => {
  it("두 체크박스를 모두 선택해도 한 줄(5점)로만 합산된다", () => {
    const selection = baseSelection({
      performanceInfo: basePerformanceInfo({
        publicInterestItems: ["LOCAL_COMMUNITY_PROGRAM", "REGIONAL_VENUE_ACTIVATION_PROGRAM"],
      }),
    });
    const r = scoreQuote(selection).results[0];
    expect(r.bonuses.map((b) => b.code)).not.toContain("A-BON-04");
    const bon01 = r.bonuses.find((b) => b.code === "A-BON-01")!;
    expect(bon01.score).toBe(5);
    expect(r.bonusTotal).toBe(5);
  });
});

// [신규 2026-09-18] A-BON-03 경합 추가 대관료 제안은 배점표상 티켓 매출 %구간별
// 점수(0.5%↑4·1%↑6·1.5%↑8·2%↑10)인데, 옛 코드는 값이 있으면 무조건 10점을 줬다.
describe("scoreQuote — A-BON-03 티켓 매출 RS 요율 구간 점수", () => {
  it("1.2%면 6점, 2.5%면 10점, 0.3%면 0점", () => {
    const at = (rate: number) =>
      scoreQuote(
        baseSelection({ performanceInfo: basePerformanceInfo({ ticketRevenueShareRate: rate }) }),
      ).results[0].bonuses.find((b) => b.code === "A-BON-03")!.score;
    expect(at(1.2)).toBe(6);
    expect(at(2.5)).toBe(10);
    expect(at(0.3)).toBe(0);
  });
});

// [신규 2026-09-18] 중형공연장은 가점 항목 자체가 아레나와 다르다(배점표 2p) — 지역상생
// 3점·공익객석 3점·신진 아티스트 기용 16점(아레나의 "경합 추가 대관료"가 아니다). 옛
// 코드는 venueId를 받지 않아 중형 신청서에도 아레나 배점(5/5/경합대관료)이 찍혔다.
describe("scoreQuote — 중형공연장 가점 항목은 아레나와 다르다", () => {
  it("지역상생 3점·공익객석 3점, A-BON 코드가 아니라 M-BON 코드를 쓴다", () => {
    const selection = baseSelection({
      venueId: "medium-hall",
      performanceInfo: basePerformanceInfo({
        publicInterestItems: ["LOCAL_COMMUNITY_PROGRAM", "PUBLIC_INTEREST_SEATS"],
      }),
    });
    const r = scoreQuote(selection).results[0];
    expect(r.bonuses.map((b) => b.code)).toEqual(["M-BON-01", "M-BON-02", "M-BON-03"]);
    expect(r.bonuses.find((b) => b.code === "M-BON-01")?.score).toBe(3);
    expect(r.bonuses.find((b) => b.code === "M-BON-02")?.score).toBe(3);
  });

  it("신진 아티스트 기용은 판정할 필드가 없어 산정 불가로 표시된다", () => {
    const r = scoreQuote(baseSelection({ venueId: "medium-hall" })).results[0];
    const bon03 = r.bonuses.find((b) => b.code === "M-BON-03")!;
    expect(bon03).toMatchObject({ score: null, confidence: "UNAVAILABLE", maxScore: 16 });
  });
});

// [신규 2026-09-18, 심사표 1:1 대조] 배점표 3) 감점 항목 — "심사표와 심사 평가 항목이
// 매칭이 안 된다"(niki). 배점표에는 감점이 다섯 줄로 명시돼 있는데 화면에는 그 줄이
// 하나도 없어 위원이 적용할 자리가 없었다. 자동 판정은 여전히 불가하므로(이력 조회
// 테이블 없음) **노출만 하고 점수는 깎지 않는다** — 그 둘을 함께 못 박는다.
// [신규 2026-09-18, 심사표 1:1 대조] 중형 평가표(배점표 2p)를 보는 위원 화면에 아레나
// 접두(A-)가 찍혀 있어 심사표와 1:1로 안 읽혔다 — 수익성만 M-REV 로 갈라져 있었다.
// 배점·구간은 두 평가표가 같으므로 점수는 그대로 두고 코드 접두만 공간에 맞춘다.
describe("scoreQuote — 항목 코드 접두가 공간에 맞는다", () => {
  const codesOf = (r: ReturnType<typeof scoreQuote>["results"][number]) => [
    ...r.categories.flatMap((c) => c.items.map((i) => i.code)),
    ...r.penalties.map((p) => p.code),
  ];

  it("아레나는 전부 A- 접두다", () => {
    const r = scoreQuote(baseSelection()).results[0];
    expect(codesOf(r).every((c) => c.startsWith("A-"))).toBe(true);
    expect(codesOf(r)).toContain("A-PUB-01");
    expect(codesOf(r)).toContain("A-MKT-01");
    expect(codesOf(r)).toContain("A-SAF-01");
    expect(codesOf(r)).toContain("A-PEN-01");
  });

  it("중형은 전부 M- 접두다 — 수익성뿐 아니라 공공성·마케팅·안전·감점까지", () => {
    const r = scoreQuote(baseSelection({ venueId: "medium-hall" })).results[0];
    expect(codesOf(r).every((c) => c.startsWith("M-"))).toBe(true);
    expect(codesOf(r)).toContain("M-PUB-01");
    expect(codesOf(r)).toContain("M-MKT-01");
    expect(codesOf(r)).toContain("M-SAF-01");
    expect(codesOf(r)).toContain("M-PEN-01");
  });

  it("동시 대관은 아레나 블록은 A-, 중형 블록은 M- 로 갈린다", () => {
    const [arena, mid] = scoreQuote(baseSelection({ bookingMode: "SIMULTANEOUS" })).results;
    expect(codesOf(arena).every((c) => c.startsWith("A-"))).toBe(true);
    expect(codesOf(mid).every((c) => c.startsWith("M-"))).toBe(true);
  });

  // [신규 2026-09-18] 위 검사들은 `code` 필드만 본다 — note 본문에 박힌 참조는 못 본다.
  // 실제로 중형 M-BON-02 의 note 가 "문화소외계층 초청석(A-PUB-01①)"을 가리켜, 접두를
  // 다 바꾼 뒤에도 중형 화면에 A- 코드가 하나 떴다(운영 확인에서 잡혔다). ScoringPanel 은
  // note 도 그대로 그리므로, 결과 전체(코드·라벨·note·가점)를 훑어 반대 공간 접두가 한
  // 개도 없어야 한다. 중형 평가표를 든 위원이 화면에서 못 찾는 코드를 읽으면 안 된다.
  const foreignCodes = (r: unknown, mine: "A" | "M") =>
    (JSON.stringify(r).match(/[AM]-(?:REV|PUB|MKT|SAF|BON|PEN)-\d\d/g) ?? []).filter(
      (c) => !c.startsWith(`${mine}-`),
    );

  it("note 본문까지 훑어도 아레나 결과에 M- 코드가 없다", () => {
    expect(foreignCodes(scoreQuote(baseSelection()).results[0], "A")).toEqual([]);
  });

  it("note 본문까지 훑어도 중형 결과에 A- 코드가 없다", () => {
    const r = scoreQuote(baseSelection({ venueId: "medium-hall" })).results[0];
    expect(foreignCodes(r, "M")).toEqual([]);
  });

  it("접두만 바뀌고 배점은 두 평가표가 같다", () => {
    const a = scoreQuote(baseSelection()).results[0];
    const m = scoreQuote(baseSelection({ venueId: "medium-hall" })).results[0];
    const maxOf = (r: typeof a, key: string) =>
      r.categories.find((c) => c.key === key)?.items.map((i) => i.maxScore);
    for (const key of ["PUBLIC", "MARKETING", "SAFETY"]) {
      expect(maxOf(m, key)).toEqual(maxOf(a, key));
    }
  });
});

describe("scoreQuote — 감점 항목이 배점표(3)와 1:1로 노출된다", () => {
  const EXPECTED = [
    ["A-PEN-01", "3년 내 대관 계약 해지 이력", -5],
    ["A-PEN-02", "대관 승인 이후 취소 이력", -3],
    ["A-PEN-03", "정산 분쟁 이력", -5],
    ["A-PEN-04", "공연장 정책 위반 이력", -3],
    ["A-PEN-05", "중대 안전사고/법규 위반 이력", -10],
  ] as const;

  it("다섯 줄이 배점표와 같은 순서·같은 감점 폭으로 나온다", () => {
    const r = scoreQuote(baseSelection()).results[0];
    expect(r.penalties.map((p) => [p.code, p.label, p.penalty])).toEqual(
      EXPECTED.map((e) => [...e]),
    );
  });

  it("전부 위원 판단 항목이다 — 시스템이 자동으로 발동시키지 않는다", () => {
    const r = scoreQuote(baseSelection()).results[0];
    expect(r.penalties.every((p) => p.auto === false && p.triggered === null)).toBe(true);
  });

  it("노출만 하고 점수는 깎지 않는다 — penaltyTotal 은 0이고 최종 점수에 영향이 없다", () => {
    const r = scoreQuote(baseSelection({ safetyPledge: COMPLETE_PLEDGE })).results[0];
    expect(r.penaltyTotal).toBe(0);
    expect(r.provisionalFinal).toBe(r.computedSubtotal + r.bonusTotal);
  });

  // 배점표가 요구하는 것은 "같은 다섯 줄"이지 "같은 코드"가 아니다 — 항목명·감점 폭은
  // 아레나·중형이 동일하고, 코드 접두만 공간을 따른다(중형 평가표를 보는 위원이 M- 로
  // 맞춰 읽어야 하므로). 이 둘을 한 자리에서 못 박아 두 요구가 서로 어긋나지 않게 한다.
  it("아레나·중형의 감점 항목명·감점 폭은 동일하고, 코드 접두만 공간을 따른다", () => {
    const arena = scoreQuote(baseSelection()).results[0];
    const mid = scoreQuote(baseSelection({ venueId: "medium-hall" })).results[0];
    const content = (r: typeof arena) => r.penalties.map((p) => [p.label, p.penalty, p.auto, p.triggered]);
    expect(content(mid)).toEqual(content(arena));
    expect(arena.penalties.map((p) => p.code)).toEqual([
      "A-PEN-01",
      "A-PEN-02",
      "A-PEN-03",
      "A-PEN-04",
      "A-PEN-05",
    ]);
    expect(mid.penalties.map((p) => p.code)).toEqual([
      "M-PEN-01",
      "M-PEN-02",
      "M-PEN-03",
      "M-PEN-04",
      "M-PEN-05",
    ]);
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
