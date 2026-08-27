import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById, listCompetingQuotesForWeek } from "@/lib/db";
import { generateCompetingRecommendation, isAiReviewConfigured } from "@/lib/aiReview";
import { buildCandidateFacts } from "@/lib/scoring/competingCandidate";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAiReviewConfigured()) {
    return NextResponse.json({ status: "UNCONFIGURED" });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const competing = await listCompetingQuotesForWeek(quote);
  if (competing.length === 0) {
    return NextResponse.json({ status: "ERROR", message: "같은 기간에 겹치는 다른 대관사 신청서가 없습니다." });
  }

  const currentApplicant = await findUserById(quote.applicantId);
  const candidates = [
    buildCandidateFacts(quote, currentApplicant, true),
    ...(await Promise.all(
      competing.map(async ({ quote: q }) => buildCandidateFacts(q, await findUserById(q.applicantId), false)),
    )),
  ];

  const result = await generateCompetingRecommendation(candidates);
  return NextResponse.json(result);
}
