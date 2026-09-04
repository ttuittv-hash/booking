"use client";

import { scheduleLegend, type ScheduleLegend } from "@/lib/content/scheduleLegend";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isoDate } from "@/lib/pricing/dateRange";
import type { DateBlock } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { FIELD_SM } from "./adminUi";

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

/**
 * 날짜 칸을 열었을 때의 묶음 (2026-09-02).
 *
 * 예전에는 그 날짜에 걸린 신청서를 한 줄씩 죽 늘어놓기만 해서, 운영자가 "이 날이
 * 잡힌 날인지 아직 겨루는 중인지"를 줄마다 꼬리표를 읽어 판단해야 했다.
 * 대관 확정 · 심사 중 · 대관 불가 일정 셋으로 나눠 보여 준다.
 */
type DayGroupKey = "CONFIRMED" | "REVIEWING";

const DAY_GROUP_LABEL: Record<DayGroupKey, string> = {
  CONFIRMED: "대관 확정",
  REVIEWING: "심사 중",
};

/** 승인·계약·정산은 이미 이 날짜를 내준 것이다 — 나머지는 아직 겨루는 중이다. */
function dayGroupOf(entry: ScheduleOccupancyEntry): DayGroupKey {
  if (entry.reviewDecision === "APPROVED") return "CONFIRMED";
  if (entry.status === "CONTRACTED" || entry.status === "SETTLED") return "CONFIRMED";
  return "REVIEWING";
}

export function ScheduleManager({
  initialYear,
  initialMonth,
  legend: legendProp,
}: {
  initialYear: number;
  initialMonth: number;
  legend?: ScheduleLegend | null;
}) {
  const legend = legendProp ?? scheduleLegend(null);
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

  // 이 탭(공간) 전용 설정 또는 공간공통(ALL, 과거 이관 데이터)만 이 탭에 보인다 —
  // 아레나에서 막은 날짜가 중형공연장 탭에서는 그대로 신청 가능으로 보여야 한다.
  const blockedByDate = new Map(
    blocks.filter((b) => b.venueId === venueTab || b.venueId === "ALL").map((b) => [b.date, b]),
  );
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
      body: JSON.stringify({ date: openDate, venueId: venueTab, reason: reasonDraft.trim() || null }),
    });
    if (!res.ok) return;
    setBlocks((prev) => [
      ...prev.filter((b) => !(b.date === openDate && (b.venueId === venueTab || b.venueId === "ALL"))),
      { date: openDate, venueId: venueTab, reason: reasonDraft.trim() || null },
    ]);
    setReasonDraft("");
  }

  async function unblockOpenDate() {
    if (!openDate) return;
    const res = await fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: openDate, venueId: venueTab }),
    });
    if (!res.ok) return;
    setBlocks((prev) => prev.filter((b) => !(b.date === openDate && (b.venueId === venueTab || b.venueId === "ALL"))));
  }

  return (
    <div className="mt-8">
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
        <button
          type="button"
          onClick={() => goToMonth(1)}
          className={btnClass("secondary", "sm")}
        >
          다음 달 ›
        </button>
      </div>

      <p className="mt-3 text-xs leading-6 text-muted">
        공간마다 예약 구조가 달라 탭으로 나눠 보여줍니다. 날짜를 누르면 그 날짜의 예약 현황을
        확인하고, 대관 불가 일정으로 설정하거나 되돌릴 수 있습니다(공간별로 각각 설정 —
        아레나에서 대관 불가로 설정해도 중형공연장은 그대로 신청받을 수 있습니다). 대관 불가
        일정이 하나라도 포함된 주는 아레나 신청 화면 달력에서 선택할 수 없고, 중형공연장은
        해당 날짜만 선택할 수 없습니다.
      </p>

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
          <span className={["h-2 w-2 rounded-full", legend.confirmed.dot].join(" ")} /> {legend.confirmed.label}(승인 · 계약 · 정산)
        </span>
        <span className="flex items-center gap-1.5">
          <span className={["h-2 w-2 rounded-full", legend.reviewing.dot ?? (venueTab === "arena" ? "bg-accent" : "bg-good")].join(" ")} />
          {legend.reviewing.label}({venueLabel(venueTab)} 신청)
        </span>
        <span className="flex items-center gap-1.5">
          <span className={["h-2 w-2 rounded-full", legend.blocked.dot].join(" ")} /> {legend.blocked.label}(관리자 지정 · {venueLabel(venueTab)} 전용)
        </span>
      </div>

      <div className="mt-5 border border-border-soft bg-panel/60 p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
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
                    const confirmedCount = entries.filter((e) => dayGroupOf(e) === "CONFIRMED").length;
                    const reviewingCount = entries.length - confirmedCount;
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
                          "flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs transition-colors",
                          !inMonth
                            ? "cursor-default text-muted/30"
                            : isBlocked
                              ? "cursor-pointer bg-danger-soft font-bold text-danger hover:bg-danger-soft"
                              : "cursor-pointer text-foreground hover:bg-panel-strong",
                          isToday ? "underline decoration-2 underline-offset-4" : "",
                          openDate === dateStr ? "ring-2 ring-accent" : "",
                        ].join(" ")}
                      >
                        <span className={isBlocked ? "line-through" : ""}>{date.getDate()}</span>
                        {/* [개정 2026-09-02] "N건" 한 덩어리로는 잡힌 날인지 겨루는
                            날인지 알 수 없었다. 확정과 심사 중을 갈라 놓는다. */}
                        {inMonth && entries.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            {confirmedCount > 0 && (
                              <span
                                className={[legend.confirmed.badge, "px-1 text-xs font-bold"].join(" ")}
                                title={legend.confirmed.label}
                              >
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
                                title="심사 중"
                              >
                                심사 {reviewingCount}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {openInThisRow && openDate && (
                  <div className="mt-1.5 border border-accent bg-accent-soft/40 px-3.5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-s font-bold text-foreground">{formatDateLabel(openDate)}</div>
                      <button
                        type="button"
                        onClick={() => setOpenDate(null)}
                        aria-label="닫기"
                        className="text-xs text-muted hover:text-foreground"
                      >
                        닫기 ✕
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-3 border-t border-accent/20 pt-3 sm:grid-cols-2 sm:divide-x sm:divide-accent/20">
                      <div className="sm:pr-3">
                        <div className="mb-1.5 text-xs font-bold text-muted">
                          상태
                        </div>
                        {(() => {
                          const allEntries = occupancy[openDate] ?? [];
                          const tabEntries = allEntries.filter((e) => e.venueId === venueTab);
                          const otherVenueCount = allEntries.length - tabEntries.length;
                          const block = blockedByDate.get(openDate);
                          const grouped: Record<DayGroupKey, ScheduleOccupancyEntry[]> = {
                            CONFIRMED: [],
                            REVIEWING: [],
                          };
                          for (const entry of tabEntries) grouped[dayGroupOf(entry)].push(entry);
                          const hasAny = tabEntries.length > 0 || !!block;

                          return !hasAny ? (
                            <p className="text-xs text-muted">
                              이 날짜에 {venueLabel(venueTab)} 예약이 없습니다.
                              {otherVenueCount > 0 && ` (다른 공간 예약 ${otherVenueCount}건 있음 — 탭 전환해서 확인)`}
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {(["CONFIRMED", "REVIEWING"] as const).map((key) =>
                                grouped[key].length === 0 ? null : (
                                  <div key={key}>
                                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                                      <span
                                        className={`h-2 w-2 rounded-full ${
                                          key === "CONFIRMED" ? "bg-foreground" : "bg-warn"
                                        }`}
                                      />
                                      {DAY_GROUP_LABEL[key]}
                                      <span className="font-normal text-muted">
                                        {grouped[key].length}건
                                      </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                      {grouped[key].map((entry, i) => (
                                        <li
                                          key={`${entry.quoteId}-${i}`}
                                          className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-background px-2.5 py-1.5 text-xs"
                                        >
                                          <span className="text-muted">{roleLabel(entry.role)}</span>
                                          <Link
                                            href={`/admin/${entry.quoteId}`}
                                            className="font-bold text-foreground hover:text-foreground hover:underline"
                                          >
                                            {entry.companyName}
                                          </Link>
                                          <span className="text-xs text-muted">
                                            · {statusLabel(entry.status, entry.reviewDecision)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ),
                              )}

                              {/* 대관 불가 일정도 이 날짜의 상태다 — 오른쪽 「설정」에만
                                  두면 목록을 다 읽고도 왜 신청이 안 되는지 모른다. */}
                              {block && (
                                <div>
                                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                                    <span className="h-2 w-2 rounded-full bg-danger" />
                                    대관 불가 일정
                                  </div>
                                  <p className="bg-background px-2.5 py-1.5 text-xs text-danger">
                                    {venueLabel(venueTab)} 대관 불가
                                    {block.reason ? ` · ${block.reason}` : " (관리자 지정)"}
                                  </p>
                                </div>
                              )}

                              {tabEntries.length === 0 && otherVenueCount > 0 && (
                                <p className="text-xs text-muted">
                                  다른 공간 예약 {otherVenueCount}건 있음 — 탭 전환해서 확인
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="sm:pl-3">
                        <div className="mb-1.5 text-xs font-bold text-muted">
                          설정
                        </div>
                        {blockedByDate.get(openDate) ? (
                          <div className="space-y-2">
                            <p className="text-xs text-danger">
                              {venueLabel(venueTab)} 대관 불가 일정으로 설정됨
                              {blockedByDate.get(openDate)?.reason ? ` · ${blockedByDate.get(openDate)?.reason}` : ""}
                            </p>
                            <button
                              type="button"
                              onClick={unblockOpenDate}
                              className={btnClass("secondary", "sm")}
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
                              placeholder="대관 불가 사유(선택) — 예: 정기 대관, 내부 행사"
                              className={`${FIELD_SM} min-w-0 flex-1`}
                            />
                            <button
                              type="button"
                              onClick={blockOpenDate}
                              className={`shrink-0 ${btnClass("danger", "sm")}`}
                            >
                              {venueLabel(venueTab)} 대관 불가로 설정
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
