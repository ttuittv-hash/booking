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

// 동시 대관 겹침 계산 — 아레나 확정 기간 ∩ 중형 선택일. 금액에는 영향을 주지 않고
// 안전관리계획서 기준 인원 산정에만 쓰인다(기능정의 2-33/2-34, 화면시나리오 SCREEN 04/12).
export function overlapDates(arenaDates: string[], midHallDates: string[]): string[] {
  const arenaSet = new Set(arenaDates);
  return midHallDates.filter((d) => arenaSet.has(d));
}
