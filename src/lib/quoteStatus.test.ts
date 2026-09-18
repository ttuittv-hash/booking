import { describe, it, expect } from "vitest";
import { applicantQuoteStatusLabel, applicantQuoteStatusTone, canApplicantEditQuote } from "./quoteStatus";
import type { Review } from "@/lib/pricing/types";

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

// [신규 2026-09-18] 거절(REJECTED)도 보류처럼 신청자 화면에 별도 표시가 있어야 한다 —
// 없으면 관리자 목록엔 "심사 거절"이 뜨는데 신청자 화면엔 계속 "신청 접수 (심사 대기)"로만
// 보여 거절된 걸 알 길이 없었다(팀 채팅에서 확인된 문제).
function reviewOf(decision: Review["decision"]): Review {
  return { quoteId: "q1", decision, score: null, rationale: "", decidedAt: new Date().toISOString(), decidedBy: "admin" };
}

describe("applicantQuoteStatusLabel/Tone — 거절은 보류와 별개로 표시된다", () => {
  it("거절되면 '거절됨'으로 표시하고 danger 톤을 쓴다", () => {
    const q = { status: "ESTIMATE" as const, review: reviewOf("REJECTED") };
    expect(applicantQuoteStatusLabel(q)).toBe("거절됨");
    expect(applicantQuoteStatusTone(q)).toBe("danger");
  });

  it("보류는 여전히 '보류 (보완 요청)'으로 표시된다", () => {
    const q = { status: "ESTIMATE" as const, review: reviewOf("HOLD") };
    expect(applicantQuoteStatusLabel(q)).toBe("보류 (보완 요청)");
  });

  it("승인되면 원래 status 라벨(신청 접수)을 그대로 쓴다", () => {
    const q = { status: "ESTIMATE" as const, review: reviewOf("APPROVED") };
    expect(applicantQuoteStatusLabel(q)).toBe("신청 접수 (심사 대기)");
  });
});
