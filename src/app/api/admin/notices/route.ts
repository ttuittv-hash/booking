import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotice, listNotices } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

// [보안 2026-09-04] 목록 GET 도 운영자 전용 — 화면은 서버에서 읽고, 이 API 를 읽는 클라이언트는 없다.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ notices: await listNotices() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const noticeBody = typeof body?.body === "string" ? body.body.trim() : "";
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const tag = typeof body?.tag === "string" && body.tag.trim() ? body.tag.trim() : null;
  const attachmentUrl =
    typeof body?.attachmentUrl === "string" && body.attachmentUrl.trim() ? body.attachmentUrl.trim() : null;
  const attachmentName =
    typeof body?.attachmentName === "string" && body.attachmentName.trim() ? body.attachmentName.trim() : null;
  const showBookingCalendar = body?.showBookingCalendar === true;
  if (!title || !noticeBody) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const notice = await createNotice({
    id: crypto.randomUUID(),
    tag,
    title,
    body: sanitizeRichText(noticeBody),
    imageUrl,
    attachmentUrl,
    attachmentName,
    showBookingCalendar,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ notice });
}
