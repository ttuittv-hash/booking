import { WEEKDAYS, type QuoteSelection, type WeekDay } from "./types";

// JS Date.getDay(): 0=일 1=월 ... 6=토 → 월(1)을 0번 컬럼으로 매핑 (Step1Calendar와 동일 규칙)
function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isWeekendDate(iso: string): boolean {
  const day = new Date(iso).getDay();
  return day === 0 || day === 6;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 선택된 주(화~일 시작)의 화요일 실제 날짜 — Step1Calendar의 buildCalendarWeeks와 동일한 규칙으로 계산한다.
export function findWeekTuesday(week: QuoteSelection["week"]): Date | null {
  const firstOfMonth = new Date(week.year, week.month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(week.year, week.month - 1, 1 - firstCol);

  let counter = 0;
  for (let w = 0; w < 6; w++) {
    const tuesday = new Date(gridStart);
    tuesday.setDate(gridStart.getDate() + w * 7 + 1);
    if (tuesday.getMonth() === week.month - 1) {
      counter++;
      if (counter === week.weekOfMonth) return tuesday;
    }
  }
  return null;
}

// [신규 2026-09-06] 동시 대관(아레나+중형) 2주 윈도우 검증 — "아레나/중형 중 둘중
// 최초 시작 일정 기준 2주 안에서 신청 가능해야해". 두 시작일(아레나 화요일 / 중형
// 최초 확정 날짜) 사이 간격이 14일을 넘으면 위반이다. 한쪽이 아직 비어 있으면(중형
// 미선택) 검증할 대상이 없으므로 위반이 아니다 — "둘 다 선택했는지"는 별도 게이트가 막는다.
export function simultaneousWindowGapDays(
  week: QuoteSelection["week"],
  midHallDays: Record<string, unknown>,
): number | null {
  const midHallDates = Object.keys(midHallDays).sort();
  if (midHallDates.length === 0) return null;
  const arenaStart = findWeekTuesday(week);
  if (!arenaStart) return null;
  const midHallStart = new Date(midHallDates[0]);
  const gapMs = Math.abs(midHallStart.getTime() - arenaStart.getTime());
  return Math.round(gapMs / (1000 * 60 * 60 * 24));
}

export const SIMULTANEOUS_WINDOW_MAX_DAYS = 14;

// 실제 대관 예정 날짜 목록 (제외 요일 제거 + 추가 일수 포함), 화요일부터 순서대로 ISO 날짜 문자열로 반환한다.
export function resolveSelectedDates(
  selection: Pick<QuoteSelection, "week" | "excludedDays" | "extraDays">,
): string[] {
  const tuesday = findWeekTuesday(selection.week);
  if (!tuesday) return [];
  const dates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const day = WEEKDAYS[i] as WeekDay;
    if (!selection.excludedDays.includes(day)) dates.push(isoDate(addDays(tuesday, i)));
  }
  for (let i = 0; i < selection.extraDays; i++) {
    dates.push(isoDate(addDays(tuesday, 6 + i)));
  }
  return dates;
}
