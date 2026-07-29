import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAuditLog, createNotification, getQuoteById, setQuoteReview } from "@/lib/db";
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
  const quote = getQuoteById(id);
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

  const review: Review = {
    quoteId: id,
    decision,
    score,
    rationale,
    decidedAt: new Date().toISOString(),
    decidedBy: user.id,
  };

  const updated = setQuoteReview(id, review);
  addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "ESTIMATE",
    snapshot: updated,
    actorId: user.id,
    createdAt: review.decidedAt,
  });

  createNotification({
    id: crypto.randomUUID(),
    recipientId: quote.applicantId,
    quoteId: id,
    message: `${id}의 심사 결과: ${DECISION_LABEL[decision]}${rationale ? ` (${rationale})` : ""}`,
    createdAt: review.decidedAt,
  });

  return NextResponse.json({ quote: updated });
}
