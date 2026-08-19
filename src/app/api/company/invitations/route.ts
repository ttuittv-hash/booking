import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hashInviteToken, inviteExpiresAt, issueInviteToken } from "@/lib/invitation";
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

  const origin = new URL(request.url).origin;
  // 메일 발송 인프라가 아직 없다 — 링크를 화면에 돌려주고 마스터가 직접 전달한다.
  // 발송 채널이 붙으면(Phase 6) 이 자리를 메일·알림톡으로 바꾼다.
  return NextResponse.json({
    ok: true,
    invitationId: id,
    inviteUrl: `${origin}/invite?token=${token}`,
    expiresAt,
  });
}
