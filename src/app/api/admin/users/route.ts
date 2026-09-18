import { NextResponse } from "next/server";
import { EMAIL_RE, USERNAME_HINT, USERNAME_RE } from "@/lib/validation";
import crypto from "node:crypto";
import { getCurrentUser, hashPassword, isMasterAdmin } from "@/lib/auth";
import { createUser, findUserByEmailWithPasswordHash, findUserByUsername, listUsers } from "@/lib/db";
import { sha256Hex } from "@/lib/passwordScheme";

/** 하이픈 있는 형태만 받는다 — 저장 형식을 하나로 두어야 발송 쪽에서 갈리지 않는다 */
const PHONE_RE = /^01[016789]-\d{3,4}-\d{4}$/;
// [수정 2026-09-18] 로컬 USERNAME_RE 를 지우고 정본(validation.ts)을 쓴다 — 옛 패턴은
// 밑줄과 4자를 허용해, 여기서 만든 계정이 다른 화면에서는 거부되는 아이디를 가졌다.

export async function GET() {
  const user = await getCurrentUser();
  // [신규 2026-09-06] "마스터 관리자: 다 가능하고 계정 권한 변경" — 운영자 계정
  // 목록 조회·생성은 계정 권한과 직결되므로 마스터 전용으로 좁힌다.
  if (!user || !isMasterAdmin(user)) {
    return NextResponse.json({ error: "마스터 관리자 로그인이 필요합니다." }, { status: 403 });
  }
  return NextResponse.json({ users: await listUsers({ role: "ADMIN" }) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  // [신규 2026-09-06] "마스터 관리자: 다 가능하고 계정 권한 변경" — 운영자 계정
  // 목록 조회·생성은 계정 권한과 직결되므로 마스터 전용으로 좁힌다.
  if (!user || !isMasterAdmin(user)) {
    return NextResponse.json({ error: "마스터 관리자 로그인이 필요합니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  // 알림톡 수신번호 — 없으면 그 운영자는 알림톡을 못 받는다. 필수는 아니지만
  // 형식이 어긋나면 발송 때 조용히 실패하므로 여기서 막는다(2026-09-02).
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: `아이디는 ${USERNAME_HINT}이어야 합니다.` },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  }
  if (phone && !PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "휴대폰 번호는 010-1234-5678 형식으로 입력하세요." },
      { status: 400 },
    );
  }
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  if (await findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const created = await createUser({
    id: crypto.randomUUID(),
    username,
    email,
    phone: phone || null,
    passwordHash: await hashPassword(sha256Hex(password)),
    name,
    companyName: null,
    role: "ADMIN",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ user: created });
}
