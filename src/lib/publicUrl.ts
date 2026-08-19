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
