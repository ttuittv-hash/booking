import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotice, listNotices } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ notices: listNotices() });
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
  if (!title || !noticeBody) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const notice = createNotice({
    id: crypto.randomUUID(),
    tag,
    title,
    body: noticeBody,
    imageUrl,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ notice });
}
