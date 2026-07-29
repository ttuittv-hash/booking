import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findOrCreateCompany, findUserByEmailWithPasswordHash, notifyAdmins } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "이름(담당자명)을 입력하세요." }, { status: 400 });
  }
  if (!companyName) {
    return NextResponse.json({ error: "회사/기획사명을 입력하세요." }, { status: 400 });
  }
  if (findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  // 같은 이름의 회사는 하나로 묶여, 같은 기획사 실무자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  const company = findOrCreateCompany(companyName);

  const createdAt = new Date().toISOString();
  const user = createUser({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    name,
    companyName,
    companyId: company.id,
    role: "APPLICANT",
    approvalStatus: "PENDING",
    createdAt,
  });

  notifyAdmins({
    quoteId: "applicants",
    message: `신규 가입 승인 요청: ${name} (${companyName})`,
    createdAt,
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ user });
}
