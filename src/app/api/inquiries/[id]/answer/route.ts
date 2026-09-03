import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { answerInquiry, createNotification, findUserById, getInquiryById } from "@/lib/db";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";
import { audienceOrigin } from "@/lib/publicUrl";

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
  // 인앱 알림은 계정이 있을 때만 — 비회원 문의는 메일·알림톡으로만 회신한다.
  if (inquiry.userId) {
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: inquiry.userId,
      quoteId: "",
      message: `1:1 문의 "${inquiry.title}"에 답변이 등록되었습니다.`,
      createdAt: now,
    });
  }
  // 문의 등록자에게 답변 완료 알림톡·메일(ARENA-0009). (2026-09-01 팀 요청)
  // [수정 2026-09-02] 문의에 적은 연락처로 보낸다 — 계정 정보로만 보내면 가입 명의
  // (대개 대표 담당자) 앞으로 가서, 정작 물어본 실무자는 답변을 못 봤다.
  const registrant = inquiry.userId ? await findUserById(inquiry.userId) : undefined;
  const phone = inquiry.contactPhone ?? registrant?.phone ?? null;
  const email = inquiry.contactEmail ?? registrant?.email ?? null;
  const name = inquiry.contactName ?? registrant?.name ?? "";
  if (registrant || phone || email) {
    /*
      비회원 문의는 로그인으로 답변을 볼 수 없다 — 메일 본문의 링크를 그 문의 하나를
      여는 주소로 바꾼다(열쇠 포함). 카카오 쪽 링크는 템플릿 등록값 고정이라 그대로
      두고(수정하면 재검수), 우리가 만드는 메일 본문만 바꾼다.
    */
    const guestLink =
      inquiry.accessToken && !inquiry.userId
        ? `${audienceOrigin(request, "APPLICANT")}/inquiry/${id}?t=${encodeURIComponent(inquiry.accessToken)}`
        : null;

    // 비회원은 로그인 화면이 소용없다 — 버튼에 그 문의 하나를 여는 링크가 실리는 ARENA_0016 으로 보낸다
    // (2026-09-03 팀 요청). 버튼 URL 변수 값은 등록 링크의 호스트 뒤 경로("inquiry/{id}?t=토큰").
    const code = guestLink ? "ARENA-0016" : "ARENA-0009";
    dispatchMessageInBackground({
      templateCode: code,
      idempotencyKey: `${code}:${id}:${now}`,
      buttonUrl: guestLink,
      recipient: { userId: registrant?.id ?? null, phone, email, name },
      variables: guestLink
        ? { 등록자명: name || "고객", "1:1문의링크": `inquiry/${id}?t=${encodeURIComponent(inquiry.accessToken ?? "")}` }
        : { 등록자명: name || "고객" },
      request,
    });
  }

  return NextResponse.json({ inquiry: updated });
}
