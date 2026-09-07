"use client";

import { ICON_BTN_SM, toggleClass } from "@/components/ui/kit";

import { useState } from "react";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { canStepMonth, toMonthKey } from "@/lib/content/noticeCalendarWindow";
import {
  WEEKDAYS,
  type DateBlock,
  type DayTag,
  type MidHallDayRole,
  type MidHallDaySelection,
  type QuoteSelection,
  type WeekDay,
  type WeekDemand,
} from "@/lib/pricing/types";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"]; // 달력은 월요일부터 시작, 대관 단위는 화~일 (월요일은 대관 불가 기본값)
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

// JS Date.getDay(): 0=일 1=월 ... 6=토 → 월(1)을 0번 컬럼으로 매핑
function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

interface CalendarWeek {
  days: Date[]; // [월,화,수,목,금,토,일]
  weekOfMonth: number | null; // 해당 월에 속하지 않는 행이면 null
}

function buildCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month - 1, 1 - firstCol);

  const weeks: CalendarWeek[] = [];
  let counter = 0;
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      days.push(date);
    }
    // 주(화~일)의 기준일은 화요일(days[1]). 화요일이 해당 월에 속할 때만 그 달의 "N주차"로 센다.
    const startsInMonth = days[1].getMonth() === month - 1;
    if (startsInMonth) counter++;
    weeks.push({ days, weekOfMonth: startsInMonth ? counter : null });
  }
  return weeks;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MAX_EXTRA_DAYS = 30;

type DayKind =
  | { kind: "base"; weekday: WeekDay }
  | { kind: "extra"; index: number } // 화~일(offset 0~5) 다음으로 이미 추가된 날 — index는 추가일 중 순번(0부터)
  | { kind: "extend" }; // 다음으로 이어서 추가할 수 있는 바로 다음 날 (아직 미추가)

function omit<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

export function Step1Calendar({
  week,
  excludedDays,
  extraDays,
  dayTags,
  dayShowCounts,
  defaultPerformanceDays,
  weekDemand,
  dateBlocks,
  onChangeWeek,
  onChangeExcludedDays,
  onChangeExtraDays,
  onChangeDayTags,
  onChangeDayShowCounts,
  heading,
  midHallDays,
  onChangeMidHallDays,
  monthBounds,
}: {
  week: QuoteSelection["week"];
  excludedDays: WeekDay[];
  extraDays: number;
  dayTags: Record<string, DayTag>;
  dayShowCounts: Record<string, number>;
  defaultPerformanceDays: number;
  weekDemand: WeekDemand[];
  dateBlocks: DateBlock[];
  onChangeWeek: (week: QuoteSelection["week"]) => void;
  onChangeExcludedDays: (days: WeekDay[]) => void;
  onChangeExtraDays: (value: number) => void;
  onChangeDayTags: (dayTags: Record<string, DayTag>) => void;
  onChangeDayShowCounts: (dayShowCounts: Record<string, number>) => void;
  // 동시 대관에서는 상위 venueTab("아레나 일정")이 이미 공간을 구분해 보여주므로,
  // 탭 이름과 탭 바로 아래 제목이 다른 문구로 겹치지 않도록 상위에서 맞춰 넘긴다.
  heading?: string;
  /**
   * [신규 2026-09-02] 「패키지」 공간 — 기본 6일 안에서 **아레나와 중형을 함께** 짠다.
   * 이 콜백이 있으면 역할 선택 레이어가 두 줄(아레나 공연장 / 중형 공연장)로 열린다.
   * 아레나 역할은 기존 `dayTags`, 중형 역할은 `midHallDays` 에 그대로 쌓으므로
   * 요금 계산·심사 화면은 손대지 않아도 두 공간을 모두 읽는다.
   */
  midHallDays?: Record<string, MidHallDaySelection>;
  onChangeMidHallDays?: (days: Record<string, MidHallDaySelection>) => void;
  /**
   * [신규 2026-09-06] "일정 관리 > 캘린더 노출... 대관 위저드 달력 노출 기간에도
   * 반영되어야해" — 어드민 「공지 캘린더 노출 월」(noticeCalendarMonthBounds) 설정을
   * 위저드 달력에도 그대로 적용한다. 없으면(과거 호출부·미리보기 등) 제한 없음.
   */
  monthBounds?: { start: string | null; end: string | null };
}) {
  // [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 02/12 · INTERACTION] 역할 지정은 팝업이 아니라
  // 클릭한 날짜 아래에 바로 펼쳐지는 드롭다운으로 처리한다 — 이전의 "사용 요일 토글 행" +
  // "공연/세팅 설정 목록" 2개 섹션을 이 하나의 인터랙션으로 통합한다.
  const [openDate, setOpenDate] = useState<string | null>(null);
  // 두 공간을 함께 짜는 예약(「패키지」)인지 — 상위가 중형 일정 콜백을 넘겼는지로 판단한다.
  const twoVenueRoles = !!onChangeMidHallDays;
  const midHall = midHallDays ?? {};

  /** 중형 역할 지정 — 같은 역할을 다시 누르면 그 날짜의 중형 사용을 해제한다. */
  function setMidHallRole(date: string, role: MidHallDayRole) {
    if (!onChangeMidHallDays) return;
    const current = midHall[date];
    if (current?.role === role) {
      onChangeMidHallDays(omit(midHall, date));
      return;
    }
    // 회차는 공연일에만 의미가 있다. 셋업·철수로 바꾸면 1로 되돌려 흔적을 남기지 않는다.
    onChangeMidHallDays({
      ...midHall,
      [date]: { role, shows: role === "PERFORMANCE" ? (current?.shows ?? 1) : 1 },
    });
  }

  const calendarWeeks = buildCalendarWeeks(week.year, week.month);
  // 아레나 전용 설정 또는 공간공통(ALL, 과거 이관 데이터)만 이 화면에 적용한다 —
  // 중형공연장 전용으로 막힌 날짜는 아레나에서는 그대로 선택 가능해야 한다.
  const blockedByDate = new Map(
    dateBlocks.filter((b) => b.venueId === "arena" || b.venueId === "ALL").map((b) => [b.date, b]),
  );
  const today = new Date();
  const usedDayCount = 6 - excludedDays.length;
  const totalDays = usedDayCount + extraDays;
  const selectedDates = resolveSelectedDates({ week, excludedDays, extraDays });
  const dayTagDefaults = defaultDayTags(selectedDates, defaultPerformanceDays);

  const selectedTuesday = calendarWeeks.find((w) => w.weekOfMonth === week.weekOfMonth)?.days[1] ?? null;
  const activeDateKeys = new Set<string>();
  if (selectedTuesday) {
    for (let i = 0; i < 6; i++) {
      if (!excludedDays.includes(WEEKDAYS[i])) activeDateKeys.add(dateKey(addDays(selectedTuesday, i)));
    }
    for (let i = 0; i < extraDays; i++) {
      activeDateKeys.add(dateKey(addDays(selectedTuesday, 6 + i))); // 일요일(offset 5) 다음날부터 연장
    }
  }

  // [신규 2026-09-06] "1주는 패키지 단위, 그 다음주는 개별로 추가... 휴무일을
  // 지정할수 있고" — 지금 열린 드롭다운의 날짜가 기본 6일(base)인지 개별 추가일
  // (extra·extend)인지에 따라 아래 "휴무일" 버튼을 보여줄지 정한다.
  const openDayKind = openDate ? dayKindForDate(openDate) : null;

  function canGoToMonth(delta: -1 | 1): boolean {
    if (!monthBounds) return true;
    return canStepMonth(toMonthKey(week.year, week.month), delta, monthBounds);
  }

  function goToMonth(delta: -1 | 1) {
    if (!canGoToMonth(delta)) return;
    let nextMonth = week.month + delta;
    let nextYear = week.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    onChangeWeek({ ...week, year: nextYear, month: nextMonth });
  }

  // 해당 주차의 화~일(기본 6일) 중 막힌 날짜가 하나라도 있으면 그 주 전체를 선택 불가로 표시한다.
  function blockedFor(weekOfMonth: number): DateBlock | undefined {
    const calWeek = calendarWeeks.find((w) => w.weekOfMonth === weekOfMonth);
    if (!calWeek) return undefined;
    for (let i = 1; i <= 6; i++) {
      const block = blockedByDate.get(isoDate(calWeek.days[i]));
      if (block) return block;
    }
    return undefined;
  }

  function selectWeek(weekOfMonth: number) {
    if (blockedFor(weekOfMonth)) return;
    setOpenDate(null);
    onChangeWeek({ year: week.year, month: week.month, weekOfMonth });
  }

  function demandFor(weekOfMonth: number): number {
    const match = weekDemand.find(
      (d) => d.year === week.year && d.month === week.month && d.weekOfMonth === weekOfMonth,
    );
    return match?.companyCount ?? 0;
  }

  // 화~일(offset 0~5)은 기본 대관 요일, offset 6부터는 일요일 다음으로 이어 붙이는 추가일이다.
  // 별도 스테퍼 없이 달력에서 바로 다음 날짜를 눌러 추가하고, 이미 추가된 날은 기존 날짜와
  // 똑같이 역할 지정/회차 조정/삭제가 가능하다 — 추가일만 별도 취급하던 이전 제약을 없앤다.
  function offsetForDate(iso: string): number | null {
    if (!selectedTuesday) return null;
    const targetKey = dateKey(new Date(iso));
    for (let i = -1; i <= 6 + MAX_EXTRA_DAYS; i++) {
      if (dateKey(addDays(selectedTuesday, i)) === targetKey) return i;
    }
    return null;
  }

  function dayKindForDate(iso: string): DayKind | null {
    const offset = offsetForDate(iso);
    if (offset === null) return null;
    if (offset >= 0 && offset <= 5) return { kind: "base", weekday: WEEKDAYS[offset] };
    if (offset >= 6 && offset <= 6 + extraDays - 1) return { kind: "extra", index: offset - 6 };
    if (offset === 6 + extraDays && extraDays < MAX_EXTRA_DAYS) return { kind: "extend" };
    return null;
  }

  // [개정 2026-09-06] "아레나는 주단위로 예약되는거니까 삭제는 일별로는 안되게" — 화~일
  // 기본 6일 중 특정 요일만 빼거나(excludedDays, 요일당 정액 할인) 추가일을 낱개로
  // 떼어내는 UI를 없앴다. 중형공연장(MidHallCalendar.tsx)은 원래 일 단위 과금이라
  // 그대로 둔다. excludedDays 필드·요일당 할인 계산(calculateQuote.ts)은 이 필드가
  // 추가되기 전 신청서를 위해 그대로 남겨두되, 새 신청서는 이 화면에서 채우지 않는다.
  function setRole(iso: string, role: DayTag) {
    const dayKind = dayKindForDate(iso);
    if (!dayKind) return;
    if (blockedByDate.has(iso)) return;

    // 이미 이 역할로 지정돼 있는 버튼을 한 번 더 누르면 지정을 해제한다(원래
    // 자동 계산되는 기본값으로 되돌아간다) — "한번더 클릭하면 세팅한 내역
    // 사라지게" (2026-09-07).
    const alreadySet =
      dayKind.kind !== "extend" &&
      activeDateKeys.has(dateKey(new Date(iso))) &&
      effectiveDayTag(iso, dayTags, dayTagDefaults) === role &&
      iso in dayTags;

    if (dayKind.kind === "base") {
      if (alreadySet) {
        onChangeDayTags(omit(dayTags, iso));
        return;
      }
      // 셋업/공연일/철수 선택 — 제외돼 있었다면(옛 신청서) 다시 사용일로 복귀시킨 뒤
      // 역할을 지정한다. 드롭다운은 여기서 닫지 않는다 — 공연일을 고른 직후 바로
      // 아래에서 회차를 조정해야 하므로, 상태값과 회차 스테퍼를 같은 화면에서 함께
      // 보여준다.
      if (excludedDays.includes(dayKind.weekday)) {
        onChangeExcludedDays(excludedDays.filter((d) => d !== dayKind.weekday));
      }
      onChangeDayTags({ ...dayTags, [iso]: role });
      return;
    }

    if (dayKind.kind === "extra") {
      if (alreadySet) {
        onChangeDayTags(omit(dayTags, iso));
        return;
      }
      onChangeDayTags({ ...dayTags, [iso]: role });
      return;
    }

    // dayKind.kind === "extend" — 아직 추가되지 않은, 화~일 다음으로 이어 붙일 수 있는 바로 다음 날
    onChangeExtraDays(extraDays + 1);
    onChangeDayTags({ ...dayTags, [iso]: role });
  }

  function setShowCount(iso: string, count: number) {
    onChangeDayShowCounts({ ...dayShowCounts, [iso]: Math.max(1, Math.min(4, count)) });
  }

  const setupCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "PREP").length;
  const loadOutCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "LOAD_OUT").length;
  const restCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "REST").length;
  const performanceCount = selectedDates.length - setupCount - loadOutCount - restCount;

  return (
    <div>
      {heading && <h2 className="type-kr-heading text-h5-m sm:text-h5">{heading}</h2>}

      <div className={heading ? "mt-6 flex items-center justify-between" : "flex items-center justify-between"}>
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          disabled={!canGoToMonth(-1)}
          aria-label="이전 달"
          className={`${toggleClass(false)} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ‹
        </button>
        <div className="type-kr-heading text-h6-m">
          {week.year}년 {week.month}월
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          disabled={!canGoToMonth(1)}
          aria-label="다음 달"
          className={`${toggleClass(false)} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted sm:gap-1.5">
        {DOW_LABELS.map((label, i) => (
          <div key={label} className={i === 0 ? "opacity-50" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1.5 space-y-1 sm:space-y-1.5">
        {calendarWeeks.map((calWeek, wi) => {
          const isSelectable = calWeek.weekOfMonth !== null;
          const demand = calWeek.weekOfMonth !== null ? demandFor(calWeek.weekOfMonth) : 0;
          const blocked = calWeek.weekOfMonth !== null ? blockedFor(calWeek.weekOfMonth) : undefined;
          const openInThisRow = openDate && calWeek.days.some((d) => isoDate(d) === openDate);
          return (
            <div key={wi}>
              <div className="grid w-full grid-cols-7 gap-1 p-0.5 sm:gap-1.5">
                {calWeek.days.map((date, di) => {
                  const inMonth = date.getMonth() === week.month - 1;
                  const isMonday = di === 0;
                  const isToday = isSameDate(date, today);
                  const iso = isoDate(date);
                  const isActive = activeDateKeys.has(dateKey(date));
                  const tag = isActive ? effectiveDayTag(iso, dayTags, dayTagDefaults) : null;
                  const dayKind = dayKindForDate(iso);
                  const isExtendable = dayKind?.kind === "extend";
                  const interactable = dayKind !== null;
                  // 행 단위 block 은 화~일(1~6)만 보므로, 월요일부터 시작하는 연장일은
                  // 이 날짜 자신의 차단 여부를 따로 확인해야 놓치지 않는다.
                  const cellBlocked = blocked ?? blockedByDate.get(iso);
                  const cellDisabled =
                    !!cellBlocked || (isMonday && !interactable) || (!isSelectable && !interactable);
                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={cellDisabled}
                      onClick={() => {
                        if (interactable) {
                          setOpenDate(openDate === iso ? null : iso);
                          return;
                        }
                        if (calWeek.weekOfMonth !== null) selectWeek(calWeek.weekOfMonth);
                      }}
                      className={[
                        "flex h-9 flex-col items-center justify-center gap-0.5 text-xs sm:h-11 sm:text-s",
                        cellBlocked
                          ? "cursor-not-allowed text-muted line-through"
                          : isActive
                            ? "cursor-pointer bg-accent-soft font-bold text-foreground"
                            : isExtendable
                              ? "cursor-pointer border border-dashed border-foreground/50 text-muted hover:border-foreground hover:text-foreground"
                              : !inMonth
                                ? "cursor-default text-muted/40"
                                : isMonday
                                  ? "cursor-default text-muted/70"
                                  : "cursor-pointer text-foreground hover:bg-panel",
                        isToday ? "underline decoration-2 underline-offset-4" : "",
                        openDate === iso ? "ring-2 ring-accent" : "",
                      ].join(" ")}
                    >
                      <span>{date.getDate()}</span>
                      {tag && (
                        <span className="text-xs font-bold leading-none">
                          {/* 두 공간을 함께 짤 때는 공간을 앞에 붙인다 — "세팅"만 찍으면
                              아래 "중형 세팅" 과 나란히 놓였을 때 어느 공간 것인지
                              알 수 없다. 공간이 하나뿐이면 붙이지 않는다. */}
                          {twoVenueRoles ? "아레나 " : ""}
                          {tag === "PERFORMANCE"
                            ? `공연×${dayShowCounts[iso] ?? 1}`
                            : tag === "LOAD_OUT"
                              ? "철수"
                              : tag === "REST"
                                ? "휴무"
                                : "세팅"}
                        </span>
                      )}
                      {/* 두 공간을 함께 짤 때만 중형 역할을 한 줄 더 찍는다 — 어느 날에
                          무엇이 잡혔는지 달력만 보고 알 수 있어야 한다. */}
                      {twoVenueRoles && midHall[iso] && (
                        <span className="text-xs font-bold leading-none text-muted">
                          중형{" "}
                          {midHall[iso].role === "PERFORMANCE"
                            ? `공연×${midHall[iso].shows ?? 1}`
                            : midHall[iso].role === "LOAD_OUT"
                              ? "철수"
                              : "세팅"}
                        </span>
                      )}
                      {!tag && isExtendable && <span className="text-xs font-bold leading-none">추가+</span>}
                    </button>
                  );
                })}
              </div>

              {openInThisRow && openDate && (
                <div className="mt-1.5 border border-border/40 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-foreground">
                      {formatDateLabel(openDate)}
                      {openDayKind?.kind === "extend" ? " — 추가 후 역할 선택" : " — 역할 선택"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenDate(null)}
                      aria-label="닫기"
                      className="text-xs text-muted hover:text-foreground"
                    >
                      닫기 ✕
                    </button>
                  </div>
                  {/* [신규 2026-09-02] 「패키지」는 기본 6일 안에서 아레나와 중형을 함께
                      짠다 — 한 날짜가 두 공간에서 서로 다른 역할을 가질 수 있으므로
                      역할 줄을 공간별로 나눈다. 공간이 하나뿐인 예약에서는 라벨 없이
                      예전 그대로 한 줄만 나온다. */}
                  {twoVenueRoles && (
                    <p className="mt-2 text-xs font-bold text-muted">아레나 공연장</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* [수정 2026-09-07] "버튼 하나를 해제하면 다른 버튼이 자동으로 눌려요" —
                        예전에는 눌림 표시를 effectiveDayTag(내가 안 골랐어도 자동 계산되는
                        기본값 포함)로 판정해서, 지정을 해제(dayTags에서 제거)하면 그 날짜의
                        기본값과 같은 다른 버튼이 갑자기 눌린 것처럼 보였다. 눌림 표시는
                        내가 실제로 고른 값(dayTags[openDate])에만 반응하게 해서, 해제하면
                        어느 버튼도 눌리지 않은 상태로 보이게 한다. */}
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "PREP")}
                      className={[
                        "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                        dayTags[openDate] === "PREP"
                          ? "border-foreground bg-inverse-bg text-inverse-fg"
                          : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      셋업
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "PERFORMANCE")}
                      className={[
                        "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                        dayTags[openDate] === "PERFORMANCE"
                          ? "border-foreground bg-inverse-bg text-inverse-fg"
                          : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      공연일
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "LOAD_OUT")}
                      className={[
                        "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                        dayTags[openDate] === "LOAD_OUT"
                          ? "border-foreground bg-inverse-bg text-inverse-fg"
                          : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      철수
                    </button>
                    {/* [신규 2026-09-06] "1주는 패키지 단위로 추가하고, 그 다음주는 개별로
                        추가... 휴무일을 지정할수 있고 휴무일로 지정하면 공연 준비일에
                        50% 할인이 붙는 개념" — 화~일 기본 6일(base)에는 두지 않고, 그
                        이후로 개별 추가하는 날(extra·extend)에만 고를 수 있다. 가격은
                        calculateQuote.ts가 REST로 지정된 추가일에 준비일 추가 단가의
                        50%를 매긴다. */}
                    {openDayKind?.kind !== "base" && (
                      <button
                        type="button"
                        onClick={() => setRole(openDate, "REST")}
                        className={[
                          "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                          dayTags[openDate] === "REST"
                            ? "border-foreground bg-inverse-bg text-inverse-fg"
                            : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        휴무일
                      </button>
                    )}
                  </div>

                  {activeDateKeys.has(dateKey(new Date(openDate))) &&
                    effectiveDayTag(openDate, dayTags, dayTagDefaults) === "PERFORMANCE" && (
                      <div
                        className={[
                          "mt-2.5 flex items-center gap-2",
                          // 공간이 하나뿐일 때는 버튼 줄과 회차를 헤어라인으로 나눈다.
                          // 두 줄일 때는 바로 아래 「중형 공연장」 구분선이 그 일을 하므로
                          // 선을 겹쳐 긋지 않는다.
                          twoVenueRoles ? "" : "border-t border-foreground/20 pt-2.5",
                        ].join(" ")}
                      >
                        <span className="text-xs text-muted">
                          {twoVenueRoles ? "아레나 공연 회차" : "공연 회차"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCount(openDate, (dayShowCounts[openDate] ?? 1) - 1)}
                          className={ICON_BTN_SM}
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-xs font-bold tabular-nums">
                          {dayShowCounts[openDate] ?? 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCount(openDate, (dayShowCounts[openDate] ?? 1) + 1)}
                          className={ICON_BTN_SM}
                        >
                          +
                        </button>
                      </div>
                    )}

                  {/* 중형 줄 — 아레나와 같은 6일 안에서 따로 짠다. 고른 역할을 다시
                      누르면 그 날짜의 중형 사용이 빠진다. */}
                  {twoVenueRoles && (
                    <>
                      <p className="mt-3 border-t border-border/25 pt-2.5 text-xs font-bold text-muted">
                        중형 공연장
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(
                          [
                            ["SETUP", "셋업"],
                            ["PERFORMANCE", "공연일"],
                            ["LOAD_OUT", "철수"],
                          ] as const
                        ).map(([role, label]) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setMidHallRole(openDate, role)}
                            className={[
                              "inline-flex h-8 items-center border px-3 text-xs font-bold transition-colors",
                              midHall[openDate]?.role === role
                                ? "border-foreground bg-inverse-bg text-inverse-fg"
                                : "border border-border/25 text-muted hover:border-foreground hover:text-foreground",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {midHall[openDate]?.role === "PERFORMANCE" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-xs text-muted">중형 공연 회차</span>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeMidHallDays?.({
                                ...midHall,
                                [openDate]: {
                                  role: "PERFORMANCE",
                                  shows: Math.max(1, (midHall[openDate]?.shows ?? 1) - 1),
                                },
                              })
                            }
                            className={ICON_BTN_SM}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold tabular-nums">
                            {midHall[openDate]?.shows ?? 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeMidHallDays?.({
                                ...midHall,
                                [openDate]: {
                                  role: "PERFORMANCE",
                                  shows: Math.min(4, (midHall[openDate]?.shows ?? 1) + 1),
                                },
                              })
                            }
                            className={ICON_BTN_SM}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {blocked ? (
                <div className="px-0.5 pt-0.5 text-right text-xs font-bold text-danger">대관 불가</div>
              ) : (
                demand > 0 && (
                  <div className="px-0.5 pt-0.5 text-right text-xs text-muted">
                    {demand > 1 && <span className="font-bold text-warn">검토 중 · </span>}
                    <span className="font-bold text-foreground">{demand}</span>
                    <span>개사 신청</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-s font-bold text-foreground">
        {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 셋업 {setupCount}일 · 공연{" "}
        {performanceCount}일{loadOutCount > 0 ? ` · 철수 ${loadOutCount}일` : ""}
        {restCount > 0 ? ` · 휴무 ${restCount}일` : ""} · 총 {totalDays}
        일 적용
        {excludedDays.length > 0 && ` (기본 6일 − 제외 ${excludedDays.length}일${extraDays > 0 ? ` + 추가 ${extraDays}일` : ""})`}
        {excludedDays.length === 0 && extraDays > 0 && ` (기본 6일 + 추가 ${extraDays}일)`}
      </div>

      {/* [신규 2026-09-06] "추가 준비일도 기존 준비일 대비 10% 할인, 추가공연일도 기존
          공연일의 10%할인 > 이게 프론트에서도 이렇게 할인된다는 안내를 노출해줘야할듯" —
          기본 6일을 넘겨 추가하는 준비일·공연일에는 자동으로 10% 할인이 붙는다는 것을
          견적서(계산서)를 열어보기 전에 이 화면에서 미리 안내한다(휴무일은 별도로 50%
          할인이 이미 위 버튼 안내에 있어 여기서는 준비일·공연일만 언급). */}
      {(extraDays > 0 || performanceCount > defaultPerformanceDays) && (
        <p className="mt-1.5 text-xs text-muted">
          기본 6일을 넘겨 추가하는 준비일·공연일은 각각 기존 단가에서 10% 자동 할인됩니다.
        </p>
      )}
    </div>
  );
}
