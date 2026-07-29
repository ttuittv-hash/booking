"use client";

import { useEffect, useState } from "react";
import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock } from "@/lib/pricing/types";

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toColumnIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

interface CalendarWeek {
  days: Date[];
}

function buildCalendarWeeks(year: number, month: number): CalendarWeek[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = toColumnIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month - 1, 1 - firstCol);

  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      days.push(date);
    }
    weeks.push({ days });
  }
  return weeks;
}

function MonthCalendar({
  year,
  month,
  blockedByDate,
  reasonDrafts,
  setReasonDrafts,
  onToggle,
}: {
  year: number;
  month: number;
  blockedByDate: Map<string, DateBlock>;
  reasonDrafts: Record<string, string>;
  setReasonDrafts: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onToggle: (date: string) => void;
}) {
  const calendarWeeks = buildCalendarWeeks(year, month);
  const today = new Date();

  function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-4">
      <div className="text-[14px] font-semibold">
        {year}년 {month}월
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {DOW_LABELS.map((label, i) => (
          <div key={label} className={i === 6 ? "opacity-50" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 space-y-0.5">
        {calendarWeeks.map((calWeek, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {calWeek.days.map((date, di) => {
              const inMonth = date.getMonth() === month - 1;
              const dateStr = isoDate(date);
              const existing = inMonth ? blockedByDate.get(dateStr) : undefined;
              const isBlocked = !!existing;
              const isSunday = di === 6;
              const isToday = isSameDate(date, today);
              return (
                <button
                  key={di}
                  type="button"
                  disabled={!inMonth}
                  title={
                    !inMonth
                      ? undefined
                      : isBlocked
                        ? `대관 불가${existing?.reason ? ` · ${existing.reason}` : ""} (클릭해서 열기)`
                        : `${reasonDrafts[dateStr] ? `사유: ${reasonDrafts[dateStr]} — ` : ""}클릭해서 막기`
                  }
                  onClick={() => inMonth && onToggle(dateStr)}
                  className={[
                    "flex h-9 items-center justify-center rounded-sm text-[12.5px] transition-colors",
                    !inMonth
                      ? "cursor-default text-muted/30"
                      : isBlocked
                        ? "cursor-pointer bg-red-50 font-medium text-red-500 line-through hover:bg-red-100"
                        : "cursor-pointer text-foreground hover:bg-panel-strong",
                    isToday ? "underline decoration-2 underline-offset-4" : "",
                    isSunday && inMonth && !isBlocked ? "text-muted/70" : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] text-muted">막을 때 적용할 사유 (선택)</span>
        <input
          type="text"
          placeholder="예: 정기 대관, 내부 행사"
          value={reasonDrafts[`${year}-${month}`] ?? ""}
          onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [`${year}-${month}`]: e.target.value }))}
          className="w-full rounded-sm border border-border bg-panel px-2 py-1.5 text-[12px] outline-none focus:border-accent"
        />
      </label>
    </div>
  );
}

export function ScheduleManager({ initialYear, initialMonth }: { initialYear: number; initialMonth: number }) {
  const [startYear, setStartYear] = useState(initialYear);
  const [startMonth, setStartMonth] = useState(initialMonth);
  const [blocks, setBlocks] = useState<DateBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/schedule")
      .then((res) => res.json())
      .then((data) => setBlocks(data.blocks ?? []))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, []);

  function shiftMonth(base: { year: number; month: number }, delta: number) {
    let month = base.month + delta;
    let year = base.year;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    return { year, month };
  }

  function goToMonth(delta: number) {
    setLoading(true);
    const next = shiftMonth({ year: startYear, month: startMonth }, delta);
    setStartYear(next.year);
    setStartMonth(next.month);
    setLoading(false);
  }

  const blockedByDate = new Map(blocks.map((b) => [b.date, b]));
  const secondMonth = shiftMonth({ year: startYear, month: startMonth }, 1);

  async function toggle(date: string) {
    const existing = blockedByDate.get(date);
    if (existing) {
      const res = await fetch("/api/admin/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) return;
      setBlocks((prev) => prev.filter((b) => b.date !== date));
    } else {
      const [y, m] = date.split("-").map(Number);
      const reason = reasonDrafts[`${y}-${m}`]?.trim() || null;
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason }),
      });
      if (!res.ok) return;
      setBlocks((prev) => [...prev.filter((b) => b.date !== date), { date, reason }]);
    }
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
        <span className="text-[12px] text-muted">{loading && "불러오는 중..."}</span>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          다음 달 ›
        </button>
      </div>

      <p className="mt-3 text-[12.5px] leading-6 text-muted">
        날짜를 클릭해 대관 신청 가능/불가를 날짜 단위로 전환하세요. 막힌 날짜가 하나라도 포함된
        주는 대관 신청 화면 달력에서 선택할 수 없고, 신청 제출도 서버에서 차단됩니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthCalendar
          year={startYear}
          month={startMonth}
          blockedByDate={blockedByDate}
          reasonDrafts={reasonDrafts}
          setReasonDrafts={setReasonDrafts}
          onToggle={toggle}
        />
        <MonthCalendar
          year={secondMonth.year}
          month={secondMonth.month}
          blockedByDate={blockedByDate}
          reasonDrafts={reasonDrafts}
          setReasonDrafts={setReasonDrafts}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}
