import { NextResponse } from "next/server";
import { completeIdentityVerification, findUserByDi, takeIdentityPending } from "@/lib/db";
import { fetchAuthResult } from "@/lib/niceAuth";
import { signIdentityTicket } from "@/lib/identityTicket";

// 표준창 인증 완료 후 NICE 가 이 주소로 되돌려 보낸다(기획서 A4 인증 시퀀스 5단계).
//
// 팝업 안에서 열리는 화면이라 JSON 을 돌려줘도 사용자는 보지 못한다.
// 결과를 부모 창에 postMessage 로 넘기고 스스로 닫는 작은 HTML 을 응답한다.
export async function GET(request: Request, context: { params: Promise<{ nonce: string }> }) {
  const { nonce } = await context.params;
  const webTransactionId = new URL(request.url).searchParams.get("web_transaction_id") ?? "";
  if (!webTransactionId) {
    return html({ ok: false, message: "인증이 완료되지 않았습니다." });
  }

  const pending = await takeIdentityPending(nonce);
  if (!pending) {
    return html({ ok: false, message: "인증 요청을 찾을 수 없거나 이미 처리되었습니다." });
  }

  try {
    const result = await fetchAuthResult(
      { accessToken: pending.accessToken, ticket: pending.ticket, iterations: pending.iterations },
      { webTransactionId, transactionId: pending.transactionId, requestNo: pending.requestNo },
    );

    await completeIdentityVerification(pending.id, {
      succeeded: true,
      resultCode: "0000",
      name: result.identity.name,
      birthdate: result.identity.birthdate,
      gender: result.identity.gender,
      nationalInfo: result.identity.nationalInfo,
      mobileCo: result.identity.mobileCo,
      mobileNo: result.identity.mobileNo,
      ci: result.identity.ci,
      di: result.identity.di,
    });

    // 이미 그 DI 로 가입한 계정이 있으면 가입을 이어가지 않는다(기획서 1-28).
    // 다만 **반려된 신청은 가입이 아니다** — 그 사람은 다시 신청할 수 있어야 한다(R5).
    // 예전에는 여기서 먼저 막혀, 반려 통보를 받은 사람이 재신청 자체를 못 했다
    // (가입 API 쪽에는 이미 반려 예외가 있었는데 본인인증 단계에서 걸렸다, 2026-09-02).
    // role !== "ADMIN" — 가입 API 의 명의 중복확인과 같은 예외다(2026-09-04).
    const existing = await findUserByDi(result.identity.di);
    if (
      existing &&
      existing.role !== "ADMIN" &&
      existing.approvalStatus !== "REJECTED" &&
      pending.purpose === "REGISTER"
    ) {
      return html({
        ok: false,
        duplicated: true,
        message: "이미 가입된 명의입니다. 아이디 찾기로 진행해주세요.",
      });
    }

    // 인증 결과를 클라이언트에 그대로 내려주지 않는다 — 손대서 다시 올릴 수 있기 때문이다.
    // 서명된 짧은 티켓만 주고, 가입 API 가 그 티켓으로 서버 쪽 이력을 되읽는다.
    const ticket = await signIdentityTicket({
      verificationId: pending.id,
      purpose: pending.purpose,
      name: result.identity.name,
      mobileNo: result.identity.mobileNo ?? "",
    });

    return html({
      ok: true,
      ticket,
      name: result.identity.name,
      mobileNo: result.identity.mobileNo,
      mobileCo: result.identity.mobileCo,
    });
  } catch (error) {
    await completeIdentityVerification(pending.id, {
      succeeded: false,
      resultCode: "ERROR",
      resultMessage: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    return html({
      ok: false,
      message: error instanceof Error ? error.message : "본인인증에 실패했습니다.",
    });
  }
}

function html(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>본인인증</title>
<body style="font-family:system-ui;padding:24px;text-align:center">
<p data-testid="nice-callback-message">${payload.ok ? "본인인증이 완료되었습니다." : "본인인증이 완료되지 않았습니다."}</p>
<script>
  (function () {
    var payload = ${json};
    try {
      window.opener && window.opener.postMessage({ source: "nice-auth", payload: payload }, window.location.origin);
    } catch (e) {}
    setTimeout(function () { window.close(); }, 300);
  })();
</script></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
