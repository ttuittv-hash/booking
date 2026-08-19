import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { issueAccessToken, issueAuthUrl, isNiceAuthConfigured } from "@/lib/niceAuth";
import { saveIdentityPending } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 본인인증 시작 — 표준창 팝업 URL 을 발급한다(기획서 A4).
//
// 세션 상태를 프로세스 메모리에 두면 pod 가 여러 개일 때 콜백이 다른 pod 로 가서 깨진다.
// 그래서 진행 중인 인증 건을 DB(identity_verifications)에 남기고, 콜백에서 다시 읽는다.
export async function POST(request: Request) {
  if (!isNiceAuthConfigured()) {
    return NextResponse.json(
      { error: "본인인증이 설정되지 않았습니다. 운영자에게 문의해주세요." },
      { status: 503 },
    );
  }

  const ip = clientIpFrom(request);
  if (!(await rateLimit(`nice-start:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const purpose =
    body?.purpose === "FIND_ID" || body?.purpose === "RESET_PASSWORD" ? body.purpose : "REGISTER";

  const origin = new URL(request.url).origin;
  // 콜백 상관관계 키. NICE 는 완료 시 web_transaction_id 만 돌려주므로 우리 쪽 진행 건을
  // 특정할 수단이 없다. return_url 경로에 nonce 를 박아 두면 동시 가입자끼리 섞이지 않는다.
  const nonce = crypto.randomUUID();
  try {
    const token = await issueAccessToken();
    const issued = await issueAuthUrl(
      token,
      `${origin}/api/auth/nice/callback/${nonce}`,
      `${origin}/register`,
    );

    // 콜백에서 결과를 조회하려면 토큰·티켓·반복횟수가 필요하다.
    // ticket 은 복호화 키의 씨앗이므로 평문으로 두지 않는다.
    await saveIdentityPending({
      id: crypto.randomUUID(),
      nonce,
      requestNo: issued.requestNo,
      transactionId: issued.transactionId,
      purpose,
      accessToken: token.accessToken,
      ticket: token.ticket,
      iterations: token.iterations,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ authUrl: issued.authUrl, transactionId: issued.transactionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "본인인증을 시작하지 못했습니다." },
      { status: 502 },
    );
  }
}
