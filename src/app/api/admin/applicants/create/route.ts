import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import {
  assignCompanyRoleOnJoin,
  createUser,
  findOrCreateCompany,
  findUserByEmailWithPasswordHash,
  findUserByUsername,
} from "@/lib/db";
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

  // 운영자가 직접 만든 계정도 회사에 붙으면 마스터 여부를 정해야 한다 —
  // 안 그러면 마스터가 0명인 회사가 만들어진다.
  if (company) {
    user.companyRole = await assignCompanyRoleOnJoin(user.id, company.id);
  }

  return NextResponse.json({ user });
}
