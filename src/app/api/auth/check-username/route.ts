import { NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

/** 로그인 ID 규칙 — 5~20자 영문·숫자 (기획서 1-32). */
export const USERNAME_RE = /^[a-zA-Z0-9]{5,20}$/;

// 아이디 중복확인 (기획서 A5).
// 아이디 존재 여부를 알려주는 API 라 훑기에 쓰일 수 있다 — 호출 수를 제한한다.
export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`check-username:${ip}`, 30, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({
      available: false,
      message: "5~20자의 영문·숫자 조합으로 입력해 주세요.",
    });
  }
  const taken = await findUserByUsername(username);
  return NextResponse.json({
    available: !taken,
    message: taken ? "이미 사용 중인 아이디입니다." : "사용할 수 있는 아이디입니다.",
  });
}
