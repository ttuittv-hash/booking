import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNotice, updateNotice } from "@/lib/db";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const noticeBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!title || !noticeBody) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const notice = updateNotice(id, { title, body: noticeBody, updatedAt: new Date().toISOString() });
  if (!notice) return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ notice });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  deleteNotice(id);
  return NextResponse.json({ ok: true });
}
