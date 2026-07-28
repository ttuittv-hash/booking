import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { findUserByEmailWithPasswordHash } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = findUserByEmailWithPasswordHash(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await createSession(user.id, user.role);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, companyName: user.companyName, role: user.role, createdAt: user.createdAt },
  });
}
