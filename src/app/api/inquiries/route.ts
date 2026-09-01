import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createInquiry, listInquiries, notifyAdmins } from "@/lib/db";
import { findInquiryCategory } from "@/lib/inquiryCategories";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const inquiries = user.role === "ADMIN" ? await listInquiries() : await listInquiries({ userId: user.id });
  return NextResponse.json({ inquiries });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "운영자 계정으로는 문의를 등록할 수 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 60) : "";
  const content = typeof body?.content === "string" ? body.content.trim().slice(0, 2000) : "";
  const category = findInquiryCategory(typeof body?.category === "string" ? body.category : null);
  const quoteId =
    typeof body?.quoteId === "string" && body.quoteId.trim() ? body.quoteId.trim() : null;

  if (!category) {
    return NextResponse.json({ error: "문의 유형을 선택해 주세요." }, { status: 400 });
  }
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  }
  // 신청 건을 전제하는 유형은 신청번호 없이 접수하면 담당 부서가 확인할 대상이 없다
  if (category.quote === "REQUIRED" && !quoteId) {
    return NextResponse.json(
      { error: `${category.label} 문의는 관련 신청번호가 필요합니다.` },
      { status: 400 },
    );
  }

  const createdAt = new Date().toISOString();
  const inquiry = await createInquiry({
    id: crypto.randomUUID(),
    userId: user.id,
    category: category.id,
    quoteId: category.quote === "NONE" ? null : quoteId,
    title,
    content,
    createdAt,
  });
  await notifyAdmins({
    quoteId: quoteId ?? "",
    message: `새 1:1 문의가 등록되었습니다 (${category.label}): ${title}`,
    createdAt,
  });
  // 등록자 본인에게 접수 알림톡(ARENA-0010). (2026-09-01 팀 요청)
  dispatchMessageInBackground({
    templateCode: "ARENA-0010",
    idempotencyKey: `ARENA-0010:${inquiry.id}`,
    recipient: { userId: user.id, phone: user.phone, email: user.email, name: user.name },
    variables: { 등록자명: user.name },
    request,
  });

  return NextResponse.json({ inquiry });
}
