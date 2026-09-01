import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { answerInquiry, createNotification, findUserById, getInquiryById } from "@/lib/db";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const inquiry = await getInquiryById(id);
  if (!inquiry) return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!answer) return NextResponse.json({ error: "답변 내용을 입력하세요." }, { status: 400 });

  const now = new Date().toISOString();
  const updated = await answerInquiry(id, answer, user.id, now);
  await createNotification({
    id: crypto.randomUUID(),
    recipientId: inquiry.userId,
    quoteId: "",
    message: `1:1 문의 "${inquiry.title}"에 답변이 등록되었습니다.`,
    createdAt: now,
  });
  // 문의 등록자에게 답변 완료 알림톡(ARENA-0009). (2026-09-01 팀 요청)
  const registrant = await findUserById(inquiry.userId);
  if (registrant) {
    dispatchMessageInBackground({
      templateCode: "ARENA-0009",
      idempotencyKey: `ARENA-0009:${id}:${now}`,
      recipient: { userId: registrant.id, phone: registrant.phone, email: registrant.email, name: registrant.name },
      variables: { 등록자명: registrant.name },
      request,
    });
  }

  return NextResponse.json({ inquiry: updated });
}
