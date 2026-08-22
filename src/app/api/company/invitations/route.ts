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

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인해주세요." }, { status: 400 });
  }

  // 원문 토큰은 링크로만 나가고 DB 에는 해시만 남는다.
  const token = issueInviteToken();
  const expiresAt = inviteExpiresAt();
  const id = crypto.randomUUID();
  await createCompanyInvitation({
    id,
    companyId: user.companyId,
    invitedBy: user.id,
    email,
    tokenHash: hashInviteToken(token),
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  const origin = publicOrigin(request);
  const inviteUrl = `${origin}/invite?token=${token}`;

  // 초대받은 사람은 아직 계정이 없어 인앱 알림이 성립하지 않는다(recipient.userId
  // null) — dispatchMessage가 이를 감지해 인앱은 건너뛰고 알림톡/이메일로만
  // 나간다. 마스터 화면에는 계속 링크를 그대로 보여줘 발송 실패 시에도 직접
  // 전달할 수 있게 한다(기존 동작 유지).
  await dispatchMessage({
    templateCode: "MB-06",
    idempotencyKey: `MB-06:${id}`,
    recipient: { userId: null, phone: null, email, name: null },
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
