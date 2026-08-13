import { NextResponse } from "next/server";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { findUserByLoginIdWithPasswordHash, updateUserPassword } from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 클라이언트는 비밀번호를 SHA-256으로 해시한 passwordHash를 보낸다 (평문 미전송).
// SQLite 시절 이관된 레거시(v1) 계정은 서버가 평문 없이는 검증할 수 없으므로 428을
// 돌려주고, 클라이언트가 평문을 1회 함께 재전송하면 검증 후 v2로 자동 승격한다.
export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`login:${ip}`, 20, 5 * 60 * 1000))) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const passwordHashInput = typeof body?.passwordHash === "string" ? body.passwordHash.toLowerCase() : "";
  const passwordPlain = typeof body?.password === "string" ? body.password : "";

  // 전송용 해시가 없으면(구형 클라이언트/직접 API 호출) 평문에서 서버측 계산으로 보완한다.
  const transportHash = SHA256_HEX_RE.test(passwordHashInput)
    ? passwordHashInput
    : passwordPlain
      ? sha256Hex(passwordPlain)
      : "";
  if (!username || !transportHash) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  if (!(await rateLimit(`login:id:${username.toLowerCase()}`, 10, 5 * 60 * 1000))) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const user = await findUserByLoginIdWithPasswordHash(username);
  if (!user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.passwordScheme === "v2") {
    if (!(await verifyPassword(transportHash, user.passwordHash))) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  } else {
    // v1 레거시 — 평문 검증이 필요하다.
    if (!passwordPlain) {
      return NextResponse.json({ legacy: true, error: "레거시 계정 확인이 필요합니다." }, { status: 428 });
    }
    if (!(await verifyPassword(passwordPlain, user.passwordHash))) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    // 검증 성공 — 현행 스킴(bcrypt(sha256(비밀번호)))으로 자동 승격
    await updateUserPassword(user.id, await hashPassword(transportHash));
  }

  await createSession(user.id, user.role);
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
