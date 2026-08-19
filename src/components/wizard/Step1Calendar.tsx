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
  heading = "2. 주차(기간) 선택",
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

  function setRole(iso: string, role: DayTag | "REMOVE") {
    const dayKind = dayKindForDate(iso);
    if (!dayKind) return;

    if (dayKind.kind === "base") {
      const isExcluded = excludedDays.includes(dayKind.weekday);
      if (role === "REMOVE") {
        if (!isExcluded && usedDayCount <= 1) return; // 최소 1일은 남겨야 함
        if (!isExcluded) onChangeExcludedDays([...excludedDays, dayKind.weekday]);
        setOpenDate(null);
        return;
      }
      // 셋업/공연일/철수 선택 — 제외돼 있었다면 다시 사용일로 복귀시킨 뒤 역할을 지정한다.
      // 드롭다운은 여기서 닫지 않는다 — 공연일을 고른 직후 바로 아래에서 회차를 조정해야
      // 하므로, 상태값과 회차 스테퍼를 같은 화면에서 함께 보여준다.
      if (isExcluded) onChangeExcludedDays(excludedDays.filter((d) => d !== dayKind.weekday));
      onChangeDayTags({ ...dayTags, [iso]: role });
      return;
    }

    if (dayKind.kind === "extra") {
      if (role === "REMOVE") {
        // 추가일은 화~일 뒤로 이어붙인 연속 카운트라 맨 마지막 날만 뗄 수 있다.
        if (dayKind.index !== extraDays - 1) return;
        onChangeExtraDays(extraDays - 1);
        onChangeDayTags(omit(dayTags, iso));
        onChangeDayShowCounts(omit(dayShowCounts, iso));
        setOpenDate(null);
        return;
      }
      onChangeDayTags({ ...dayTags, [iso]: role });
      return;
    }

    // dayKind.kind === "extend" — 아직 추가되지 않은, 화~일 다음으로 이어 붙일 수 있는 바로 다음 날
    if (role === "REMOVE") return; // 아직 추가되지 않았으니 뗄 것이 없다
    onChangeExtraDays(extraDays + 1);
    onChangeDayTags({ ...dayTags, [iso]: role });
  }

  function setShowCount(iso: string, count: number) {
    onChangeDayShowCounts({ ...dayShowCounts, [iso]: Math.max(1, Math.min(4, count)) });
  }

  const setupCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "PREP").length;
  const loadOutCount = selectedDates.filter((d) => effectiveDayTag(d, dayTags, dayTagDefaults) === "LOAD_OUT").length;
  const performanceCount = selectedDates.length - setupCount - loadOutCount;

  return (
    <section className="border border-border bg-background p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        달력에서 원하는 주를 눌러 선택하세요. 기본 단위는{" "}
        <b className="text-foreground">1주(화~일, 6일)</b>이며, 월요일은 기본적으로 대관하지
        않습니다. 선택한 주의 날짜를 누르면 셋업 · 공연일(회차 포함) · 철수 · 제외를 바로
        지정할 수 있습니다. 기간을 더 늘리려면 일요일 다음으로{" "}
        <span className="text-accent">추가+</span> 표시된 날짜를 눌러 이어 붙이면 됩니다 — 이렇게
        추가한 날짜도 다른 날짜와 똑같이 역할과 회차를 지정할 수 있습니다.
      </p>

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
                  const dayKind = dayKindForDate(iso);
                  const isExtendable = dayKind?.kind === "extend";
                  const interactable = dayKind !== null;
                  const cellDisabled = !!blocked || (isMonday && !interactable) || (!isSelectable && !interactable);
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
                        "flex h-9 flex-col items-center justify-center gap-0.5 rounded-sm text-[12.5px] sm:h-11 sm:text-[13px]",
                        blocked
                          ? "cursor-not-allowed text-muted line-through"
                          : isActive
                            ? "cursor-pointer bg-accent-soft font-semibold text-accent"
                            : isExtendable
                              ? "cursor-pointer border border-dashed border-accent/50 text-muted hover:border-accent hover:text-accent"
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
                          {tag === "PERFORMANCE"
                            ? `공연×${dayShowCounts[iso] ?? 1}`
                            : tag === "LOAD_OUT"
                              ? "철수"
                              : "세팅"}
                        </span>
                      )}
                      {!tag && isExtendable && <span className="text-[9px] font-medium leading-none">추가+</span>}
                    </button>
                  );
                })}
              </div>

              {openInThisRow && openDate && (
                <div className="mt-1.5 rounded-sm border border-accent bg-accent-soft/40 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12.5px] font-semibold text-foreground">
                      {formatDateLabel(openDate)}
                      {dayKindForDate(openDate)?.kind === "extend" ? " — 추가 후 역할 선택" : " — 역할 선택"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenDate(null)}
                      aria-label="닫기"
                      className="text-[12px] text-muted hover:text-foreground"
                    >
                      닫기 ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "PREP")}
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
                      onClick={() => setRole(openDate, "LOAD_OUT")}
                      className={[
                        "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors",
                        activeDateKeys.has(dateKey(new Date(openDate))) &&
                        effectiveDayTag(openDate, dayTags, dayTagDefaults) === "LOAD_OUT"
                          ? "bg-accent text-white"
                          : "bg-panel-strong text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      철수
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(openDate, "REMOVE")}
                      disabled={(() => {
                        const kind = dayKindForDate(openDate);
                        if (!kind) return true;
                        if (kind.kind === "base") return activeDateKeys.has(dateKey(new Date(openDate))) && usedDayCount <= 1;
                        if (kind.kind === "extra") return kind.index !== extraDays - 1; // 맨 마지막 추가일만 뗄 수 있음
                        return true; // extend — 아직 추가되지 않아 뗄 것이 없음
                      })()}
                      className="rounded-sm bg-panel-strong px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                  {activeDateKeys.has(dateKey(new Date(openDate))) &&
                    effectiveDayTag(openDate, dayTags, dayTagDefaults) === "PERFORMANCE" && (
                      <div className="mt-2.5 flex items-center gap-2 border-t border-accent/20 pt-2.5">
                        <span className="text-[11.5px] text-muted">공연 회차</span>
                        <button
                          type="button"
                          onClick={() => setShowCount(openDate, (dayShowCounts[openDate] ?? 1) - 1)}
                          className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[12px] font-medium tabular-nums">
                          {dayShowCounts[openDate] ?? 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCount(openDate, (dayShowCounts[openDate] ?? 1) + 1)}
                          className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                        >
                          +
                        </button>
                      </div>
                    )}
                  <p className="mt-2 text-[11px] text-muted">
                    1일 2회 이상 공연 할증은 아직 협의 중입니다(요금 엔진 연동 후 반영) — 회차는
                    지금도 지정해 두시면 이후 반영 시 그대로 적용됩니다.
                  </p>
                </div>
              )}

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

      <div className="mt-4 text-[14px] font-medium text-accent">
        {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 셋업 {setupCount}일 · 공연{" "}
        {performanceCount}일{loadOutCount > 0 ? ` · 철수 ${loadOutCount}일` : ""} · 총 {totalDays}
        일 적용
        {excludedDays.length > 0 && ` (기본 6일 − 제외 ${excludedDays.length}일${extraDays > 0 ? ` + 추가 ${extraDays}일` : ""})`}
        {excludedDays.length === 0 && extraDays > 0 && ` (기본 6일 + 추가 ${extraDays}일)`}
      </div>
    </section>
  );
}
