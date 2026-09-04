/**
 * 알림을 눌렀을 때 갈 곳 (2026-09-04).
 *
 * 규칙은 하나뿐이다: 저장된 링크가 있으면 그리로, 없으면 신청서 상세, 그것도 없으면
 * 역할별 첫 화면. 예전에는 이 판단이 종 모양 드롭다운 안에만 있어 규칙을 시험할 수 없었고,
 * 링크 없이 남은 알림(문의 접수·가입 심사)이 운영자 첫 화면으로 떨어지는 걸 놓쳤다.
 */
export type NotificationTarget = { link?: string | null; quoteId?: string | null };

/**
 * 운영자 화면(/admin)과 신청자 화면은 호스트가 다르다 — bo.* 와 partner.* .
 * partner 에서 /admin 으로 가면 앞단이 홈으로 되돌려 보내 "눌러도 아무 일이 없다" 가 된다
 * (운영자가 partner 에 로그인한 채 알림을 누르는 상황, 2026-09-04 제보). 그래서 갈 곳이
 * 다른 호스트면 주소를 그 호스트로 바꿔 준다. 로컬·미지의 호스트는 건드리지 않는다.
 */
export function crossHostHref(path: string, origin?: string): string {
  if (!origin || !path.startsWith("/")) return path;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return path;
  }
  const wantAdmin = path === "/admin" || path.startsWith("/admin/");
  const onAdminHost = host.startsWith("bo.");
  const onPartnerHost = host.startsWith("partner.");
  if (wantAdmin && onPartnerHost) return `https://${host.replace(/^partner\./, "bo.")}${path}`;
  if (!wantAdmin && onAdminHost) return `https://${host.replace(/^bo\./, "partner.")}${path}`;
  return path;
}

export function notificationHref(
  n: NotificationTarget,
  role: "ADMIN" | "APPLICANT",
  origin?: string,
): string {
  const base = role === "ADMIN" ? "/admin" : "/mypage";
  const link = n.link?.trim();
  if (link) {
    // 절대 URL 로 저장돼 있어도 같은 사이트면 경로만 남겨 클라이언트 이동을 쓴다.
    if (!origin) return link;
    try {
      const u = new URL(link, origin);
      return u.origin === origin ? crossHostHref(u.pathname + u.search, origin) : link;
    } catch {
      return link;
    }
  }
  const quoteId = n.quoteId?.trim();
  // 'applicants' 처럼 신청서가 아닌 값이 quoteId 자리에 들어간 옛 알림도 그대로 살린다.
  return crossHostHref(quoteId ? `${base}/${quoteId}` : base, origin);
}

/**
 * 종 아이콘 위 숫자. 9 를 넘으면 '9+' 로만 보여 눌러도 숫자가 그대로인 것처럼 보였다 —
 * 두 자리까지 그대로 세어 하나 읽으면 하나 줄어드는 게 보이게 한다 (2026-09-04).
 */
export function unreadBadgeLabel(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
