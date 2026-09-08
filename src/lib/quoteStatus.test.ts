import { describe, it, expect } from "vitest";
import { canApplicantEditQuote } from "./quoteStatus";

function quote(overrides: Partial<Parameters<typeof canApplicantEditQuote>[0]> = {}) {
  return {
    status: "ESTIMATE" as const,
    review: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("canApplicantEditQuote", () => {
  it("접수 직후(ESTIMATE·review 없음·24시간 이내)면 수정 가능", () => {
    expect(canApplicantEditQuote(quote())).toBe(true);
  });

  it("접수 24시간이 지나면 수정 불가", () => {
    const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1000).toISOString();
    expect(canApplicantEditQuote(quote({ createdAt }))).toBe(false);
  });

  it("23시간 59분이면 아직 수정 가능", () => {
    const createdAt = new Date(Date.now() - (24 * 60 * 60 * 1000 - 60 * 1000)).toISOString();
    expect(canApplicantEditQuote(quote({ createdAt }))).toBe(true);
  });

  it("심사가 시작됐으면(review 있음) 24시간 이내여도 수정 불가", () => {
    expect(
      canApplicantEditQuote(
        quote({
          review: {
            quoteId: "q1",
            decision: "APPROVED",
            score: null,
            rationale: "",
            decidedAt: new Date().toISOString(),
            decidedBy: "admin",
          },
        }),
      ),
    ).toBe(false);
  });

  it("status가 ESTIMATE가 아니면 수정 불가", () => {
    expect(canApplicantEditQuote(quote({ status: "CONTRACTED" }))).toBe(false);
  });
});
