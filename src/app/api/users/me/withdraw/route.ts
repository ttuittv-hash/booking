import { NextResponse } from "next/server";
import { clearSession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { findUserPasswordHash, withdrawUser } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "운영자 계정은 탈퇴할 수 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const currentHash = await findUserPasswordHash(user.id);
  if (!currentHash || !verifyPassword(password, currentHash)) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  await withdrawUser(user.id, new Date().toISOString());
  await clearSession();
  return NextResponse.json({ ok: true });
}
