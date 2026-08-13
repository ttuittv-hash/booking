import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { findUserPasswordHash, updateUserPassword } from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const currentPasswordHash =
    typeof body?.currentPasswordHash === "string" ? body.currentPasswordHash.toLowerCase() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPasswordHash =
    typeof body?.newPasswordHash === "string" ? body.newPasswordHash.toLowerCase() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  // 새 비밀번호: 클라이언트 해시 우선, 평문 폴백(직접 API 호출) 시 길이 검증
  let newTransportHash = "";
  if (SHA256_HEX_RE.test(newPasswordHash)) {
    newTransportHash = newPasswordHash;
  } else if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }
    newTransportHash = sha256Hex(newPassword);
  }
  if (!newTransportHash) {
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const cred = await findUserPasswordHash(user.id);
  if (!cred) {
    return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  if (cred.passwordScheme === "v2") {
    const currentTransportHash = SHA256_HEX_RE.test(currentPasswordHash)
      ? currentPasswordHash
      : currentPassword
        ? sha256Hex(currentPassword)
        : "";
    if (!currentTransportHash || !(await verifyPassword(currentTransportHash, cred.passwordHash))) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  } else {
    // v1 레거시 — 현재 비밀번호는 평문 검증이 필요하다 (클라이언트는 428을 받으면 평문을 함께 재전송).
    if (!currentPassword) {
      return NextResponse.json({ legacy: true, error: "레거시 계정 확인이 필요합니다." }, { status: 428 });
    }
    if (!(await verifyPassword(currentPassword, cred.passwordHash))) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  }

  await updateUserPassword(user.id, await hashPassword(newTransportHash));
  return NextResponse.json({ ok: true });
}
