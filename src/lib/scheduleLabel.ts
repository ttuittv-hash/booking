import type { QuoteSelection } from "./pricing/types";

// [신규 2026-10-01] 관리자 목록·비교 화면의 「주차」 표기 — 운영 신고 "중형인데 7월 1주차로 나온다".
// 중형 단독 신청서의 selection.week 는 위저드의 아레나 기본값이 남은 값이라 실제 날짜와 무관하다
// (승인 충돌 오판의 원인과 같다, db.selectionsOverlap 주석). 중형은 실제로 고른 날짜 범위를 쓴다.
// 날짜는 ISO 문자열을 그대로 잘라 쓴다 — Date 로 바꾸면 KST/UTC 차이로 하루 밀릴 수 있다.

function arenaWeek(sel: QuoteSelection): string {
  return `${sel.week.year}.${sel.week.month} ${sel.week.weekOfMonth}주차`;
}

/** 중형 날짜 범위 — 2027.6.28~6.30 (3일). 날짜가 없으면 "날짜 미선택". */
export function midHallRangeLabel(midHallDays: Record<string, unknown> | undefined | null): string {
  const days = Object.keys(midHallDays ?? {}).sort();
  if (days.length === 0) return "날짜 미선택";
  const fmt = (iso: string, withYear: boolean) => {
    const [y, m, d] = iso.split("-");
    return `${withYear ? `${y}.` : ""}${Number(m)}.${Number(d)}`;
  };
  const first = days[0];
  const last = days[days.length - 1];
  const range = first === last ? fmt(first, true) : `${fmt(first, true)}~${fmt(last, first.slice(0, 4) !== last.slice(0, 4))}`;
  return `${range} (${days.length}일)`;
}

/** 목록·비교용 일정 표기 — 아레나는 주차, 중형은 날짜 범위, 동시 대관은 둘 다. */
export function scheduleLabel(sel: QuoteSelection): string {
  if (sel.bookingMode === "SIMULTANEOUS") return `${arenaWeek(sel)} · 중형 ${midHallRangeLabel(sel.midHallDays)}`;
  if (sel.venueId === "medium-hall") return midHallRangeLabel(sel.midHallDays);
  return arenaWeek(sel);
}
