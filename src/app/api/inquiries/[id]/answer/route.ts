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
  // 인앱 알림은 계정이 있을 때만 — 비회원 문의는 메일·알림톡으로만 회신한다.
  if (inquiry.userId) {
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: inquiry.userId,
      quoteId: "",
      message: `1:1 문의 "${inquiry.title}"에 답변이 등록되었습니다.`,
      createdAt: now,
    });
  }
  // 문의 등록자에게 답변 완료 알림톡·메일(ARENA-0009). (2026-09-01 팀 요청)
  // [수정 2026-09-02] 문의에 적은 연락처로 보낸다 — 계정 정보로만 보내면 가입 명의
  // (대개 대표 담당자) 앞으로 가서, 정작 물어본 실무자는 답변을 못 봤다.
  const registrant = inquiry.userId ? await findUserById(inquiry.userId) : undefined;
  const phone = inquiry.contactPhone ?? registrant?.phone ?? null;
  const email = inquiry.contactEmail ?? registrant?.email ?? null;
  const name = inquiry.contactName ?? registrant?.name ?? "";
  if (registrant || phone || email) {
    dispatchMessageInBackground({
      templateCode: "ARENA-0009",
      idempotencyKey: `ARENA-0009:${id}:${now}`,
      recipient: { userId: registrant?.id ?? null, phone, email, name },
      variables: { 등록자명: name },
      request,
    });
  }

  return NextResponse.json({ inquiry: updated });
}
