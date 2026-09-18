// [신규 2026-09-18] 「접수 마감」 판정을 두는 한 곳.
//
// 마감은 코드가 아니라 백오피스 스위치다 — 콘텐츠 관리 → 화면 문구 → 「BOOK IT 「오픈
// 예정」 안내」 체크박스(`site_content.screenText.bookItNotice.enabled`). 그래서 판정이
// 화면마다 흩어지기 쉽고, 실제로 그랬다:
//
//   · 처음엔 `/apply` 한 곳만 막혀 있었다 → 마이페이지 「수정하기」로 들어가 마감 후에도
//     신청서를 고칠 수 있었다(2026-09-18 운영진 신고, `3346e6b` 로 그 화면도 막음).
//   · 그 뒤에도 `PUT /api/quotes/[id]` 는 그대로 뚫려 있었다 → 버튼을 감춰도 API 를 직접
//     호출하면 수정이 됐다(마감 직전 접수자는 접수 후 24시간 동안).
//
// 두 번 다 "막는 길이 하나 더 있었다"가 원인이다. 길이 늘 때마다 판정을 다시 쓰면 또
// 빠뜨리므로, 판정은 여기서만 하고 화면·API 가 같이 쓴다.
//
// 운영자 예외는 **호출하는 쪽**에서 건다 — 화면은 리다이렉트, API 는 409 로 응답이 달라야
// 하고, 운영자를 통과시킬지도 경로마다 다를 수 있기 때문이다(지금은 셋 다 통과시킨다).
import { NAV_ACTION_HIDDEN } from "@/components/ui/nav-items";
import { getScreenTextContent } from "@/lib/db";

export async function isBookingClosed(): Promise<boolean> {
  // NAV_ACTION_HIDDEN 이면 콘텐츠를 읽을 것도 없이 닫힌 상태다 — 불필요한 조회를 아낀다.
  if (NAV_ACTION_HIDDEN) return true;
  return !!(await getScreenTextContent()).bookItNotice?.enabled;
}
