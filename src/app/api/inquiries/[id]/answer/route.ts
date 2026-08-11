import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { answerInquiry, createNotification, getInquiryById } from "@/lib/db";

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

  return NextResponse.json({ inquiry: updated });
}
