import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/publicUrl";
import crypto from "node:crypto";
import { issueAccessToken, issueAuthUrl, isNiceAuthConfigured } from "@/lib/niceAuth";
import { saveIdentityPending, saveStubIdentity } from "@/lib/db";
import { signIdentityTicket } from "@/lib/identityTicket";
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

  const origin = publicOrigin(request);

  // ── 개발 환경 전용 스텁 ───────────────────────────────────────────────
  // 표준창 인증은 실제 사람이 휴대폰으로 해야 해서 E2E 로 자동화할 수 없다.
  // dev 에서만 인증을 통과시킨 것처럼 처리해 뒤 단계를 검증한다.
  //
  // 두 겹으로 잠근다 — 환경변수가 있어야 하고, 요청 헤더의 값이 그 환경변수와
  // 정확히 같아야 한다. 환경변수만으로 열면 실수로 운영에 들어갔을 때
  // 본인인증이 통째로 무력해진다. 운영 매니페스트에는 이 변수를 넣지 않는다.
  // 자동화(E2E)는 헤더로, 사람이 브라우저로 볼 때는 쿠키로 연다.
  // 어느 쪽이든 NICE_AUTH_DEV_STUB 과 정확히 같은 값을 들고 와야 한다.
  const stubSecret = process.env.NICE_AUTH_DEV_STUB;
  const stubHeader = request.headers.get("x-dev-stub");
  const stubCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("dev_stub="))
    ?.slice("dev_stub=".length);
  // 화면의 "개발용 우회" 버튼은 본문 플래그로 들어온다. 환경변수가 있는 곳에서만 열린다.
  const devBypass = body?.devBypass === true;
  if (stubSecret && (stubHeader === stubSecret || stubCookie === stubSecret || devBypass)) {
    const id = crypto.randomUUID();
    const seed = crypto.randomBytes(12).toString("hex");
    await saveStubIdentity({
      id,
      name: body?.stubName || "테스트사용자",
      mobileNo: body?.stubPhone || "0100000" + seed.slice(0, 4),
      di: "STUB-DI-" + seed,
      ci: "STUB-CI-" + seed,
      purpose,
      createdAt: new Date().toISOString(),
    });
    const ticket = await signIdentityTicket({
      verificationId: id,
      purpose,
      name: body?.stubName || "테스트사용자",
      mobileNo: body?.stubPhone || "0100000" + seed.slice(0, 4),
    });
    return NextResponse.json({
      stub: true,
      ticket,
      name: body?.stubName || "테스트사용자",
      mobileNo: body?.stubPhone || "0100000" + seed.slice(0, 4),
    });
  }

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
    console.error("[nice/start]", error);
    return NextResponse.json(
      // 원문 오류는 서버 로그에만 — 외부 연동 오류 문구가 화면으로 새지 않게 (보안 점검 2026-09-04)
      { error: "본인인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
