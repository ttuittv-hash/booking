"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock } from "@/lib/pricing/types";

interface ScheduleOccupancyEntry {
  quoteId: string;
  venueId: "arena" | "medium-hall";
  role: string | null;
  status: string;
  reviewDecision: string | null;
  companyName: string;
}

const DOW_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

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

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

function venueLabel(venueId: "arena" | "medium-hall"): string {
  return venueId === "arena" ? "아레나" : "중형";
}

function roleLabel(role: string | null): string {
  if (role === "PREP" || role === "SETUP") return "셋업";
  if (role === "LOAD_OUT") return "철수";
  if (role === "PERFORMANCE") return "공연";
  return "미지정";
}

function statusLabel(status: string, reviewDecision: string | null): string {
  if (reviewDecision === "REJECTED") return "반려";
  if (reviewDecision === "HOLD") return "보류";
  if (status === "SETTLED") return "정산완료";
  if (status === "CONTRACTED") return "계약";
  if (reviewDecision === "APPROVED") return "승인";
  return "심사중";
}

export function ScheduleManager({ initialYear, initialMonth }: { initialYear: number; initialMonth: number }) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [blocks, setBlocks] = useState<DateBlock[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, ScheduleOccupancyEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [venueTab, setVenueTab] = useState<"arena" | "medium-hall">("arena");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 월 이동 시 새 데이터를 받기 전까지 로딩 표시
    setLoading(true);
    fetch(`/api/admin/schedule?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setOccupancy(data.occupancy ?? {});
      })
      .catch(() => {
        setBlocks([]);
        setOccupancy({});
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

  const blockedByDate = new Map(blocks.map((b) => [b.date, b]));
  const calendarWeeks = buildCalendarWeeks(year, month);
  const today = new Date();

  function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function blockOpenDate() {
    if (!openDate) return;
    const res = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: openDate, reason: reasonDraft.trim() || null }),
    });
    if (!res.ok) return;
    setBlocks((prev) => [...prev.filter((b) => b.date !== openDate), { date: openDate, reason: reasonDraft.trim() || null }]);
    setReasonDraft("");
  }

  async function unblockOpenDate() {
    if (!openDate) return;
    const res = await fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: openDate }),
    });
    if (!res.ok) return;
    setBlocks((prev) => prev.filter((b) => b.date !== openDate));
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
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">
            {year}년 {month}월
          </span>
          <span className="text-[12px] text-muted">{loading && "불러오는 중..."}</span>
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
        공간마다 예약 구조가 달라 탭으로 나눠 보여줍니다. 날짜를 누르면 그 날짜의 예약 현황을
        확인하고, 대관 신청 가능/불가를 바로 전환할 수 있습니다(신청 불가 설정은 공간과
        무관하게 그 날짜 전체에 적용됩니다). 막힌 날짜가 하나라도 포함된 주는 아레나 신청 화면
        달력에서 선택할 수 없고, 중형공연장은 해당 날짜만 선택할 수 없습니다.
      </p>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(["arena", "medium-hall"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVenueTab(tab)}
            className={[
              "border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
              venueTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab === "arena" ? "아레나" : "중형공연장"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className={["h-2 w-2 rounded-full", venueTab === "arena" ? "bg-accent" : "bg-good"].join(" ")} />
          {venueTab === "arena" ? "아레나 예약" : "중형 예약"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> 신청 불가(관리자 지정 · 공간 공통)
        </span>
      </div>

      <div className="mt-5 rounded border border-border bg-panel/60 p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
          {DOW_LABELS.map((label, i) => (
            <div key={label} className={i === 6 ? "opacity-50" : ""}>
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 space-y-1">
          {calendarWeeks.map((week, wi) => {
            const openInThisRow = openDate && week.some((d) => isoDate(d) === openDate);
            return (
              <div key={wi}>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((date) => {
                    const inMonth = date.getMonth() === month - 1;
                    const dateStr = isoDate(date);
                    const existingBlock = inMonth ? blockedByDate.get(dateStr) : undefined;
                    const isBlocked = !!existingBlock;
                    const entries = (occupancy[dateStr] ?? []).filter((e) => e.venueId === venueTab);
                    const isToday = isSameDate(date, today);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!inMonth}
                        onClick={() => {
                          setOpenDate(openDate === dateStr ? null : dateStr);
                          setReasonDraft(existingBlock?.reason ?? "");
                        }}
                        className={[
                          "flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm px-1 text-[12.5px] transition-colors",
                          !inMonth
                            ? "cursor-default text-muted/30"
                            : isBlocked
                              ? "cursor-pointer bg-red-50 font-medium text-red-500 hover:bg-red-100"
                              : "cursor-pointer text-foreground hover:bg-panel-strong",
                          isToday ? "underline decoration-2 underline-offset-4" : "",
                          openDate === dateStr ? "ring-2 ring-accent" : "",
                        ].join(" ")}
                      >
                        <span className={isBlocked ? "line-through" : ""}>{date.getDate()}</span>
                        {inMonth && entries.length > 0 && (
                          <span
                            className={[
                              "rounded-sm px-1 text-[9px] font-semibold",
                              venueTab === "arena" ? "bg-accent-soft text-accent" : "bg-good-soft text-good",
                            ].join(" ")}
                          >
                            {entries.length}건
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {openInThisRow && openDate && (
                  <div className="mt-1.5 rounded-sm border border-accent bg-accent-soft/40 px-3.5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-foreground">{formatDateLabel(openDate)}</div>
                      <button
                        type="button"
                        onClick={() => setOpenDate(null)}
                        aria-label="닫기"
                        className="text-[12px] text-muted hover:text-foreground"
                      >
                        닫기 ✕
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-3 border-t border-accent/20 pt-3 sm:grid-cols-2 sm:divide-x sm:divide-accent/20">
                      <div className="sm:pr-3">
                        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                          상태
                        </div>
                        {(() => {
                          const allEntries = occupancy[openDate] ?? [];
                          const tabEntries = allEntries.filter((e) => e.venueId === venueTab);
                          const otherVenueCount = allEntries.length - tabEntries.length;
                          return tabEntries.length === 0 ? (
                            <p className="text-[12px] text-muted">
                              이 날짜에 {venueLabel(venueTab)} 예약이 없습니다.
                              {otherVenueCount > 0 && ` (다른 공간 예약 ${otherVenueCount}건 있음 — 탭 전환해서 확인)`}
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {tabEntries.map((entry, i) => (
                                <li
                                  key={`${entry.quoteId}-${i}`}
                                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm bg-background px-2.5 py-1.5 text-[12px]"
                                >
                                  <span className="text-muted">{roleLabel(entry.role)}</span>
                                  <Link href={`/admin/${entry.quoteId}`} className="font-medium text-foreground hover:text-accent hover:underline">
                                    {entry.companyName}
                                  </Link>
                                  <span className="text-[10.5px] text-muted">· {statusLabel(entry.status, entry.reviewDecision)}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>

                      <div className="sm:pl-3">
                        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                          설정
                        </div>
                        {blockedByDate.get(openDate) ? (
                          <div className="space-y-2">
                            <p className="text-[12px] text-red-600">
                              신청 불가로 지정됨
                              {blockedByDate.get(openDate)?.reason ? ` · ${blockedByDate.get(openDate)?.reason}` : ""}
                            </p>
                            <button
                              type="button"
                              onClick={unblockOpenDate}
                              className="rounded-sm bg-panel-strong px-3 py-1.5 text-[12px] font-medium text-muted hover:text-foreground"
                            >
                              신청 가능으로 되돌리기
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={reasonDraft}
                              onChange={(e) => setReasonDraft(e.target.value)}
                              placeholder="막을 사유(선택) — 예: 정기 대관, 내부 행사"
                              className="min-w-0 flex-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              onClick={blockOpenDate}
                              className="shrink-0 rounded-sm bg-panel-strong px-3 py-1.5 text-[12px] font-medium text-muted hover:text-red-600"
                            >
                              이 날짜 막기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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
