import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  addAuditLog,
  createNotification,
  findApprovedWeekConflict,
  getQuoteById,
  setQuoteReview,
  withTransaction,
} from "@/lib/db";
import type { Review, ReviewDecision } from "@/lib/pricing/types";

const DECISIONS: ReviewDecision[] = ["APPROVED", "HOLD", "REJECTED"];
const DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "승인",
  HOLD: "보류",
  REJECTED: "거절",
};

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (quote.status !== "ESTIMATE") {
    return NextResponse.json({ error: "이미 계약 처리된 신청서입니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const decision = body?.decision as ReviewDecision;
  if (!DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "승인/보류/거절 중 하나를 선택하세요." }, { status: 400 });
  }
  const scoreInput = Number(body?.score);
  const score = Number.isFinite(scoreInput) && scoreInput >= 0 && scoreInput <= 100 ? Math.round(scoreInput) : null;
  const rationale = typeof body?.rationale === "string" ? body.rationale.trim() : "";

  if (decision === "APPROVED") {
    const conflict = await findApprovedWeekConflict(quote);
    if (conflict) {
      const { year, month, weekOfMonth } = quote.selection.week;
      return NextResponse.json(
        {
          error: `같은 주차(${year}년 ${month}월 ${weekOfMonth}주차)에 이미 승인된 다른 업체(${conflict.companyName ?? "알 수 없음"})가 있어 승인할 수 없습니다.`,
        },
        { status: 409 },
      );
    }
  }

  const review: Review = {
    quoteId: id,
    decision,
    score,
    rationale,
    decidedAt: new Date().toISOString(),
    decidedBy: user.id,
  };

  // 심사 결과·감사로그·신청자 알림은 한 묶음이다.
  const updated = await withTransaction(async () => {
    const updated = await setQuoteReview(id, review);
    await addAuditLog({
      id: crypto.randomUUID(),
      quoteId: id,
      stage:
        decision === "APPROVED" ? "REVIEW_APPROVED" : decision === "REJECTED" ? "REVIEW_REJECTED" : "REVIEW_HOLD",
      snapshot: updated,
      actorId: user.id,
      createdAt: review.decidedAt,
    });

    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id}의 심사 결과: ${DECISION_LABEL[decision]}${rationale ? ` (${rationale})` : ""}`,
      createdAt: review.decidedAt,
    });

    return updated;
  });

  return NextResponse.json({ quote: updated });
}
