// 사용자에게 전달될 절대 URL(초대 링크·인증 콜백 등)을 만든다.
//
// 게이트웨이 뒤에서는 request.url 이 내부 주소(http://localhost:3000)로 잡힌다.
// 그 값으로 링크를 만들면 받는 사람이 열 수 없는 주소가 나간다 —
// 프록시가 붙여주는 X-Forwarded-* 를 우선 보고, 없으면 Host 헤더, 그다음 request.url 순이다.

export function publicOrigin(request: Request): string {
  const h = request.headers;
  const envBase = process.env.PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");

  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host");
  if (host) {
    // 프록시가 TLS 를 종단하므로 프로토콜은 헤더를 믿는다. 없으면 https 로 본다
    // (운영·개발 모두 게이트웨이 뒤 https 다).
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

/**
 * 링크를 "받는 사람이 쓰는 화면"의 주소로 만든다.
 *
 * bo/partner 가 호스트로 갈리므로, 보내는 쪽 호스트를 그대로 쓰면 엉뚱한 데로 간다 —
 * 운영자가 승인을 눌렀다고 해서 신청자에게 bo 주소를 보내면 그 경로는 404 다.
 * 수신자가 운영자면 bo, 신청자면 partner 로 맞춘다.
 */
export type LinkAudience = "APPLICANT" | "ADMIN";

export function audienceOrigin(request: Request, audience: LinkAudience): string {
  const explicit =
    audience === "ADMIN" ? process.env.PUBLIC_ADMIN_BASE_URL : process.env.PUBLIC_PARTNER_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const origin = publicOrigin(request);
  try {
    const url = new URL(origin);
    const want = audience === "ADMIN" ? "bo." : "partner.";
    const other = audience === "ADMIN" ? "partner." : "bo.";
    if (url.hostname.startsWith(want)) return origin;
    if (url.hostname.startsWith(other)) {
      url.hostname = want + url.hostname.slice(other.length);
      return url.origin;
    }
    // bo/partner 로 갈리지 않는 환경(로컬 등)은 경로 기반이라 그대로 쓴다.
    return origin;
  } catch {
    return origin;
  }
}
