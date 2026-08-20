import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNotice, updateNotice } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { NOTICE_TAGS } from "@/components/TagBadge";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const noticeBody = typeof body?.body === "string" ? body.body.trim() : "";
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  // 말머리는 6개 닫힌 목록만 받는다 — 자유 입력을 허용하면 같은 성격의 게시물이 갈린다
  const rawTag = typeof body?.tag === "string" ? body.tag.trim() : "";
  const tag = (NOTICE_TAGS as readonly string[]).includes(rawTag) ? rawTag : null;
  const attachmentUrl =
    typeof body?.attachmentUrl === "string" && body.attachmentUrl.trim() ? body.attachmentUrl.trim() : null;
  const attachmentName =
    typeof body?.attachmentName === "string" && body.attachmentName.trim() ? body.attachmentName.trim() : null;
  const applyStart =
    typeof body?.applyStart === "string" && body.applyStart.trim() ? body.applyStart.trim() : null;
  const applyEnd =
    typeof body?.applyEnd === "string" && body.applyEnd.trim() ? body.applyEnd.trim() : null;
  const targetVenues =
    typeof body?.targetVenues === "string" && body.targetVenues.trim() ? body.targetVenues.trim() : null;
  if (!title || !noticeBody) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const notice = await updateNotice(id, {
    tag,
    title,
    body: sanitizeRichText(noticeBody),
    imageUrl,
    attachmentUrl,
    attachmentName,
    applyStart,
    applyEnd,
    targetVenues,
    updatedAt: new Date().toISOString(),
  });
  if (!notice) return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ notice });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  await deleteNotice(id);
  return NextResponse.json({ ok: true });
}
