import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 도메인(호스트명)으로 운영자/신청자 화면을 분리한다.
//   bo.seoularena.net      -> 운영자 백오피스 (/admin/*)
//   partner.seoularena.net -> 신청자(공개) 화면, /admin/* 접근 차단
// Render 기본 도메인(*.onrender.com)이나 로컬 개발 환경 등 그 외 호스트에서는
// 지금까지처럼 경로 그대로 동작한다(하위 호환 — 두 서브도메인이 아직
// 연결되기 전에도 기존 방식으로 계속 쓸 수 있어야 하므로).
//
// 실제 접근 권한(로그인/역할/등급) 검사는 각 페이지·API 라우트에서 그대로
// 이뤄진다 — 여기서는 어느 화면을 보여줄지만 나누는 것이고, 보안 경계가
// 아니다.
const ADMIN_HOST_PREFIX = "bo.";
const APPLICANT_HOST_PREFIX = "partner.";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  if (host.startsWith(ADMIN_HOST_PREFIX)) {
    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (host.startsWith(APPLICANT_HOST_PREFIX)) {
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // 정적 파일(_next/static, _next/image, favicon.ico)과 API 라우트는 호스트별
  // 분기 없이 그대로 통과시킨다 — API는 각자 자기 경로(/api/admin/... 등)로
  // 이미 구분돼 있고, 클라이언트가 항상 현재 접속한 호스트로 상대경로
  // fetch하므로 별도 재작성이 필요 없다.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
