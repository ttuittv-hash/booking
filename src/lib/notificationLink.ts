/**
 * 알림을 눌렀을 때 갈 곳 (2026-09-04).
 *
 * 규칙은 하나뿐이다: 저장된 링크가 있으면 그리로, 없으면 신청서 상세, 그것도 없으면
 * 역할별 첫 화면. 예전에는 이 판단이 종 모양 드롭다운 안에만 있어 규칙을 시험할 수 없었고,
 * 링크 없이 남은 알림(문의 접수·가입 심사)이 운영자 첫 화면으로 떨어지는 걸 놓쳤다.
 */
export type NotificationTarget = { link?: string | null; quoteId?: string | null };

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
      return u.origin === origin ? u.pathname + u.search : link;
    } catch {
      return link;
    }
  }
  const quoteId = n.quoteId?.trim();
  // 'applicants' 처럼 신청서가 아닌 값이 quoteId 자리에 들어간 옛 알림도 그대로 살린다.
  return quoteId ? `${base}/${quoteId}` : base;
}

/**
 * 종 아이콘 위 숫자. 9 를 넘으면 '9+' 로만 보여 눌러도 숫자가 그대로인 것처럼 보였다 —
 * 두 자리까지 그대로 세어 하나 읽으면 하나 줄어드는 게 보이게 한다 (2026-09-04).
 */
export function unreadBadgeLabel(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
