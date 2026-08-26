import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/publicUrl";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hashInviteToken, inviteExpiresAt, issueInviteToken } from "@/lib/invitation";
import { dispatchMessage } from "@/lib/message/dispatch";
import {
  cancelInvitation,
  createCompanyInvitation,
  isCompanyMaster,
  listCompanyInvitations,
  resendInvitation,
} from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.companyId || !isCompanyMaster(user)) {
    return NextResponse.json({ error: "대표 담당자만 이용할 수 있습니다." }, { status: 403 });
  }
  return NextResponse.json({ invitations: await listCompanyInvitations(user.companyId) });
}

// 담당자 초대 — 계정을 만들지 않고 링크만 발급한다(기획서 A11).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.companyId || !isCompanyMaster(user)) {
    return NextResponse.json({ error: "대표 담당자만 이용할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "cancel") {
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    await cancelInvitation(id, user.companyId);
    return NextResponse.json({ ok: true });
  }

  // [신규 2026-08-26] 재발송 — 새 토큰으로 링크를 다시 만들고 알림톡을 다시 보낸다.
  if (action === "resend") {
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const token = issueInviteToken();
    const expiresAt = inviteExpiresAt();
    const invitation = await resendInvitation(id, user.companyId, hashInviteToken(token), expiresAt);
    if (!invitation) {
      return NextResponse.json({ error: "재발송할 수 없는 초대입니다." }, { status: 400 });
    }
    const origin = publicOrigin(request);
    const inviteUrl = `${origin}/invite?token=${token}`;
    await dispatchMessage({
      templateCode: "MB-06",
      idempotencyKey: `MB-06:${id}:${Date.now()}`,
      recipient: { userId: null, phone: invitation.phone, email: invitation.email, name: invitation.inviteeName },
      variables: { 회사명: user.companyName ?? "", 초대링크: inviteUrl },
      request,
    });
    return NextResponse.json({ ok: true, inviteUrl, expiresAt });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인해주세요." }, { status: 400 });
  }
  // 알림톡은 이메일이 아니라 휴대폰 번호로 발송된다(kakaoBizTalkAdapter) — 이 값이
  // 없으면 알림톡 키를 설정해도 초대 알림이 "수신번호 없음"으로 항상 실패한다.
  // 필수까지는 아니고(대신 인앱·이메일 채널이 생기면 그쪽으로 대체 가능), 최소
  // 숫자 9자리 이상만 확인한다.
  const rawPhone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (rawPhone && rawPhone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "휴대폰 번호 형식을 확인해주세요." }, { status: 400 });
  }
  const phone = rawPhone || null;
  // 가입 전에도 초대 목록에서 누구를 초대했는지 알아볼 수 있게 받아두는 값(2026-08-22).
  // 이름은 필수, 소속은 선택이다("이름은 선택 아닌데" 피드백) — 이름은 실제 가입 시
  // 본인이 입력하는 이름을 대체하지 않고, 가입 전까지의 표시용으로만 쓰인다.
  const inviteeName = typeof body?.name === "string" ? body.name.trim() : "";
  if (!inviteeName) {
    return NextResponse.json({ error: "초대할 담당자 이름을 입력해주세요." }, { status: 400 });
  }
  const inviteeTitle = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : null;

  // 원문 토큰은 링크로만 나가고 DB 에는 해시만 남는다.
  const token = issueInviteToken();
  const expiresAt = inviteExpiresAt();
  const id = crypto.randomUUID();
  await createCompanyInvitation({
    id,
    companyId: user.companyId,
    invitedBy: user.id,
    email,
    phone,
    inviteeName,
    inviteeTitle,
    tokenHash: hashInviteToken(token),
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  const origin = publicOrigin(request);
  const inviteUrl = `${origin}/invite?token=${token}`;

  // 초대받은 사람은 아직 계정이 없어 인앱 알림이 성립하지 않는다(recipient.userId
  // null) — dispatchMessage가 이를 감지해 인앱은 건너뛰고 알림톡으로만 나간다.
  // 전화번호를 안 받았으면(phone null) 알림톡도 "수신번호 없음"으로 실패하고,
  // 그때는 마스터 화면에 계속 보여주는 링크로 직접 전달해야 한다(기존 동작 유지).
  await dispatchMessage({
    templateCode: "MB-06",
    idempotencyKey: `MB-06:${id}`,
    recipient: { userId: null, phone, email, name: inviteeName },
    variables: { 회사명: user.companyName ?? "", 초대링크: inviteUrl },
    request,
  });

  return NextResponse.json({
    ok: true,
    invitationId: id,
    inviteUrl,
    expiresAt,
  });
}
