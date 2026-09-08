import { WEEKDAYS, type DayTag, type QuoteSelection, type WeekDay } from "./types";
import { defaultDayTags } from "./rateTableUtils";

// JS Date.getDay(): 0=일 1=월 ... 6=토 → 월(1)을 0번 컬럼으로 매핑 (Step1Calendar와 동일 규칙)
function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// [개정 2026-09-07] 중형공연장 요금표 안내("평일: 월요일~목요일 / 주말: 금요일~일요일")에
// 맞춰 금요일도 주말 단가로 과금한다 — 토·일만 주말로 보던 일반적 정의와 다르다.
// 이 함수는 중형공연장 전용(dateRange.ts 다른 곳/아레나 요일 태깅은 별도 로직)이라
// 다른 화면에 영향 없다.
export function isWeekendDate(iso: string): boolean {
  const day = new Date(iso).getDay();
  return day === 0 || day === 5 || day === 6;
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

  // [신규 2026-09-08] 0주차 = 화요일이 전달에 걸린 첫 행(Step1Calendar.buildCalendarWeeks 와 짝).
  // 그 행의 화요일이 이미 이 달 안이면 0주차는 존재하지 않는다.
  if (week.weekOfMonth === 0) {
    const tuesday = new Date(gridStart);
    tuesday.setDate(gridStart.getDate() + 1);
    return tuesday.getMonth() === week.month - 1 ? null : tuesday;
  }

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

// [재개정 2026-09-08] "동시대관은 동일 기간에만 세팅 가능하다는 안내가 들어가야함
// 14일 기준이 아니라" — 예전엔 두 시작일 간격이 14일 이내면 통과였는데(2주 윈도우),
// 그 규칙을 버리고 "중형 일정은 아레나가 실제로 잡은 날짜 범위(최소~최대) 안에서만
// 세팅 가능"으로 바꾼다. 범위를 벗어난 중형 날짜만 골라 반환한다(빈 배열 = 문제 없음).
// 아레나 쪽이 아직 아무 날짜도 없으면(이론상 발생하지 않지만 방어적으로) 중형 날짜를
// 전부 범위 밖으로 본다.
export function midHallDatesOutsideArenaRange(
  arenaSelection: Pick<QuoteSelection, "week" | "excludedDays" | "extraDays">,
  midHallDays: Record<string, unknown>,
): string[] {
  const midHallDates = Object.keys(midHallDays);
  if (midHallDates.length === 0) return [];
  const arenaDates = resolveSelectedDates(arenaSelection);
  if (arenaDates.length === 0) return midHallDates.sort();
  const start = arenaDates[0];
  const end = arenaDates[arenaDates.length - 1];
  return midHallDates.filter((d) => d < start || d > end).sort();
}

// [신규 2026-09-08] "화/일만 아무것도 없이 해제 가능하고 중간은 무조건 뭐라도
// 세팅이 되어야함 — 패키지 중간을 비울 수는 없음" — 기본 6일 중 가운데 4일
// (수목금토)은 제외할 수 없는 패키지 고정 구간이라, 명시 지정(dayTags) 없이
// 묵시적 기본값에만 의존한 채로 두면 신청 진행을 막는다. 양 끝(화·일)은 명시
// 지정이 없어도(=제외) 유효한 상태라 검사하지 않는다.
export function arenaMiddleBaseDaysIncomplete(
  selection: Pick<QuoteSelection, "week" | "excludedDays" | "dayTags">,
): boolean {
  const tuesday = findWeekTuesday(selection.week);
  if (!tuesday) return false;
  return WEEKDAYS.slice(1, 5).some((weekday, idx) => {
    if (selection.excludedDays.includes(weekday)) return false;
    const iso = isoDate(addDays(tuesday, idx + 1));
    return !selection.dayTags[iso];
  });
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
    if (!selection.excludedDays.includes(day))
      dates.push(isoDate(addDays(tuesday, i)));
  }
  for (let i = 0; i < selection.extraDays; i++) {
    dates.push(isoDate(addDays(tuesday, 6 + i)));
  }
  return dates;
}

// [신규 2026-09-08] "동시대관 > All in One 만 캘린더 진입 시 노란색 박스만, 그 외 대관 유형은
// 각 날짜별 기본 일정(준비 4일 + 공연 2일)이 반영된 상태로 노출"(nora) — 화~일 기본 6일
// (제외 요일 제외)에 패키지 기본 태그를 **실제 값**으로 채운다. 배지 노출·「다음」 검증
// (arenaMiddleBaseDaysIncomplete)·화/일 「삭제」 동작이 전부 명시 태그(dayTags) 기준이라
// 화면만 흉내 내면 "보이는데 다음으로 못 간다"가 된다. 연장일(extraDays)은 넣지 않는다.
export function prefilledBaseDayTags(
  selection: Pick<QuoteSelection, "week" | "excludedDays">,
  defaultPerformanceDays: number,
): Record<string, DayTag> {
  return defaultDayTags(resolveSelectedDates({ ...selection, extraDays: 0 }), defaultPerformanceDays);
}
