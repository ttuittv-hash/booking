"use client";

import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import {
  WEEKDAYS,
  WEEKDAY_LABEL,
  type DateBlock,
  type DayTag,
  type QuoteSelection,
  type WeekDay,
  type WeekDemand,
} from "@/lib/pricing/types";
import { Note } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"]; // 달력은 월요일부터 시작, 대관 단위는 화~일 (월요일은 대관 불가 기본값)
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

/** 샤프 1px 아이콘/스테퍼 버튼 */
const ICON_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center border border-border-soft bg-surface text-r text-foreground outline-none transition-colors hover:border-foreground hover:bg-inverse-bg hover:text-inverse-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

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
  const calendarWeeks = buildCalendarWeeks(week.year, week.month);
  const blockedByDate = new Map(dateBlocks.map((b) => [b.date, b]));
  const today = new Date();
  const usedDayCount = 6 - excludedDays.length;
  const totalDays = usedDayCount + extraDays;
  const selectedDates = resolveSelectedDates({ week, excludedDays, extraDays });
  const dayTagDefaults = defaultDayTags(selectedDates, defaultPerformanceDays);

  function toggleDayTag(date: string) {
    const current = effectiveDayTag(date, dayTags, dayTagDefaults);
    onChangeDayTags({ ...dayTags, [date]: current === "PERFORMANCE" ? "PREP" : "PERFORMANCE" });
  }

  // 선택된 주의 화요일(기준일)을 찾아 실제 대관 예정 날짜 범위(제외 요일 제거 + 추가 일수 포함)를 계산한다.
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
    onChangeWeek({ year: week.year, month: week.month, weekOfMonth });
  }

  function toggleDay(day: WeekDay) {
    const isExcluded = excludedDays.includes(day);
    if (!isExcluded && usedDayCount <= 1) return; // 최소 1일은 남겨야 함
    onChangeExcludedDays(
      isExcluded ? excludedDays.filter((d) => d !== day) : [...excludedDays, day],
    );
  }

  function demandFor(weekOfMonth: number): number {
    const match = weekDemand.find(
      (d) => d.year === week.year && d.month === week.month && d.weekOfMonth === weekOfMonth,
    );
    return match?.companyCount ?? 0;
  }

  return (
    <section>
      <StepHeading
        title={<>주차(기간) 선택</>}
        lead={<>달력에서 원하는 주를 눌러 선택하세요. 기본 단위는{" "}
        <b className="text-foreground">1주(화~일, 6일)</b>이며, 월요일은 기본적으로 대관하지
        않습니다. 아래에서 요일별로 빼거나 일수를 더할 수 있습니다.</>}
      />

      <div className="mt-7 flex items-center justify-between border-b border-border/25 pb-4">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="이전 달" className={ICON_BTN}>
          ‹
        </button>
        <div className="type-display text-h6-m tabular-nums sm:text-h6">
          {week.year}. {String(week.month).padStart(2, "0")}
        </div>
        <button type="button" onClick={() => goToMonth(1)} aria-label="다음 달" className={ICON_BTN}>
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-xs font-bold ${i === 0 ? "text-muted/50" : "text-muted"}`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-1 sm:space-y-1.5">
        {calendarWeeks.map((calWeek, wi) => {
          const isSelectable = calWeek.weekOfMonth !== null;
          const demand = calWeek.weekOfMonth !== null ? demandFor(calWeek.weekOfMonth) : 0;
          const blocked = calWeek.weekOfMonth !== null ? blockedFor(calWeek.weekOfMonth) : undefined;
          const isSelectedWeek = calWeek.weekOfMonth === week.weekOfMonth;
          return (
            <div key={wi}>
              <button
                type="button"
                disabled={!isSelectable || !!blocked}
                onClick={() => calWeek.weekOfMonth !== null && selectWeek(calWeek.weekOfMonth)}
                aria-pressed={isSelectable ? isSelectedWeek : undefined}
                className={[
                  "grid w-full grid-cols-7 gap-1 text-left outline-none sm:gap-1.5",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  blocked
                    ? "cursor-not-allowed opacity-40"
                    : isSelectable
                      ? "cursor-pointer transition-colors hover:bg-foreground/[0.04]"
                      : "cursor-default",
                ].join(" ")}
              >
                {calWeek.days.map((date, di) => {
                  const inMonth = date.getMonth() === week.month - 1;
                  const isMonday = di === 0;
                  const isToday = isSameDate(date, today);
                  const isActive = activeDateKeys.has(dateKey(date));
                  return (
                    <div
                      key={di}
                      aria-current={isToday ? "date" : undefined}
                      className={[
                        // 셀은 샤프. 보더 폭을 항상 1px로 유지해 오늘 표시가 레이아웃을 밀지 않게 한다.
                        "flex h-9 items-center justify-center border text-s tabular-nums sm:h-11",
                        isToday ? "border-foreground" : "border-transparent",
                        blocked
                          ? "text-muted line-through"
                          : isActive
                            ? "bg-inverse-bg font-bold text-inverse-fg"
                            : !inMonth
                              ? "text-muted/40"
                              : isMonday
                                ? "text-muted/60"
                                : "text-foreground",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </button>
              {blocked ? (
                <div className="pt-1 text-right text-xs font-bold text-danger">
                  대관 불가{blocked.reason ? ` · ${blocked.reason}` : ""}
                </div>
              ) : (
                demand > 0 && (
                  <div className="pt-1 text-right text-xs text-muted">
                    {demand > 1 && <span>경합 중 · </span>}
                    <b className="tabular-nums text-foreground">{demand}</b>
                    <span>개사 신청</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-border/25 pt-6">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">사용 요일</h3>
        <p className="mt-2 text-s text-muted">화~일 중 제외할 요일을 선택하세요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const isExcluded = excludedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={!isExcluded}
                className={[
                  "h-9 w-9 border text-s font-bold outline-none transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  isExcluded
                    ? "border-border-soft bg-surface text-muted line-through"
                    : "border-foreground bg-inverse-bg text-inverse-fg",
                ].join(" ")}
              >
                {WEEKDAY_LABEL[day]}
              </button>
            );
          })}
        </div>
        {excludedDays.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            제외 요일은 대관료가 아닌 요일당 정액 할인으로 반영됩니다.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/25 pt-6">
        <div>
          <h3 className="type-kr-heading text-h6-m sm:text-h6">추가 일수</h3>
          <p className="mt-2 text-s text-muted">일요일 이후로 연장할 일수입니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeExtraDays(Math.max(0, extraDays - 1))}
            className={ICON_BTN}
            aria-label="추가 일수 감소"
          >
            −
          </button>
          <span className="w-8 text-center text-r font-bold tabular-nums">{extraDays}</span>
          <button
            type="button"
            onClick={() => onChangeExtraDays(Math.min(30, extraDays + 1))}
            className={ICON_BTN}
            aria-label="추가 일수 증가"
          >
            +
          </button>
        </div>
      </div>

      <Note className="mt-6">
        <b className="text-foreground">
          {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 총 {totalDays}일 적용
        </b>
        {excludedDays.length > 0 && ` (기본 6일 − 제외 ${excludedDays.length}일${extraDays > 0 ? ` + 추가 ${extraDays}일` : ""})`}
        {excludedDays.length === 0 && extraDays > 0 && ` (기본 6일 + 추가 ${extraDays}일)`}
      </Note>

      {selectedDates.length > 0 && (
        <div className="mt-6 border-t border-border/25 pt-6">
          <h3 className="type-kr-heading text-h6-m sm:text-h6">공연 / 세팅 설정</h3>
          <p className="mt-2 max-w-2xl text-s text-muted">
            선택하신 {selectedDates.length}일 각각을 공연/세팅 중에서 직접 선택하세요. 기본값은
            {" "}{defaultPerformanceDays}일이 공연이며, 기본 공연일수보다 늘리거나 줄이면 대관료가
            함께 조정됩니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedDates.map((date) => {
              const tag = effectiveDayTag(date, dayTags, dayTagDefaults);
              return (
                <div
                  key={date}
                  className="flex flex-col items-center gap-2 border border-border-soft bg-surface px-3 py-3"
                >
                  <span className="text-s font-bold tabular-nums text-foreground">
                    {formatDateLabel(date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleDayTag(date)}
                    aria-pressed={tag === "PERFORMANCE"}
                    className={[
                      "border px-2 py-1 text-xs font-bold outline-none transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                      tag === "PERFORMANCE"
                        ? "border-foreground bg-inverse-bg text-inverse-fg"
                        : "border-border-soft bg-surface text-muted hover:border-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tag === "PERFORMANCE" ? "공연" : "세팅"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
