import { NextResponse } from "next/server";
import { findCompletedIdentity, findUserByDi, maskUsername } from "@/lib/db";
import { verifyIdentityTicket } from "@/lib/identityTicket";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 아이디 찾기 (기획서 A13 · 1-46).
// 휴대폰 본인인증을 거친 뒤 일치하는 아이디를 마스킹해 보여준다.
// 전체를 그대로 노출하면 아이디 수집이 가능해지므로 앞뒤만 남기고, 시도 횟수도 제한한다.
export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`find-id:${ip}`, 5, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const ticket = typeof body?.identityTicket === "string" ? body.identityTicket : "";
  const payload = await verifyIdentityTicket(ticket);
  if (!payload || payload.purpose !== "FIND_ID") {
    return NextResponse.json(
      { error: "본인인증 정보가 만료되었습니다. 다시 인증해주세요." },
      { status: 400 },
    );
  }

  const identity = await findCompletedIdentity(payload.verificationId);
  if (!identity?.di) {
    return NextResponse.json({ error: "본인인증 결과를 확인할 수 없습니다." }, { status: 400 });
  }

  const user = await findUserByDi(identity.di);
  if (!user) {
    // 계정 존재 여부를 흐리지 않는다 — 본인인증을 통과한 본인에게만 답하는 화면이라
    // 여기서는 "없다"고 알려주는 편이 사용자에게 이롭다.
    return NextResponse.json({ found: false, message: "입력하신 정보와 일치하는 아이디가 없습니다." });
  }

  return NextResponse.json({ found: true, maskedUsername: maskUsername(user.username) });
}
