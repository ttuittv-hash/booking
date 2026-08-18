"use client";

import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock, MidHallDayRole, MidHallDaySelection } from "@/lib/pricing/types";

// [화면 뼈대 2026-08-18, 화면시나리오 PRICING/SCREEN 03·04] 중형은 패키지가 없다 — 날짜별
// 단가를 셀에 미리 노출한다(2-26). 아래 단가는 명세서 PRICING 표의 확정값이며, 화면 참고용
// 표시에만 쓴다. 실제 견적 산출(요금 엔진 연동)은 다음 단계 작업이다.
export const MID_HALL_REFERENCE_PRICE = {
  setup: 5_660_000, // 셋업 Load-In — 평일/주말 동일
  performanceWeekday: 8_060_000, // 공연 — 평일
  performanceWeekend: 11_780_000, // 공연 — 주말 (토·일 정의는 미정, 2-26)
  extraHour: 1_000_000, // 셋업 연장 · 철수 Load-Out — 시간당
};

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function isMidHallWeekend(iso: string): boolean {
  const day = new Date(iso).getDay();
  return day === 0 || day === 6;
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

export function midHallReferencePrice(iso: string, role: MidHallDayRole): number {
  if (role === "SETUP") return MID_HALL_REFERENCE_PRICE.setup;
  return isMidHallWeekend(iso) ? MID_HALL_REFERENCE_PRICE.performanceWeekend : MID_HALL_REFERENCE_PRICE.performanceWeekday;
}

export function MidHallCalendar({
  title,
  year,
  month,
  days,
  extraSetupHours,
  extraLoadOutHours,
  dateBlocks,
  overlayDates,
  overlayLabel,
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
  overlayDates?: Set<string>;
  overlayLabel?: string;
  onChangeMonth: (year: number, month: number) => void;
  onChangeDays: (days: Record<string, MidHallDaySelection>) => void;
  onChangeExtraSetupHours: (value: number) => void;
  onChangeExtraLoadOutHours: (value: number) => void;
}) {
  const weeks = buildMonthGrid(year, month);
  const blockedByDate = new Map(dateBlocks.map((b) => [b.date, b]));
  const today = new Date();
  const selectedDates = Object.keys(days).sort();
  const setupCount = selectedDates.filter((d) => days[d].role === "SETUP").length;
  const performanceDates = selectedDates.filter((d) => days[d].role === "PERFORMANCE");
  const showCount = performanceDates.reduce((sum, d) => sum + days[d].shows, 0);
  const overlapCount = overlayDates ? selectedDates.filter((d) => overlayDates.has(d)).length : 0;

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

  function toggleDate(iso: string) {
    if (blockedByDate.has(iso)) return;
    const next = { ...days };
    if (next[iso]) {
      delete next[iso];
    } else {
      next[iso] = { role: "PERFORMANCE", shows: 1 };
    }
    onChangeDays(next);
  }

  function setRole(iso: string, role: MidHallDayRole) {
    onChangeDays({ ...days, [iso]: { role, shows: role === "PERFORMANCE" ? (days[iso]?.shows ?? 1) : 1 } });
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
  }

  return (
    <div>
      {title && <h3 className="text-[15px] font-semibold">{title}</h3>}
      <p className="mt-1.5 text-[13px] text-muted">
        패키지가 없습니다 — 달력에서 날짜를 눌러 셋업/공연을 지정하세요. 최소 대관 일수 제한이
        없고 연속하지 않아도 됩니다.
      </p>

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

      <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
        {weeks.flatMap((week) =>
          week.map((date) => {
            const inMonth = date.getMonth() === month - 1;
            const iso = isoDate(date);
            const isToday = isoDate(today) === iso;
            const selection = days[iso];
            const blocked = blockedByDate.get(iso);
            const isOverlay = overlayDates?.has(iso) ?? false;
            return (
              <button
                key={iso}
                type="button"
                disabled={!inMonth || !!blocked}
                onClick={() => toggleDate(iso)}
                className={[
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm text-[12.5px] transition-colors sm:h-16",
                  !inMonth
                    ? "cursor-default text-transparent"
                    : blocked
                      ? "cursor-not-allowed text-muted line-through"
                      : selection
                        ? "cursor-pointer bg-accent-soft font-semibold text-accent"
                        : isOverlay
                          ? "cursor-pointer bg-panel-strong text-muted hover:text-foreground"
                          : "cursor-pointer text-foreground hover:bg-panel",
                  isToday ? "underline decoration-2 underline-offset-4" : "",
                ].join(" ")}
              >
                <span>{date.getDate()}</span>
                {inMonth && selection && (
                  <span className="text-[9.5px] font-medium">
                    {selection.role === "SETUP" ? "셋업" : `공연${selection.shows > 1 ? `×${selection.shows}` : ""}`}
                  </span>
                )}
                {inMonth && !selection && isOverlay && !blocked && (
                  <span className="text-[9px] text-muted">{overlayLabel ?? "겹침"}</span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {overlayDates && overlayDates.size > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-3 py-1.5 text-[12.5px] font-medium text-accent">
          {overlapCount > 0 ? `${overlayLabel ?? "아레나"}와 ${overlapCount}일 겹침` : `${overlayLabel ?? "아레나"}와 겹치지 않음`}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <label className="text-[12.5px] font-medium text-muted">시간 단위 추가 — 날짜 역할과 별개로 시간만 더합니다</label>
        <div className="mt-3 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted">셋업 연장 (22:00~24:00)</span>
            <button
              type="button"
              onClick={() => onChangeExtraSetupHours(Math.max(0, extraSetupHours - 1))}
              className="h-7 w-7 rounded-sm border border-border text-[14px] text-muted hover:border-accent hover:text-accent"
            >
              −
            </button>
            <span className="w-5 text-center text-[13px] font-medium tabular-nums">{extraSetupHours}</span>
            <button
              type="button"
              onClick={() => onChangeExtraSetupHours(Math.min(2, extraSetupHours + 1))}
              className="h-7 w-7 rounded-sm border border-border text-[14px] text-muted hover:border-accent hover:text-accent"
            >
              +
            </button>
            <span className="text-[11.5px] text-muted">시간</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted">철수 Load-Out (공연 종료 후)</span>
            <button
              type="button"
              onClick={() => onChangeExtraLoadOutHours(Math.max(0, extraLoadOutHours - 1))}
              className="h-7 w-7 rounded-sm border border-border text-[14px] text-muted hover:border-accent hover:text-accent"
            >
              −
            </button>
            <span className="w-5 text-center text-[13px] font-medium tabular-nums">{extraLoadOutHours}</span>
            <button
              type="button"
              onClick={() => onChangeExtraLoadOutHours(Math.min(6, extraLoadOutHours + 1))}
              className="h-7 w-7 rounded-sm border border-border text-[14px] text-muted hover:border-accent hover:text-accent"
            >
              +
            </button>
            <span className="text-[11.5px] text-muted">시간</span>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-muted">{won(MID_HALL_REFERENCE_PRICE.extraHour)}/시간 (참고용 — 요금 엔진 연동 후 확정)</p>
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <label className="text-[12.5px] font-medium text-muted">
            선택 일자 {selectedDates.length}일 (비연속 가능) · 셋업 {setupCount} · 공연 {performanceDates.length} · 회차 합계 {showCount}
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDates.map((iso) => {
              const sel = days[iso];
              return (
                <div key={iso} className="flex flex-col gap-1.5 rounded-sm border border-border bg-panel/60 px-2.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-foreground">
                      {formatDateLabel(iso)} {isMidHallWeekend(iso) ? <span className="text-muted">· 주말</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDate(iso)}
                      aria-label="삭제"
                      className="text-[11px] text-muted hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(["SETUP", "PERFORMANCE"] as MidHallDayRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRole(iso, role)}
                        className={[
                          "rounded-sm px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                          sel.role === role ? "bg-accent-soft text-accent" : "bg-panel-strong text-muted hover:text-foreground",
                        ].join(" ")}
                      >
                        {role === "SETUP" ? "셋업" : "공연"}
                      </button>
                    ))}
                    {sel.role === "PERFORMANCE" && (
                      <div className="ml-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShows(iso, sel.shows - 1)}
                          className="h-5 w-5 rounded-sm border border-border text-[11px] text-muted hover:border-accent hover:text-accent"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[11px] tabular-nums">{sel.shows}</span>
                        <button
                          type="button"
                          onClick={() => setShows(iso, sel.shows + 1)}
                          className="h-5 w-5 rounded-sm border border-border text-[11px] text-muted hover:border-accent hover:text-accent"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-muted">회차</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10.5px] text-muted">
                    참고 단가 {won(midHallReferencePrice(iso, sel.role))}
                    {sel.role === "PERFORMANCE" && sel.shows > 1 ? " × 50% 할증(2회차부터)" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            표시된 단가는 화면시나리오 v6.3 PRICING 표 참고용입니다. 실제 견적 계산(요금 엔진 연동)은
            다음 업데이트에서 반영됩니다.
          </p>
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
