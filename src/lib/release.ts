/* ============================================================================
   대관 신청 접수 개시 게이트

   대관 신청 접수는 2026년 9월 1일에 시작한다. 그 전에는 `/apply` 가 위저드 대신
   접수 개시 전 안내 화면을 보여준다. 라우트는 같고 화면만 바뀐다.

   미리보기·검수는 `SEOUL_ARENA_APPLY_OPEN=true|false` 로 강제 전환한다.
   ========================================================================= */

export const APPLY_OPEN_DATE = "2026-09-01";
export const APPLY_OPEN_LABEL = "2026년 9월 1일";

/** 서울 기준 오늘 날짜(YYYY-MM-DD). 서버 타임존이 UTC 여도 한국 자정에 맞춰 열린다. */
function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isApplyOpen(): boolean {
  const forced = process.env.SEOUL_ARENA_APPLY_OPEN;
  if (forced === "true") return true;
  if (forced === "false") return false;
  return todaySeoul() >= APPLY_OPEN_DATE;
}
