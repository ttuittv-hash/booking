"use client";

import { useEffect, useState } from "react";
import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function buildCalendarWeeks(year: number, month: number): Date[][] {
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

type VenueTab = "arena" | "medium-hall";
type DateStatus = "CONFIRMED" | "COMPETING" | null;

// 공지사항 "캘린더 보기" 아이콘에서 여는 레이어 — /admin/schedule(ScheduleManager)와
// 같은 날짜 그리드를 쓰지만 회사명·quoteId 등은 절대 보여주지 않는, 읽기 전용
// 대관 가능/불가 조회 화면이다(2026-08-23, "대관 현황 캘린더 > 레이블아이콘을
// 클릭시, 레이어로 캘린더가 열리게... 아레나/중형 구분되어있고").
function CalendarBody() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [venueTab, setVenueTab] = useState<VenueTab>("arena");
  const [blocks, setBlocks] = useState<DateBlock[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, { arena: number; mediumHall: number }>>({});
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
        setDemand(data.demand ?? {});
        setStatus(data.status ?? {});
      })
      .catch(() => {
        setBlocks([]);
        setOccupancy({});
        setDemand({});
        setStatus({});
      })
      .finally(() => setLoading(false));
  }, [year, month]);

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
    setYear(nextYear);
    setMonth(nextMonth);
  }

  const blockedByDate = new Map(
    blocks.filter((b) => b.venueId === venueTab || b.venueId === "ALL").map((b) => [b.date, b]),
  );
  const calendarWeeks = buildCalendarWeeks(year, month);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => goToMonth(-1)} className={btnClass("secondary", "sm")}>
          ‹ 이전 달
        </button>
        <div className="flex items-center gap-2">
          <span className="type-kr-heading text-h6-m">
            {year}년 {month}월
          </span>
          <span className="text-xs text-muted">{loading && "불러오는 중..."}</span>
        </div>
        <button type="button" onClick={() => goToMonth(1)} className={btnClass("secondary", "sm")}>
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

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className={["h-2 w-2 rounded-full", venueTab === "arena" ? "bg-accent" : "bg-good"].join(" ")} />
          {venueTab === "arena" ? "아레나 예약 있음" : "중형 예약 있음"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> 대관 불가 일정
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground" /> 대관사 확정
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warn" /> 경합 중
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
                const inMonth = date.getMonth() === month - 1;
                const dateStr = isoDate(date);
                const isBlocked = inMonth && !!blockedByDate.get(dateStr);
                const count = inMonth
                  ? venueTab === "arena"
                    ? (occupancy[dateStr]?.arena ?? 0)
                    : (occupancy[dateStr]?.mediumHall ?? 0)
                  : 0;
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
                    {inMonth && count > 0 && (
                      <span
                        className={[
                          "px-1 text-xs font-bold",
                          venueTab === "arena" ? "bg-accent-soft text-foreground" : "bg-good-soft text-good",
                        ].join(" ")}
                      >
                        {count}건
                      </span>
                    )}
                    {inMonth && dateStatus === "CONFIRMED" && (
                      <span className="text-center text-xs leading-tight font-bold text-foreground">
                        대관사 확정
                      </span>
                    )}
                    {inMonth && dateStatus === "COMPETING" && (
                      <span className="text-center text-xs leading-tight font-bold text-warn">
                        경합 중 · {companyCount}개사
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
export function BookingCalendarLauncher() {
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
              <CalendarBody />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
