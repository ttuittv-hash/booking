import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { findUserByLoginIdWithPasswordHash } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = findUserByLoginIdWithPasswordHash(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await createSession(user.id, user.role);
  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email, name: user.name, companyName: user.companyName, role: user.role, createdAt: user.createdAt },
  });
}
