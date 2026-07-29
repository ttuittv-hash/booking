import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { findUserPasswordHash, updateUserPassword } from "@/lib/db";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const currentHash = findUserPasswordHash(user.id);
  if (!currentHash || !verifyPassword(currentPassword, currentHash)) {
    return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  updateUserPassword(user.id, hashPassword(newPassword));
  return NextResponse.json({ ok: true });
}
