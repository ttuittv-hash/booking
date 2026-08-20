"use client";

import { useState } from "react";
import { isoDate, isWeekendDate } from "@/lib/pricing/dateRange";
import type { DateBlock, MidHallDayRole, MidHallDaySelection, MidHallRateConfig } from "@/lib/pricing/types";

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

function buildMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month - 1, 1 - firstCol);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      days.push(date);
    }
    weeks.push(days);
  }
  return weeks;
}

export function midHallReferencePrice(iso: string, role: MidHallDayRole, config: MidHallRateConfig): number {
  if (role === "SETUP" || role === "LOAD_OUT") return config.setupDayFee;
  return isWeekendDate(iso) ? config.performanceWeekendFee : config.performanceWeekdayFee;
}

function roleTag(role: MidHallDayRole, shows: number): string {
  if (role === "SETUP") return "셋업";
  if (role === "LOAD_OUT") return "철수";
  return `공연${shows > 1 ? `×${shows}` : ""}`;
}

export function MidHallCalendar({
  title,
  year,
  month,
  days,
  extraSetupHours,
  extraLoadOutHours,
  dateBlocks,
  rateConfig,
  onChangeMonth,
  onChangeDays,
  onChangeExtraSetupHours,
  onChangeExtraLoadOutHours,
}: {
  title?: string;
  year: number;
  month: number;
  days: Record<string, MidHallDaySelection>;
  extraSetupHours: number;
  extraLoadOutHours: number;
  dateBlocks: DateBlock[];
  rateConfig: MidHallRateConfig;
  onChangeMonth: (year: number, month: number) => void;
  onChangeDays: (days: Record<string, MidHallDaySelection>) => void;
  onChangeExtraSetupHours: (value: number) => void;
  onChangeExtraLoadOutHours: (value: number) => void;
}) {
  // [화면 뼈대 2026-08-19, 아레나 STEP 2(Step1Calendar)와 동일 구조] 역할 지정은 날짜 아래에
  // 바로 펼쳐지는 인라인 드롭다운으로 처리한다 — 클릭 즉시 기본값(공연일)으로 토글하고 별도
  // 목록에서 편집하던 이전 방식은 "날짜 자체에서 세팅"하는 아레나 캘린더 구조와 어긋나서
  // 통일한다.
  const [openDate, setOpenDate] = useState<string | null>(null);

  const weeks = buildMonthGrid(year, month);
  const blockedByDate = new Map(dateBlocks.map((b) => [b.date, b]));
  const today = new Date();
  const selectedDates = Object.keys(days).sort();
  const setupCount = selectedDates.filter((d) => days[d].role === "SETUP").length;
  const loadOutDayCount = selectedDates.filter((d) => days[d].role === "LOAD_OUT").length;
  const performanceDates = selectedDates.filter((d) => days[d].role === "PERFORMANCE");
  const showCount = performanceDates.reduce((sum, d) => sum + days[d].shows, 0);

  function goToMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    onChangeMonth(nextYear, nextMonth);
  }

  function setRole(iso: string, role: MidHallDayRole) {
    const current = days[iso];
    onChangeDays({ ...days, [iso]: { role, shows: role === "PERFORMANCE" ? (current?.shows ?? 1) : 1 } });
  }

  function setShows(iso: string, shows: number) {
    const current = days[iso];
    if (!current) return;
    onChangeDays({ ...days, [iso]: { ...current, shows: Math.max(1, Math.min(4, shows)) } });
  }

  function removeDate(iso: string) {
    const next = { ...days };
    delete next[iso];
    onChangeDays(next);
    setOpenDate(null);
  }

  return (
    <div>
      {title && <h3 className="text-[15px] font-semibold">{title}</h3>}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="이전 달"
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ‹
        </button>
        <div className="text-[15px] font-semibold">
          {year}년 {month}월
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
          <div key={label} className={i === 5 || i === 6 ? "opacity-70" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1.5 space-y-1 sm:space-y-1.5">
        {weeks.map((weekDays, wi) => {
          const openInThisRow = openDate && weekDays.some((d) => isoDate(d) === openDate);
          return (
            <div key={wi}>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {weekDays.map((date) => {
                  const inMonth = date.getMonth() === month - 1;
                  const iso = isoDate(date);
                  const isToday = isoDate(today) === iso;
                  const selection = days[iso];
                  const blocked = blockedByDate.get(iso);
                  const interactable = inMonth && !blocked;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!interactable}
                      onClick={() => setOpenDate(openDate === iso ? null : iso)}
                      className={[
                        "flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm text-[12.5px] transition-colors sm:h-16",
                        !inMonth
                          ? "cursor-default text-transparent"
                          : blocked
                            ? "cursor-not-allowed text-muted line-through"
                            : selection
                              ? "cursor-pointer bg-accent-soft font-semibold text-accent"
                              : "cursor-pointer text-foreground hover:bg-panel",
                        isToday ? "underline decoration-2 underline-offset-4" : "",
                        openDate === iso ? "ring-2 ring-accent" : "",
                      ].join(" ")}
                    >
                      <span>{date.getDate()}</span>
                      {inMonth && selection && (
                        <span className="text-[9.5px] font-medium">{roleTag(selection.role, selection.shows)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {openInThisRow && openDate && (
                <div className="mt-1.5 rounded-sm border border-accent bg-accent-soft/40 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12.5px] font-semibold text-foreground">
                      {formatDateLabel(openDate)}
                      {isWeekendDate(openDate) ? <span className="ml-1 font-normal text-muted">· 주말</span> : null}
                      {" — 역할 선택"}
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
                      onClick={() => setRole(openDate, "SETUP")}
                      className={[
                        "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors",
                        days[openDate]?.role === "SETUP"
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
                        days[openDate]?.role === "PERFORMANCE"
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
                        days[openDate]?.role === "LOAD_OUT"
                          ? "bg-accent text-white"
                          : "bg-panel-strong text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      철수
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDate(openDate)}
                      disabled={!days[openDate]}
                      className="rounded-sm bg-panel-strong px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                  {days[openDate]?.role === "PERFORMANCE" && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-accent/20 pt-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] text-muted">공연 회차</span>
                        <button
                          type="button"
                          onClick={() => setShows(openDate, (days[openDate]?.shows ?? 1) - 1)}
                          className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[12px] font-medium tabular-nums">
                          {days[openDate]?.shows ?? 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShows(openDate, (days[openDate]?.shows ?? 1) + 1)}
                          className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-muted">회차</span>
                      </div>
                    </div>
                  )}
                  {days[openDate]?.role === "LOAD_OUT" && (
                    <div className="mt-2.5 flex items-center gap-2 border-t border-accent/20 pt-2.5">
                      <span className="text-[11.5px] text-muted">철수 Load-Out 연장(전체 일정 공통)</span>
                      <button
                        type="button"
                        onClick={() => onChangeExtraLoadOutHours(Math.max(0, extraLoadOutHours - 1))}
                        className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-[12px] font-medium tabular-nums">{extraLoadOutHours}</span>
                      <button
                        type="button"
                        onClick={() => onChangeExtraLoadOutHours(Math.min(6, extraLoadOutHours + 1))}
                        className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-muted">시간 · {won(rateConfig.extraHourFee)}/시간</span>
                    </div>
                  )}
                  {days[openDate]?.role === "SETUP" && (
                    <div className="mt-2.5 flex items-center gap-2 border-t border-accent/20 pt-2.5">
                      <span className="text-[11.5px] text-muted">셋업 연장(22:00~24:00, 전체 일정 공통)</span>
                      <button
                        type="button"
                        onClick={() => onChangeExtraSetupHours(Math.max(0, extraSetupHours - 1))}
                        className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-[12px] font-medium tabular-nums">{extraSetupHours}</span>
                      <button
                        type="button"
                        onClick={() => onChangeExtraSetupHours(Math.min(2, extraSetupHours + 1))}
                        className="h-6 w-6 rounded-sm border border-border text-[13px] text-muted hover:border-accent hover:text-accent"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-muted">시간 · {won(rateConfig.extraHourFee)}/시간</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-muted">
                    {days[openDate] ? (
                      days[openDate].role === "PERFORMANCE" && days[openDate].shows >= 3 ? (
                        <span className="text-warn">1일 {days[openDate].shows}회 — 운영자 확인 필요(자동 계산 제외)</span>
                      ) : (
                        <>
                          단가 {won(midHallReferencePrice(openDate, days[openDate].role, rateConfig))}
                          {days[openDate].role === "PERFORMANCE" && days[openDate].shows === 2
                            ? ` × ${Math.round(rateConfig.secondShowSurchargeRatio * 100)}% 할증(2회차)`
                            : ""}
                        </>
                      )
                    ) : (
                      "셋업 또는 공연일을 선택하면 날짜가 추가됩니다."
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-5 text-[14px] font-medium text-accent">
          선택 일자 {selectedDates.length}일(비연속 가능) · 셋업 {setupCount}일 · 공연{" "}
          {performanceDates.length}일 · 회차 합계 {showCount}
          {loadOutDayCount > 0 && ` · 철수 ${loadOutDayCount}일`}
          {extraSetupHours > 0 && ` · 셋업연장 ${extraSetupHours}시간`}
          {extraLoadOutHours > 0 && ` · 철수연장 ${extraLoadOutHours}시간`}
        </div>
      )}

      <p className="mt-5 text-[11.5px] leading-5 text-muted">
        대관료 포함 — 공연일 냉·난방(공연 1시간 전~종료) · 분장실 · 대기실 4개실 + 퀵체인지룸 ·
        로비 · 전기 · 수도 · 하우스 매니저 · 어셔. 브레이크타임 12:00~13:00 · 18:00~19:00에는 대관
        진행이 제한됩니다(시간 조정 협의 가능).
      </p>
    </div>
  );
}
