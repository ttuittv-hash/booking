import { NextResponse } from "next/server";
import { formatAmount, notifyQuoteApplicant } from "@/lib/message/quoteEvents";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { addAuditLog, createContractAddendum, createNotification, getQuoteById } from "@/lib/db";

// 부속합의(계약 변경 이력) 등록 — 계약 확정 이후에만 가능하다. 계약금액(contractTotal)
// 자체는 건드리지 않고 이력만 append한다(2026-08-22 대관료 정산프로세스 반영).
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!quote.contract) {
    return NextResponse.json({ error: "계약이 확정된 신청서만 부속합의를 등록할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const amountDeltaInput = Number(body?.amountDelta);
  const agreedAt = typeof body?.agreedAt === "string" && body.agreedAt.trim() ? body.agreedAt.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "변경 사유를 입력하세요." }, { status: 400 });
  }
  if (!Number.isFinite(amountDeltaInput)) {
    return NextResponse.json({ error: "금액 변동을 입력하세요(변동이 없으면 0)." }, { status: 400 });
  }
  if (!agreedAt) {
    return NextResponse.json({ error: "부속합의 체결일을 입력하세요." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const addendum = await createContractAddendum({
    id: crypto.randomUUID(),
    quoteId: id,
    description,
    amountDelta: amountDeltaInput,
    agreedAt,
    createdBy: user.id,
    createdAt: now,
  });

  await addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "CONTRACT_ADDENDUM",
    snapshot: addendum,
    actorId: user.id,
    createdAt: now,
  });

  await createNotification({
    id: crypto.randomUUID(),
    recipientId: quote.applicantId,
    quoteId: id,
    message: `${id}에 부속합의가 등록되었습니다 — ${description} (${amountDeltaInput >= 0 ? "+" : ""}${amountDeltaInput.toLocaleString("ko-KR")}원)`,
    createdAt: now,
  });
  notifyQuoteApplicant({
    templateCode: "RT-09",
    quoteId: id,
    applicantId: quote.applicantId,
    eventKey: addendum.id,
    variables: { 내용: description, 금액변동: `${amountDeltaInput >= 0 ? "+" : ""}${formatAmount(amountDeltaInput)}` },
    request,
  });

  return NextResponse.json({ addendum });
}
