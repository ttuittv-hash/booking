"use client";

import type { QuoteSelection } from "@/lib/pricing/types";

const DOW_LABELS = ["화", "수", "목", "금", "토", "일", "월"]; // 화~일 대관, 월 제외

// JS Date.getDay(): 0=일 1=월 ... 6=토 → 화(2)를 0번 컬럼으로 매핑
function toColumnIndex(jsDay: number): number {
  return (jsDay + 5) % 7;
}

interface CalendarWeek {
  days: Date[];
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
    const hasCurrentMonthDay = days.some((d) => d.getMonth() === month - 1);
    if (hasCurrentMonthDay) counter++;
    weeks.push({ days, weekOfMonth: hasCurrentMonthDay ? counter : null });
  }
  return weeks;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Step1Calendar({
  week,
  extraWeeks,
  onChangeWeek,
  onChangeExtraWeeks,
}: {
  week: QuoteSelection["week"];
  extraWeeks: number;
  onChangeWeek: (week: QuoteSelection["week"]) => void;
  onChangeExtraWeeks: (value: number) => void;
}) {
  const calendarWeeks = buildCalendarWeeks(week.year, week.month);
  const today = new Date();

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

  function selectWeek(weekOfMonth: number) {
    onChangeWeek({ year: week.year, month: week.month, weekOfMonth });
  }

  return (
    <section className="border border-border bg-background p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">1. 주차(기간) 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        달력에서 원하는 주를 눌러 선택하세요. 최소 단위는 1일이 아니라{" "}
        <b className="text-foreground">1주(화~일)</b>입니다.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="이전 달"
          className="rounded border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
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
          className="rounded border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted sm:gap-1.5">
        {DOW_LABELS.map((label, i) => (
          <div key={label} className={i === 6 ? "opacity-50" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1.5 space-y-1 sm:space-y-1.5">
        {calendarWeeks.map((calWeek, wi) => {
          const isSelected = calWeek.weekOfMonth !== null && calWeek.weekOfMonth === week.weekOfMonth;
          const isSelectable = calWeek.weekOfMonth !== null;
          return (
            <button
              key={wi}
              type="button"
              disabled={!isSelectable}
              onClick={() => calWeek.weekOfMonth !== null && selectWeek(calWeek.weekOfMonth)}
              className={[
                "grid w-full grid-cols-7 gap-1 rounded-md p-0.5 text-left sm:gap-1.5",
                isSelectable ? "cursor-pointer" : "cursor-default",
                isSelected ? "bg-accent-soft ring-1 ring-accent" : isSelectable ? "hover:bg-panel" : "",
              ].join(" ")}
            >
              {calWeek.days.map((date, di) => {
                const inMonth = date.getMonth() === week.month - 1;
                const isMonday = di === 6;
                const isToday = isSameDate(date, today);
                return (
                  <div
                    key={di}
                    className={[
                      "flex h-9 items-center justify-center text-[12.5px] sm:h-11 sm:text-[13px]",
                      !inMonth ? "text-muted/40" : isMonday ? "text-muted/70" : "text-foreground",
                      isSelected && !isMonday ? "font-semibold text-accent" : "",
                      isToday ? "underline decoration-2 underline-offset-4" : "",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <label className="text-[12.5px] font-medium text-muted">초과 주차 (추가)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeExtraWeeks(Math.max(0, extraWeeks - 1))}
            className="h-8 w-8 rounded border border-border text-[15px] text-muted hover:border-accent hover:text-accent"
            aria-label="초과 주차 감소"
          >
            −
          </button>
          <span className="w-6 text-center text-[13px] font-medium tabular-nums">{extraWeeks}</span>
          <button
            type="button"
            onClick={() => onChangeExtraWeeks(Math.min(8, extraWeeks + 1))}
            className="h-8 w-8 rounded border border-border text-[15px] text-muted hover:border-accent hover:text-accent"
            aria-label="초과 주차 증가"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 text-[14px] font-medium text-accent">
        {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 총 {1 + extraWeeks}주 적용
      </div>
    </section>
  );
}
