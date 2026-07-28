import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmailWithPasswordHash } from "@/lib/db";

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
  if (findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const user = createUser({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    name,
    companyName: companyName || null,
    role: "APPLICANT",
    createdAt: new Date().toISOString(),
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ user });
}
