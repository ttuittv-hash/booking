import { NextResponse } from "next/server";

// 개발 환경에서 본인인증을 건너뛰기 위한 스위치.
//
// 표준창 인증은 실제 사람이 휴대폰으로 해야 해서 브라우저로 흐름을 훑어보려면 막힌다.
// 이 주소에 시크릿을 들고 오면 쿠키를 심어주고, 이후 인증 단계가 통과된 것처럼 진행된다.
//
// 잠금은 그대로 두 겹이다 — NICE_AUTH_DEV_STUB 환경변수가 있어야 하고,
// 그 값과 정확히 같은 토큰을 들고 와야 한다. 운영 매니페스트에는 이 변수가 없다.
const COOKIE = "dev_stub";

export async function GET(request: Request) {
  const secret = process.env.NICE_AUTH_DEV_STUB;
  const token = new URL(request.url).searchParams.get("token");

  if (!secret) {
    return NextResponse.json(
      { error: "이 환경에서는 사용할 수 없습니다." },
      { status: 404 },
    );
  }
  if (token !== secret) {
    // 값이 틀리면 존재 자체를 알리지 않는다.
    return NextResponse.json({ error: "이 환경에서는 사용할 수 없습니다." }, { status: 404 });
  }

  const off = new URL(request.url).searchParams.get("off") === "1";
  const res = NextResponse.json({
    ok: true,
    stub: !off,
    message: off
      ? "본인인증 건너뛰기를 껐습니다. 이제 실제 표준창 인증이 뜹니다."
      : "본인인증 건너뛰기를 켰습니다. 이 브라우저에서만 적용됩니다.",
  });
  if (off) {
    res.cookies.delete(COOKIE);
  } else {
    res.cookies.set(COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }
  return res;
}
