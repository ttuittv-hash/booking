import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { createUser, findUserByEmailWithPasswordHash, listUsers } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ users: listUsers({ role: "ADMIN" }) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  }
  if (findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const created = createUser({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    name,
    companyName: null,
    role: "ADMIN",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ user: created });
}
