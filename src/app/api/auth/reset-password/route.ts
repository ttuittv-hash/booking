import { NextResponse } from "next/server";
import {
  findCompletedIdentity,
  findUserByDi,
  findUserByLoginIdWithPasswordHash,
  updateUserPassword,
} from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifyIdentityTicket } from "@/lib/identityTicket";
import { SHA256_HEX_RE } from "@/lib/passwordScheme";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 비밀번호 찾기 (기획서 A13 · 1-47).
// 아이디 입력 → 본인인증 → 새 비밀번호 직접 입력.
//
// 메일 링크 방식이 아니므로 인증 티켓이 곧 재설정 권한이다. 그래서
//   - 티켓은 10분짜리이고(identityTicket)
//   - 인증한 본인의 DI 와 입력한 아이디의 주인이 같은지 반드시 대조한다.
// 이 대조를 빼먹으면 아무나 인증만 하고 남의 아이디 비밀번호를 바꿀 수 있다.
export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`reset-pw:${ip}`, 5, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const ticket = typeof body?.identityTicket === "string" ? body.identityTicket : "";
  const passwordHash = typeof body?.passwordHash === "string" ? body.passwordHash.toLowerCase() : "";

  if (!username || !SHA256_HEX_RE.test(passwordHash)) {
    return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });
  }

  const payload = await verifyIdentityTicket(ticket);
  if (!payload || payload.purpose !== "RESET_PASSWORD") {
    return NextResponse.json(
      { error: "본인인증 정보가 만료되었습니다. 다시 인증해주세요." },
      { status: 400 },
    );
  }

  const identity = await findCompletedIdentity(payload.verificationId);
  if (!identity?.di) {
    return NextResponse.json({ error: "본인인증 결과를 확인할 수 없습니다." }, { status: 400 });
  }

  const byDi = await findUserByDi(identity.di);
  const byId = await findUserByLoginIdWithPasswordHash(username);
  // 아이디의 주인과 인증한 본인이 같아야 한다.
  if (!byDi || !byId || byDi.id !== byId.id) {
    return NextResponse.json(
      { error: "입력하신 아이디와 인증 정보가 일치하는 회원이 없습니다." },
      { status: 400 },
    );
  }

  await updateUserPassword(byId.id, await hashPassword(passwordHash));
  // 재설정 뒤에는 기존 세션을 모두 무효화해야 한다(기획서 A13).
  // 세션은 서명 토큰이라 서버에 목록이 없다 — 계정의 세션 기준시각을 올려 한 번에 끊는다.
  await bumpSessionEpoch(byId.id);

  return NextResponse.json({ ok: true });
}

async function bumpSessionEpoch(userId: string) {
  const { setSessionEpoch } = await import("@/lib/db");
  await setSessionEpoch(userId, new Date().toISOString());
}
