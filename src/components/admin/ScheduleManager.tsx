"use client";

import { useEffect, useState } from "react";
import type { WeekBlock } from "@/lib/pricing/types";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// JS Date.getDay(): 0=일 1=월 ... 6=토 → 월(1)을 0번 컬럼으로 매핑 (신청 화면 달력과 동일 규칙)
function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

interface CalendarWeek {
  days: Date[];
  weekOfMonth: number | null;
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
    const startsInMonth = days[1].getMonth() === month - 1;
    if (startsInMonth) counter++;
    weeks.push({ days, weekOfMonth: startsInMonth ? counter : null });
  }
  return weeks;
}

export function ScheduleManager({ initialYear, initialMonth }: { initialYear: number; initialMonth: number }) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [blocks, setBlocks] = useState<WeekBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/admin/schedule?year=${year}`)
      .then((res) => res.json())
      .then((data) => setBlocks(data.blocks ?? []))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [year]);

  function goToMonth(delta: number) {
    setLoading(true);
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setMonth(nextMonth);
    if (nextYear !== year) setYear(nextYear);
    else setLoading(false);
  }

  function findBlock(weekOfMonth: number): WeekBlock | undefined {
    return blocks.find((b) => b.month === month && b.weekOfMonth === weekOfMonth);
  }

  async function block(weekOfMonth: number) {
    const reason = reasonDrafts[weekOfMonth]?.trim() || null;
    const res = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, weekOfMonth, reason }),
    });
    if (!res.ok) return;
    setBlocks((prev) => [...prev.filter((b) => !(b.month === month && b.weekOfMonth === weekOfMonth)), { year, month, weekOfMonth, reason }]);
  }

  async function unblock(weekOfMonth: number) {
    const res = await fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, weekOfMonth }),
    });
    if (!res.ok) return;
    setBlocks((prev) => prev.filter((b) => !(b.month === month && b.weekOfMonth === weekOfMonth)));
  }

  function toggleWeek(weekOfMonth: number) {
    if (findBlock(weekOfMonth)) unblock(weekOfMonth);
    else block(weekOfMonth);
  }

  const calendarWeeks = buildCalendarWeeks(year, month);
  const today = new Date();

  function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ‹ 이전 달
        </button>
        <div className="text-[16px] font-semibold">
          {year}년 {month}월{loading && <span className="ml-2 text-[12px] font-normal text-muted">불러오는 중...</span>}
        </div>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          다음 달 ›
        </button>
      </div>

      <p className="mt-3 text-[12.5px] leading-6 text-muted">
        주(화~일) 행을 클릭해 대관 신청 가능/불가를 전환하세요. 막힌 주는 대관 신청 화면 달력에서
        선택할 수 없고, 신청 제출도 서버에서 차단됩니다. 사유는 선택 입력이며 내부 참고용입니다.
      </p>

      <div className="mt-6 max-w-2xl">
        <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] font-medium text-muted">
          {DOW_LABELS.map((label, i) => (
            <div key={label} className={i === 6 ? "opacity-50" : ""}>
              {label}
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-2">
          {calendarWeeks.map((calWeek, wi) => {
            const isSelectable = calWeek.weekOfMonth !== null;
            const existing = isSelectable ? findBlock(calWeek.weekOfMonth!) : undefined;
            const isBlocked = !!existing;
            return (
              <div key={wi}>
                <button
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => calWeek.weekOfMonth !== null && toggleWeek(calWeek.weekOfMonth)}
                  className={[
                    "grid w-full grid-cols-7 gap-1 rounded-sm border p-1 text-left transition-colors",
                    !isSelectable
                      ? "cursor-default border-transparent"
                      : isBlocked
                        ? "cursor-pointer border-red-200 bg-red-50 hover:bg-red-100"
                        : "cursor-pointer border-border hover:border-accent/50 hover:bg-panel",
                  ].join(" ")}
                >
                  {calWeek.days.map((date, di) => {
                    const inMonth = date.getMonth() === month - 1;
                    const isSunday = di === 6;
                    const isToday = isSameDate(date, today);
                    return (
                      <div
                        key={di}
                        className={[
                          "flex h-9 items-center justify-center rounded-sm text-[12.5px]",
                          isBlocked && inMonth
                            ? "text-red-500 line-through"
                            : !inMonth
                              ? "text-muted/40"
                              : isSunday
                                ? "text-muted/70"
                                : "text-foreground",
                          isToday ? "underline decoration-2 underline-offset-4" : "",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </button>
                {isSelectable && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <span className={`text-[11px] font-medium ${isBlocked ? "text-red-600" : "text-muted"}`}>
                      {calWeek.weekOfMonth}주차 {isBlocked ? "· 대관 불가" : "· 대관 가능"}
                    </span>
                    {isBlocked ? (
                      <span className="text-[11px] text-muted">사유: {existing?.reason || "미입력"}</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="막을 때 사유 (선택, 예: 정기 대관)"
                        value={reasonDrafts[calWeek.weekOfMonth!] ?? ""}
                        onChange={(e) =>
                          setReasonDrafts((prev) => ({ ...prev, [calWeek.weekOfMonth!]: e.target.value }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 rounded-sm border border-border bg-panel px-2 py-1 text-[11px] outline-none focus:border-accent"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
