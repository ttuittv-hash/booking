"use client";

import { useEffect, useState } from "react";
import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function buildCalendarWeeks(year: number, month: number, spillUntil?: string | null): Date[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month - 1, 1 - firstCol);
  // 이어 붙일 날짜가 6주 격자 밖이면 주를 더 둔다(12월이 화요일 시작이면 6주엔 1/10 까지만 들어간다).
  let weekCount = 6;
  if (spillUntil) {
    const last = new Date(gridStart);
    last.setDate(gridStart.getDate() + 6 * 7 - 1);
    while (isoDate(last) < spillUntil && weekCount < 8) {
      weekCount++;
      last.setDate(last.getDate() + 7);
    }
  }
  const weeks: Date[][] = [];
  for (let w = 0; w < weekCount; w++) {
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

type VenueTab = "arena" | "medium-hall";
type DateStatus = "CONFIRMED" | "COMPETING" | "REVIEWING" | null;

// 공지사항 "캘린더 보기" 아이콘에서 여는 레이어 — /admin/schedule(ScheduleManager)와
// 같은 날짜 그리드를 쓰지만 회사명·quoteId 등은 절대 보여주지 않는, 읽기 전용
// 대관 가능/불가 조회 화면이다(2026-08-23, "대관 현황 캘린더 > 레이블아이콘을
// 클릭시, 레이어로 캘린더가 열리게... 아레나/중형 구분되어있고").
/** `"2027-07"` → `[2027, 7]`. 형식이 아니면 null. */
function parseMonthKey(value: string | null | undefined): [number, number] | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return [Number(m[1]), month];
}

function monthKey(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export interface CalendarMonthRange {
  /** 처음 열었을 때 보여 줄 달 (`YYYY-MM`). 비우면 이번 달 */
  initialMonth?: string | null;
  /** 넘겨 볼 수 있는 첫 달 · 마지막 달. 비우면 그쪽 제한 없음 */
  startMonth?: string | null;
  endMonth?: string | null;
  /** 마지막 달 격자 끝에 이어 붙일 다음 달 마지막 날(`YYYY-MM-DD`). endMonth 가 있을 때만 의미 있다 */
  endDay?: string | null;
}

function CalendarBody({ initialMonth, startMonth, endMonth, endDay }: CalendarMonthRange) {
  const now = new Date();
  const opening = parseMonthKey(initialMonth) ?? [now.getFullYear(), now.getMonth() + 1];
  const [year, setYear] = useState(opening[0]);
  const [month, setMonth] = useState(opening[1]);
  const [venueTab, setVenueTab] = useState<VenueTab>("arena");
  const [blocks, setBlocks] = useState<DateBlock[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, { arena: number; mediumHall: number }>>({});
  // 확정 건수 — 어드민 일정 관리와 같은 [확정 n][심사 n] 표기를 쓰기 위해 따로 받는다.
  const [confirmed, setConfirmed] = useState<Record<string, { arena: number; mediumHall: number }>>({});
  const [demand, setDemand] = useState<Record<string, { arena: number; mediumHall: number }>>({});
  const [status, setStatus] = useState<Record<string, { arena: DateStatus; mediumHall: DateStatus }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 월 이동 시 새 데이터를 받기 전까지 로딩 표시
    setLoading(true);
    fetch(`/api/schedule?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setOccupancy(data.occupancy ?? {});
        setConfirmed(data.confirmed ?? {});
        setDemand(data.demand ?? {});
        setStatus(data.status ?? {});
      })
      .catch(() => {
        setBlocks([]);
        setOccupancy({});
        setConfirmed({});
        setDemand({});
        setStatus({});
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  function stepMonth(delta: number): [number, number] {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    return [nextYear, nextMonth];
  }

  // 운영자가 정한 노출 월 밖으로는 넘어가지 않는다(2026-09-02) — 이번 회차에 신청받는
  // 달만 보여 준다. 서버(/api/schedule)도 같은 범위를 다시 검사한다.
  function canGo(delta: number): boolean {
    const [y, m] = stepMonth(delta);
    const key = monthKey(y, m);
    if (startMonth && key < startMonth) return false;
    if (endMonth && key > endMonth) return false;
    return true;
  }

  function goToMonth(delta: number) {
    if (!canGo(delta)) return;
    const [nextYear, nextMonth] = stepMonth(delta);
    setYear(nextYear);
    setMonth(nextMonth);
  }

  const blockedByDate = new Map(
    blocks.filter((b) => b.venueId === venueTab || b.venueId === "ALL").map((b) => [b.date, b]),
  );
  const spillUntil = endDay && endMonth && monthKey(year, month) === endMonth ? endDay : null;
  const lastOfMonth = new Date(year, month, 0);
  const calendarWeeks = buildCalendarWeeks(year, month, spillUntil);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          disabled={!canGo(-1)}
          className={`${btnClass("secondary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ‹ 이전 달
        </button>
        <div className="flex items-center gap-2">
          <span className="type-kr-heading text-h6-m">
            {year}년 {month}월
          </span>
          <span className="text-xs text-muted">{loading && "불러오는 중..."}</span>
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          disabled={!canGo(1)}
          className={`${btnClass("secondary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          다음 달 ›
        </button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border-soft">
        {(["arena", "medium-hall"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVenueTab(tab)}
            className={[
              "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
              venueTab === tab
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab === "arena" ? "아레나" : "중형공연장"}
          </button>
        ))}
      </div>

      {/* [개정 2026-09-02] 어드민 일정 관리와 같은 세 마디를 쓴다 — 같은 날을 두고
          한쪽은 "대관사 확정", 한쪽은 "1건" 이라고 말하면 어느 쪽이 맞는지 알 수 없다. */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground" /> 대관사 확정
        </span>
        <span className="flex items-center gap-1.5">
          <span className={["h-2 w-2 rounded-full", venueTab === "arena" ? "bg-accent" : "bg-good"].join(" ")} />
          심사 중
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> 대관 불가 일정
        </span>
      </div>

      <div className="mt-4 border border-border-soft bg-panel/60 p-5">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted">
          {DOW_LABELS.map((label, i) => (
            <div key={label} className={i === 6 ? "opacity-50" : ""}>
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1.5 space-y-1.5">
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((date) => {
                const dateStr = isoDate(date);
                // 마지막 달이면 endDay 까지의 다음 달 날짜도 "이달"처럼 다룬다(팀 요청: 1월 초순만 12월 뒤에).
                const spill = !!spillUntil && date > lastOfMonth && dateStr <= spillUntil;
                const inMonth = date.getMonth() === month - 1 || spill;
                const isBlocked = inMonth && !!blockedByDate.get(dateStr);
                const count = inMonth
                  ? venueTab === "arena"
                    ? (occupancy[dateStr]?.arena ?? 0)
                    : (occupancy[dateStr]?.mediumHall ?? 0)
                  : 0;
                const confirmedCount = inMonth
                  ? venueTab === "arena"
                    ? (confirmed[dateStr]?.arena ?? 0)
                    : (confirmed[dateStr]?.mediumHall ?? 0)
                  : 0;
                const reviewingCount = Math.max(0, count - confirmedCount);
                const companyCount = inMonth
                  ? venueTab === "arena"
                    ? (demand[dateStr]?.arena ?? 0)
                    : (demand[dateStr]?.mediumHall ?? 0)
                  : 0;
                const dateStatus: DateStatus = inMonth
                  ? venueTab === "arena"
                    ? (status[dateStr]?.arena ?? null)
                    : (status[dateStr]?.mediumHall ?? null)
                  : null;
                return (
                  <div
                    key={dateStr}
                    className={[
                      "flex min-h-20 flex-col items-center justify-center gap-1 px-1 py-1.5 text-s",
                      !inMonth
                        ? "text-muted/30"
                        : isBlocked
                          ? "bg-danger-soft font-bold text-danger"
                          : "text-foreground",
                    ].join(" ")}
                  >
                    <span className={isBlocked ? "line-through" : ""}>{date.getDate()}</span>
                    {/* 어드민 일정 관리와 같은 표기 — [확정 n][심사 n] */}
                    {inMonth && count > 0 && (
                      <span className="flex items-center gap-0.5">
                        {confirmedCount > 0 && (
                          <span className="bg-foreground px-1 text-xs font-bold text-background">
                            확정 {confirmedCount}
                          </span>
                        )}
                        {reviewingCount > 0 && (
                          <span
                            className={[
                              "px-1 text-xs font-bold",
                              venueTab === "arena"
                                ? "bg-accent-soft text-foreground"
                                : "bg-good-soft text-good",
                            ].join(" ")}
                          >
                            심사 {reviewingCount}
                          </span>
                        )}
                      </span>
                    )}
                    {/* [수정 2026-09-02] 뱃지가 이미 "확정 1 / 심사 1" 이라고 말한다 —
                        그 아래 "대관사 확정 / 심사 중" 을 또 적으면 같은 말이 두 줄이다.
                        뱃지에 없는 사실(몇 개사가 겹쳤는지)만 덧붙인다. */}
                    {inMonth && dateStatus === "COMPETING" && (
                      <span className="text-center text-xs leading-tight text-muted">
                        {companyCount}개사 경합
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 공지사항 상세의 캘린더 아이콘 — 누르면 대관 현황 캘린더를 레이어로 연다. */
export function BookingCalendarLauncher(range: CalendarMonthRange) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-border-soft px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-foreground"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
          <rect x="2" y="3" width="12" height="11" strokeWidth="1.3" />
          <path d="M2 6.5h12M5 1.5v3M11 1.5v3" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        대관 현황 캘린더
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="대관 현황 캘린더"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-border bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-kr-heading text-h6-m">대관 현황 캘린더</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-xs text-muted hover:text-foreground"
              >
                닫기 ✕
              </button>
            </div>
            <div className="mt-4">
              <CalendarBody {...range} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
