import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createInquiry, listInquiries, notifyAdmins } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const inquiries = user.role === "ADMIN" ? listInquiries() : listInquiries({ userId: user.id });
  return NextResponse.json({ inquiries });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "운영자 계정으로는 문의를 등록할 수 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const inquiry = createInquiry({ id: crypto.randomUUID(), userId: user.id, title, content, createdAt });
  notifyAdmins({
    quoteId: "",
    message: `새 1:1 문의가 등록되었습니다: ${title}`,
    createdAt,
  });

  return NextResponse.json({ inquiry });
}
