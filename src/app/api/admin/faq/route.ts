import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createFaq, listFaqs } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ faqs: await listFaqs() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  const tag = typeof body?.tag === "string" && body.tag.trim() ? body.tag.trim() : null;
  if (!question || !answer) {
    return NextResponse.json({ error: "질문과 답변을 입력하세요." }, { status: 400 });
  }

  const faq = await createFaq({ id: crypto.randomUUID(), tag, question, answer, createdAt: new Date().toISOString() });
  return NextResponse.json({ faq });
}
