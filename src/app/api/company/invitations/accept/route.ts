import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { hashPassword, createSession } from "@/lib/auth";
import {
  assignCompanyRoleOnJoin,
  attachIdentityToUser,
  consumeInvitation,
  createUser,
  findCompanyById,
  findCompletedIdentity,
  findUserByDi,
  findUserByEmailWithPasswordHash,
  findUserByUsername,
  findValidInvitation,
} from "@/lib/db";
import { verifyIdentityTicket } from "@/lib/identityTicket";
import { isNiceAuthConfigured } from "@/lib/niceAuth";
import { SHA256_HEX_RE } from "@/lib/passwordScheme";
import { hashInviteToken } from "@/lib/invitation";

// 초대 수락 — 본인이 인증하고 비밀번호를 직접 정한다(기획서 A11).
// 마스터가 임시 비밀번호를 정해 전달하는 방식을 쓰지 않는 이유가 여기 있다.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const passwordHash = typeof body?.passwordHash === "string" ? body.passwordHash.toLowerCase() : "";
  const identityTicket = typeof body?.identityTicket === "string" ? body.identityTicket : "";

  const invitation = token ? await findValidInvitation(hashInviteToken(token)) : undefined;
  if (!invitation) {
    return NextResponse.json(
      { error: "초대 링크가 만료되었거나 이미 사용되었습니다. 대표 담당자에게 재발송을 요청해주세요." },
      { status: 400 },
    );
  }
  if (!name || !username || !SHA256_HEX_RE.test(passwordHash)) {
    return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });
  }
  // [신규 2026-08-26] 초대장이 특정 이름(invitee_name)을 지정했다면 그 이름을 정본으로
  // 쓴다 — 클라이언트가 보낸 이름을 그대로 믿으면 "김승기" 앞으로 온 링크를 다른 사람이
  // 열어 자기 이름("테드")으로 가입할 수 있었다("노라이름으로 초대한 링크를 테드한테
  // 보내도 가입이 됩니다"). 폼에서도 이 경우 이름 입력을 잠가 두지만, 서버가 최종
  // 판정자여야 폼을 우회해도 막힌다. invitee_name이 비어 있던 옛 초대는 그대로 입력값을
  // 쓴다.
  const effectiveName = invitation.inviteeName?.trim() || name;
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  if (await findUserByEmailWithPasswordHash(invitation.email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  let identity: Awaited<ReturnType<typeof findCompletedIdentity>> = undefined;
  if (isNiceAuthConfigured()) {
    const payload = await verifyIdentityTicket(identityTicket);
    if (!payload || payload.purpose !== "REGISTER") {
      return NextResponse.json({ error: "휴대폰 본인인증을 먼저 진행해주세요." }, { status: 400 });
    }
    identity = await findCompletedIdentity(payload.verificationId);
    if (!identity?.di) {
      return NextResponse.json({ error: "본인인증 결과를 확인할 수 없습니다." }, { status: 400 });
    }
    if (await findUserByDi(identity.di)) {
      return NextResponse.json({ error: "이미 가입된 명의입니다." }, { status: 409 });
    }
  }

  const company = await findCompanyById(invitation.companyId);
  const createdAt = new Date().toISOString();
  const user = await createUser({
    id: crypto.randomUUID(),
    username,
    email: invitation.email,
    phone: identity?.mobileNo ?? null,
    passwordHash: await hashPassword(passwordHash),
    // 본인인증이 설정된 환경에서는 인증 결과 이름을 정본으로 쓴다. 그게 없으면(NICE
    // 미설정 — 프리뷰 환경 등) 직접 입력한 이름을 쓴다. 예전엔 이 경우 이름이 아예 없어
    // 아이디로 대체됐는데, 담당자 목록에서 그대로 보여 "이름이 이상하다"는 지적을 받았다.
    name: identity?.name ?? effectiveName ?? username,
    companyName: company?.name ?? null,
    companyId: invitation.companyId,
    role: "APPLICANT",
    // 마스터가 부른 사람이라 합류 승인은 이미 끝난 셈이다.
    approvalStatus: "APPROVED",
    termsAgreedAt: createdAt,
    privacyAgreedAt: createdAt,
    createdAt,
  });

  if (identity?.ci && identity.di) {
    await attachIdentityToUser(user.id, { ci: identity.ci, di: identity.di, verifiedAt: createdAt });
  }
  await assignCompanyRoleOnJoin(user.id, invitation.companyId);
  await consumeInvitation(invitation.id, user.id);
  await createSession(user.id, user.role);

  return NextResponse.json({ ok: true, companyName: company?.name ?? null });
}
