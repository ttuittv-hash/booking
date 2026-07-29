import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteFaq, updateFaq } from "@/lib/db";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  const tag = typeof body?.tag === "string" && body.tag.trim() ? body.tag.trim() : null;
  if (!question || !answer) {
    return NextResponse.json({ error: "질문과 답변을 입력하세요." }, { status: 400 });
  }

  const faq = updateFaq(id, { tag, question, answer, updatedAt: new Date().toISOString() });
  if (!faq) return NextResponse.json({ error: "FAQ를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ faq });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  deleteFaq(id);
  return NextResponse.json({ ok: true });
}
