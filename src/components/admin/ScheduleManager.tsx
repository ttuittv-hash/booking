"use client";

import { useEffect, useState } from "react";
import { findWeekTuesday, isoDate } from "@/lib/pricing/dateRange";
import type { WeekBlock } from "@/lib/pricing/types";

function weeksInMonth(year: number, month: number): number {
  let count = 0;
  for (let w = 1; w <= 6; w++) {
    if (findWeekTuesday({ year, month, weekOfMonth: w })) count = w;
    else break;
  }
  return count;
}

function weekRangeLabel(year: number, month: number, weekOfMonth: number): string {
  const tuesday = findWeekTuesday({ year, month, weekOfMonth });
  if (!tuesday) return "";
  const sunday = new Date(tuesday);
  sunday.setDate(tuesday.getDate() + 5);
  const [, tm, td] = isoDate(tuesday).split("-");
  const [, sm, sd] = isoDate(sunday).split("-");
  return `${Number(tm)}/${Number(td)} ~ ${Number(sm)}/${Number(sd)}`;
}

export function ScheduleManager({ initialYear }: { initialYear: number }) {
  const [year, setYear] = useState(initialYear);
  const [blocks, setBlocks] = useState<WeekBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/admin/schedule?year=${year}`)
      .then((res) => res.json())
      .then((data) => setBlocks(data.blocks ?? []))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [year]);

  function changeYear(next: number) {
    setLoading(true);
    setYear(next);
  }

  function keyOf(month: number, weekOfMonth: number) {
    return `${year}-${month}-${weekOfMonth}`;
  }

  function findBlock(month: number, weekOfMonth: number): WeekBlock | undefined {
    return blocks.find((b) => b.month === month && b.weekOfMonth === weekOfMonth);
  }

  async function block(month: number, weekOfMonth: number) {
    const key = keyOf(month, weekOfMonth);
    const reason = reasonDrafts[key]?.trim() || null;
    const res = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, weekOfMonth, reason }),
    });
    if (!res.ok) return;
    setBlocks((prev) => [...prev.filter((b) => !(b.month === month && b.weekOfMonth === weekOfMonth)), { year, month, weekOfMonth, reason }]);
  }

  async function unblock(month: number, weekOfMonth: number) {
    const res = await fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, weekOfMonth }),
    });
    if (!res.ok) return;
    setBlocks((prev) => prev.filter((b) => !(b.month === month && b.weekOfMonth === weekOfMonth)));
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => changeYear(year - 1)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          ‹ {year - 1}년
        </button>
        <div className="text-[16px] font-semibold">{year}년</div>
        <button
          type="button"
          onClick={() => changeYear(year + 1)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent"
        >
          {year + 1}년 ›
        </button>
        {loading && <span className="text-[12px] text-muted">불러오는 중...</span>}
      </div>

      <p className="mt-3 text-[12.5px] leading-6 text-muted">
        특정 주차를 막아두면(정기 대관, 내부 행사 등) 해당 주는 대관 신청 화면에서 선택할 수 없고,
        신청 제출도 서버에서 차단됩니다. 사유는 선택 입력이며 내부 참고용으로만 표시됩니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const count = weeksInMonth(year, month);
          return (
            <div key={month} className="rounded border border-border bg-panel/60 p-4">
              <div className="text-[14px] font-semibold">{month}월</div>
              <div className="mt-3 space-y-2">
                {Array.from({ length: count }, (_, i) => i + 1).map((weekOfMonth) => {
                  const key = keyOf(month, weekOfMonth);
                  const existing = findBlock(month, weekOfMonth);
                  const isBlocked = !!existing;
                  return (
                    <div key={weekOfMonth} className="rounded-sm border border-border/70 bg-background p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[12.5px] font-medium">{weekOfMonth}주차</div>
                          <div className="text-[11px] text-muted">{weekRangeLabel(year, month, weekOfMonth)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isBlocked ? unblock(month, weekOfMonth) : block(month, weekOfMonth))}
                          className={[
                            "shrink-0 rounded-sm px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                            isBlocked
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "border border-border text-muted hover:border-accent hover:text-accent",
                          ].join(" ")}
                        >
                          {isBlocked ? "막힘 · 열기" : "막기"}
                        </button>
                      </div>
                      {isBlocked ? (
                        <div className="mt-1.5 text-[11.5px] text-muted">
                          사유: {existing?.reason || "미입력"}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="사유 (선택, 예: 정기 대관)"
                          value={reasonDrafts[key] ?? ""}
                          onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="mt-1.5 w-full rounded-sm border border-border bg-panel px-2 py-1 text-[11.5px] outline-none focus:border-accent"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
