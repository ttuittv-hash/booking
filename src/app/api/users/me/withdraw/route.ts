import { NextResponse } from "next/server";
import { clearSession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { findUserPasswordHash, withdrawUser } from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "운영자 계정은 탈퇴할 수 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const passwordHashInput = typeof body?.passwordHash === "string" ? body.passwordHash.toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const cred = await findUserPasswordHash(user.id);
  if (!cred) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  if (cred.passwordScheme === "v2") {
    const transportHash = SHA256_HEX_RE.test(passwordHashInput)
      ? passwordHashInput
      : password
        ? sha256Hex(password)
        : "";
    if (!transportHash || !(await verifyPassword(transportHash, cred.passwordHash))) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  } else {
    // v1 레거시 — 평문 검증이 필요하다 (클라이언트는 428을 받으면 평문을 함께 재전송).
    if (!password) {
      return NextResponse.json({ legacy: true, error: "레거시 계정 확인이 필요합니다." }, { status: 428 });
    }
    if (!(await verifyPassword(password, cred.passwordHash))) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  }

  await withdrawUser(user.id, new Date().toISOString());
  await clearSession();
  return NextResponse.json({ ok: true });
}
