/* ============================================================================
   공개 시점 게이트

   OR 시스템요약은 공개 시점을 대관공고(8/20) · 대관오픈(9/1) 두 단계로 나눠
   항목마다 공개 여부를 지정한다. 8/20 사이트의 일은 공고이고, 신청 시스템은 9/1 에 열린다.

   미공개 항목은 **라우트를 살리고 "9/1 공개" 안내 화면으로 대체**한다.
   메뉴에서 숨기지 않는다 — 북마크·검색 유입·공유 링크가 죽지 않게 하고,
   8/20 방문자에게 무엇이 언제 열리는지 알리는 가장 싼 수단이기 때문이다.
   ========================================================================= */

export type ReleasePhase = "notice" | "open";

/** 각 단계가 열리는 날짜 (Asia/Seoul 기준 자정) */
export const RELEASE_DATES: Record<ReleasePhase, string> = {
  notice: "2026-08-20",
  open: "2026-09-01",
};

export const OPEN_PHASE_LABEL = "9월 1일 공개";
export const OPEN_PHASE_BADGE = "9/1 공개";

/**
 * 서울 기준 오늘 날짜(YYYY-MM-DD).
 * 서버 타임존이 UTC 여도 한국 자정에 맞춰 열리게 한다.
 */
function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * 미리보기·검수용 강제 전환.
 *   SEOUL_ARENA_RELEASE_PHASE=open   → 9/1 화면을 미리 본다
 *   SEOUL_ARENA_RELEASE_PHASE=notice → 8/20 화면으로 되돌린다
 */
function forcedPhase(): ReleasePhase | null {
  const v = process.env.SEOUL_ARENA_RELEASE_PHASE;
  return v === "open" || v === "notice" ? v : null;
}

export function isReleased(phase: ReleasePhase): boolean {
  const forced = forcedPhase();
  if (forced) return forced === "open" || phase === "notice";
  return todaySeoul() >= RELEASE_DATES[phase];
}

/** 9/1 대관오픈 이후인가 — 위저드·내 신청 내역·제원·부대시설의 잠금 해제 조건 */
export function isRentalOpen(): boolean {
  return isReleased("open");
}
