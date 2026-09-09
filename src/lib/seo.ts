// 검색엔진 노출(robots.txt · sitemap.xml)에서 쓰는 호스트 판별 (2026-09-09).
//
// publicUrl.ts 의 publicOrigin() 은 초대·인증 링크를 만드는 용도라 Request 를 받고
// 허용 목록 밖 호스트는 기본값으로 되돌린다. 여기서는 호스트 문자열만 보고 "이 응답을
// 어느 사이트 것으로 줄지"만 정하면 되므로 얇은 함수 두 개로 나눠 둔다.

const ADMIN_HOST_PREFIX = "bo.";

/** 백오피스(bo.*) 호스트인가 — 색인 전면 차단 대상. */
export function isAdminHost(host: string): boolean {
  return host.startsWith(ADMIN_HOST_PREFIX);
}

/** sitemap·robots 에 적을 사이트 주소. 알 수 없는 호스트는 운영 신청자 주소로 갈음한다. */
export function publicSiteOrigin(host: string): string {
  const clean = host.split(",")[0].trim();
  if (/^(partner|bo)\.(dev\.)?seoularena\.net$/.test(clean)) return `https://${clean}`;
  return "https://partner.seoularena.net";
}
