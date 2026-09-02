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

  /*
    답변받을 곳 (2026-09-02).

    승인 전 회원도 문의를 남긴다 — 그런데 답변을 계정 정보로만 보내면 가입 명의(대표)
    앞으로 가서 정작 물어본 실무자는 못 본다. 그래서 문의마다 이름·이메일·휴대폰을
    따로 받고, 답변 알림(메일·알림톡)은 이 값으로 보낸다.
    비워 보내면 계정 정보를 그대로 쓴다(옛 화면 호환).
  */
  const contactName = (typeof body?.contactName === "string" ? body.contactName.trim() : "").slice(0, 40);
  const contactEmail = (typeof body?.contactEmail === "string" ? body.contactEmail.trim() : "").slice(0, 120);
  const contactPhone = (typeof body?.contactPhone === "string" ? body.contactPhone.trim() : "").slice(0, 20);

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "연락받을 이메일 주소를 정확히 입력해 주세요." }, { status: 400 });
  }
  if (contactPhone && !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(contactPhone)) {
    return NextResponse.json({ error: "연락받을 전화번호를 정확히 입력해 주세요." }, { status: 400 });
  }

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
    contactName: contactName || user.name,
    contactEmail: contactEmail || user.email,
    contactPhone: contactPhone || user.phone,
    createdAt,
  });
  await notifyAdmins({
    quoteId: quoteId ?? "",
    message: `새 1:1 문의가 등록되었습니다 (${category.label}): ${title}`,
    createdAt,
  });
  // 등록자 본인에게 접수 알림톡·메일(ARENA-0010). (2026-09-01 팀 요청)
  // 받는 곳은 문의에 적은 연락처다 — 계정 명의가 아니라 물어본 사람에게 가야 한다.
  dispatchMessageInBackground({
    templateCode: "ARENA-0010",
    idempotencyKey: `ARENA-0010:${inquiry.id}`,
    recipient: {
      userId: user.id,
      phone: inquiry.contactPhone ?? user.phone,
      email: inquiry.contactEmail ?? user.email,
      name: inquiry.contactName ?? user.name,
    },
    variables: { 등록자명: inquiry.contactName ?? user.name },
    request,
  });

  return NextResponse.json({ inquiry });
}
