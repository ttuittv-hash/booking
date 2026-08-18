"use client";

import { useState } from "react";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import {
  WEEKDAYS,
  type DateBlock,
  type DayTag,
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

export function Step1Calendar({
  week,
  excludedDays,
  extraDays,
  dayTags,
  defaultPerformanceDays,
  weekDemand,
  dateBlocks,
  onChangeWeek,
  onChangeExcludedDays,
  onChangeExtraDays,
  onChangeDayTags,
}: {
  week: QuoteSelection["week"];
  excludedDays: WeekDay[];
  extraDays: number;
  dayTags: Record<string, DayTag>;
  defaultPerformanceDays: number;
  weekDemand: WeekDemand[];
  dateBlocks: DateBlock[];
  onChangeWeek: (week: QuoteSelection["week"]) => void;
  onChangeExcludedDays: (days: WeekDay[]) => void;
  onChangeExtraDays: (value: number) => void;
  onChangeDayTags: (dayTags: Record<string, DayTag>) => void;
}) {
  // [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 02/12 · INTERACTION] 역할 지정은 팝업이 아니라
  // 클릭한 날짜 아래에 바로 펼쳐지는 드롭다운으로 처리한다 — 이전의 "사용 요일 토글 행" +
  // "공연/세팅 설정 목록" 2개 섹션을 이 하나의 인터랙션으로 통합한다.
  const [openDate, setOpenDate] = useState<string | null>(null);

  const calendarWeeks = buildCalendarWeeks(week.year, week.month);
  const blockedByDate = new Map(dateBlocks.map((b) => [b.date, b]));
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

  function goToMonth(delta: number) {
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

  function weekdayForDate(iso: string): WeekDay | null {
    if (!selectedTuesday) return null;
    const targetKey = dateKey(new Date(iso));
    for (let i = 0; i < 6; i++) {
      if (dateKey(addDays(selectedTuesday, i)) === targetKey) return WEEKDAYS[i];
    }
    return null; // 추가 일수(연장일)는 요일 개념이 없다 — 역할 지정 대상이 아니다
  }

  function setRole(iso: string, role: "SETUP" | "PERFORMANCE" | "REMOVE") {
    const weekday = weekdayForDate(iso);
    if (!weekday) return;
    const isExcluded = excludedDays.includes(weekday);

    if (role === "REMOVE") {
      if (!isExcluded && usedDayCount <= 1) return; // 최소 1일은 남겨야 함
      if (!isExcluded) onChangeExcludedDays([...excludedDays, weekday]);
      setOpenDate(null);
      return;
    }
    // 셋업/공연일 선택 — 제외돼 있었다면 다시 사용일로 복귀시킨 뒤 역할을 지정한다.
    if (isExcluded) onChangeExcludedDays(excludedDays.filter((d) => d !== weekday));
    onChangeDayTags({ ...dayTags, [iso]: role === "PERFORMANCE" ? "PERFORMANCE" : "PREP" });
    setOpenDate(null);
  }

  const setupCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "PREP").length;
  const performanceCount = selectedDates.length - setupCount;

  return (
    <section className="border border-border bg-background p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">2. 주차(기간) 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        달력에서 원하는 주를 눌러 선택하세요. 기본 단위는{" "}
        <b className="text-foreground">1주(화~일, 6일)</b>이며, 월요일은 기본적으로 대관하지
        않습니다. 선택한 주의 날짜를 누르면 셋업 · 공연일 · 제외를 바로 지정할 수 있습니다.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="이전 달"
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ‹
        </button>
        <div className="text-[15px] font-semibold">
          {week.year}년 {week.month}월
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="다음 달"
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted sm:gap-1.5">
        {DOW_LABELS.map((label, i) => (
          <div key={label} className={i === 0 ? "opacity-50" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1.5 space-y-1 sm:space-y-1.5">
        {calendarWeeks.map((calWeek, wi) => {
          const isSelectable = calWeek.weekOfMonth !== null;
          const isActiveWeek = calWeek.weekOfMonth !== null && calWeek.weekOfMonth === week.weekOfMonth;
          const demand = calWeek.weekOfMonth !== null ? demandFor(calWeek.weekOfMonth) : 0;
          const blocked = calWeek.weekOfMonth !== null ? blockedFor(calWeek.weekOfMonth) : undefined;
          const openInThisRow = openDate && calWeek.days.some((d) => isoDate(d) === openDate);
          return (
            <div key={wi}>
              <div className="grid w-full grid-cols-7 gap-1 rounded-sm p-0.5 sm:gap-1.5">
                {calWeek.days.map((date, di) => {
                  const inMonth = date.getMonth() === week.month - 1;
                  const isMonday = di === 0;
                  const isToday = isSameDate(date, today);
                  const iso = isoDate(date);
                  const isActive = activeDateKeys.has(dateKey(date));
                  const tag = isActive ? effectiveDayTag(iso, dayTags, dayTagDefaults) : null;
                  const cellDisabled = !isSelectable || !!blocked || isMonday;
                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={cellDisabled}
                      onClick={() => {
                        if (!isActiveWeek) {
                          if (calWeek.weekOfMonth !== null) selectWeek(calWeek.weekOfMonth);
                          return;
                        }
                        setOpenDate(openDate === iso ? null : iso);
                      }}
                      className={[
                        "flex h-9 flex-col items-center justify-center gap-0.5 rounded-sm text-[12.5px] sm:h-11 sm:text-[13px]",
                        blocked
                          ? "cursor-not-allowed text-muted line-through"
                          : isActive
                            ? "cursor-pointer bg-accent-soft font-semibold text-accent"
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
                        <span className="text-[9px] font-medium leading-none">
                          {tag === "PERFORMANCE" ? "공연" : "세팅"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {isActiveWeek && openInThisRow && openDate && (
                <div className="mt-1.5 rounded-sm border border-accent bg-accent-soft/40 px-3 py-2.5">
                  <div className="text-[12.5px] font-semibold text-foreground">
                    {formatDateLabel(openDate)} — 역할 선택
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "SETUP")}
                      className={[
                        "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors",
                        activeDateKeys.has(dateKey(new Date(openDate))) &&
                        effectiveDayTag(openDate, dayTags, dayTagDefaults) === "PREP"
                          ? "bg-accent text-white"
                          : "bg-panel-strong text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      셋업
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "PERFORMANCE")}
                      className={[
                        "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors",
                        activeDateKeys.has(dateKey(new Date(openDate))) &&
                        effectiveDayTag(openDate, dayTags, dayTagDefaults) === "PERFORMANCE"
                          ? "bg-accent text-white"
                          : "bg-panel-strong text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      공연일
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "REMOVE")}
                      disabled={activeDateKeys.has(dateKey(new Date(openDate))) && usedDayCount <= 1}
                      className="rounded-sm bg-panel-strong px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      삭제 (미사용)
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    1일 2회 이상 공연 할증은 아직 협의 중입니다(요금 엔진 연동 후 반영).
                  </p>
                </div>
              )}

              {blocked ? (
                <div className="px-0.5 pt-0.5 text-right text-[10.5px] font-medium text-red-600">
                  대관 불가{blocked.reason ? ` · ${blocked.reason}` : ""}
                </div>
              ) : (
                demand > 0 && (
                  <div className="px-0.5 pt-0.5 text-right text-[10.5px] text-muted">
                    {demand > 1 && <span>경합 중 · </span>}
                    <span className="font-bold text-accent">{demand}</span>
                    <span>개사 신청</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <label className="text-[12.5px] font-medium text-muted">추가 일수 (일요일 이후 연장)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeExtraDays(Math.max(0, extraDays - 1))}
            className="h-8 w-8 rounded-sm border border-border text-[15px] text-muted hover:border-accent hover:text-accent"
            aria-label="추가 일수 감소"
          >
            −
          </button>
          <span className="w-6 text-center text-[13px] font-medium tabular-nums">{extraDays}</span>
          <button
            type="button"
            onClick={() => onChangeExtraDays(Math.min(30, extraDays + 1))}
            className="h-8 w-8 rounded-sm border border-border text-[15px] text-muted hover:border-accent hover:text-accent"
            aria-label="추가 일수 증가"
          >
            +
          </button>
        </div>
        {extraDays > 0 && (
          <span className="text-[11px] text-muted">추가 일수는 패키지 기본값으로 역할이 지정됩니다 — 날짜별 개별 지정은 다음 업데이트에서 지원됩니다.</span>
        )}
      </div>

      <div className="mt-4 text-[14px] font-medium text-accent">
        {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 셋업 {setupCount}일 · 공연{" "}
        {performanceCount}일 · 총 {totalDays}일 적용
        {excludedDays.length > 0 && ` (기본 6일 − 제외 ${excludedDays.length}일${extraDays > 0 ? ` + 추가 ${extraDays}일` : ""})`}
        {excludedDays.length === 0 && extraDays > 0 && ` (기본 6일 + 추가 ${extraDays}일)`}
      </div>
    </section>
  );
}
