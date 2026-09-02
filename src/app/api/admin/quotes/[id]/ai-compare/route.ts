import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuoteById, listCompetingQuotesForWeek, listUsersByIds } from "@/lib/db";
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

  // 현재 신청자 + 경합 신청자들을 한 번에 조회한다(행마다 findUserById N+1 금지).
  const applicantIds = [quote.applicantId, ...competing.map(({ quote: q }) => q.applicantId)];
  const userMap = new Map((await listUsersByIds(applicantIds)).map((u) => [u.id, u]));
  const candidates = [
    buildCandidateFacts(quote, userMap.get(quote.applicantId) ?? null, true),
    ...competing.map(({ quote: q }) => buildCandidateFacts(q, userMap.get(q.applicantId) ?? null, false)),
  ];

  const result = await generateCompetingRecommendation(candidates);
  return NextResponse.json(result);
}
