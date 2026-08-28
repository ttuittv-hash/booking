import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import {
  approveCompanyIfMemberApproved,
  ensureCompanyMaster,
  joinCompanyAsStaff,
  createUser,
  findOrCreateCompany,
  findUserByEmailWithPasswordHash,
  findUserById,
  findUserByUsername,
} from "@/lib/db";
import { dispatchMessage } from "@/lib/message/dispatch";
import { sha256Hex } from "@/lib/passwordScheme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9_]{3,19}$/;

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const businessRegistrationNumber =
    typeof body?.businessRegistrationNumber === "string" ? body.businessRegistrationNumber.trim() : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "아이디는 영문 소문자/숫자로 시작하는 4~20자여야 합니다." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "담당자명을 입력하세요." }, { status: 400 });
  }
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  if (await findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const company = companyName
    ? await findOrCreateCompany(companyName, { businessRegistrationNumber: businessRegistrationNumber || undefined })
    : null;

  const createdAt = new Date().toISOString();
  const user = await createUser({
    id: crypto.randomUUID(),
    username,
    email,
    phone: phone || null,
    passwordHash: await hashPassword(sha256Hex(password)),
    name,
    companyName: company?.name ?? null,
    companyId: company?.id ?? null,
    role: "APPLICANT",
    approvalStatus: "APPROVED",
    createdAt,
  });

  // 운영자가 직접 만든 계정은 곧바로 승인 상태다. 회사에 붙였는데 대표가 없으면
  // 이 계정이 대표가 된다 — 대표가 0명인 회사가 만들어지면 이후 합류를 승인할 사람이 없다.
  if (company) {
    user.companyRole = await joinCompanyAsStaff(user.id, company.id);
    await ensureCompanyMaster(company.id);
    // 이 계정은 이미 승인 상태다 — 회사가 "심사 중"에 갇히지 않게 함께 올린다.
    await approveCompanyIfMemberApproved(company.id);
    const refreshed = await findUserById(user.id);
    if (refreshed) user.companyRole = refreshed.companyRole;
  }

  // 비밀번호는 운영자가 안전한 채널로 직접 전달하므로 메시지에는 담지 않는다 —
  // "계정이 만들어졌다"는 사실과 아이디만 알린다. 이미 계정이 있어(userId 확보)
  // 인앱 알림도 함께 남는다.
  await dispatchMessage({
    templateCode: "MB-07",
    idempotencyKey: `MB-07:${user.id}`,
    recipient: { userId: user.id, phone: user.phone, email: user.email, name: user.name },
    variables: { 신청자명: user.name, 회사명: user.companyName ?? "소속 회사" },
    request,
  });

  return NextResponse.json({ user });
}
