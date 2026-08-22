import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blockDate, listDateBlocks, listQuotes, listUsersByIds, unblockDate } from "@/lib/db";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { DayTag, MidHallDayRole, Quote } from "@/lib/pricing/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VENUE_IDS = ["arena", "medium-hall"] as const;

export interface ScheduleOccupancyEntry {
  quoteId: string;
  venueId: "arena" | "medium-hall";
  role: DayTag | MidHallDayRole | null;
  status: string;
  reviewDecision: string | null;
  companyName: string;
}

// ScheduleManager는 한 번에 한 달치 6주 그리드(월요일 시작, 42칸)를 보여준다 — 앞뒤 월의
// 여백 칸도 그 달의 실제 날짜이므로 점유 현황 조회 범위에 포함시킨다.
function monthGridRange(year: number, month: number): { start: string; end: string } {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - firstCol);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return { start: isoDate(gridStart), end: isoDate(gridEnd) };
}

// 신청서에는 날짜별 인덱스가 없다(week_year/week_month/week_of_month + JSON dayTags/
// midHallDays) — 그리드에 보이는 달의 점유 현황을 만들려면 전체 신청서를 훑어 날짜를
// 직접 풀어내야 한다. listWeekDemand()도 같은 이유로 전체 집계를 한다(2026-08-19).
function resolveQuoteDatesInRange(
  quote: Quote,
  start: string,
  end: string,
): Array<{ date: string; venueId: "arena" | "medium-hall"; role: DayTag | MidHallDayRole | null }> {
  const selection = quote.selection;
  const hasArenaPart = selection.venueId !== "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  const hasMidHallPart = selection.venueId === "medium-hall" || selection.bookingMode === "SIMULTANEOUS";

  const entries: Array<{ date: string; venueId: "arena" | "medium-hall"; role: DayTag | MidHallDayRole | null }> = [];

  if (hasArenaPart && selection.week) {
    for (const date of resolveSelectedDates(selection)) {
      if (date < start || date > end) continue;
      entries.push({ date, venueId: "arena", role: selection.dayTags[date] ?? null });
    }
  }
  if (hasMidHallPart) {
    for (const [date, day] of Object.entries(selection.midHallDays ?? {})) {
      if (date < start || date > end) continue;
      entries.push({ date, venueId: "medium-hall", role: day.role });
    }
  }
  return entries;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const { start, end } = monthGridRange(year, month);

  const [blocks, quotes] = await Promise.all([listDateBlocks(), listQuotes()]);

  const resolved: Array<{
    date: string;
    venueId: "arena" | "medium-hall";
    role: DayTag | MidHallDayRole | null;
    quote: Quote;
  }> = [];
  for (const quote of quotes) {
    if (quote.review?.decision === "REJECTED") continue; // 반려 건은 실제로 점유하지 않는다
    for (const entry of resolveQuoteDatesInRange(quote, start, end)) {
      resolved.push({ ...entry, quote });
    }
  }

  const applicantIds = Array.from(new Set(resolved.map((r) => r.quote.applicantId)));
  const applicantById = new Map((await listUsersByIds(applicantIds)).map((u) => [u.id, u]));

  const occupancy: Record<string, ScheduleOccupancyEntry[]> = {};
  for (const r of resolved) {
    const applicant = applicantById.get(r.quote.applicantId);
    const entry: ScheduleOccupancyEntry = {
      quoteId: r.quote.id,
      venueId: r.venueId,
      role: r.role,
      status: r.quote.status,
      reviewDecision: r.quote.review?.decision ?? null,
      companyName: applicant?.companyName ?? applicant?.name ?? "-",
    };
    (occupancy[r.date] ??= []).push(entry);
  }

  return NextResponse.json({ blocks, occupancy });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const venueId = body?.venueId;
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

  if (!DATE_RE.test(date) || !VENUE_IDS.includes(venueId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const block = await blockDate(date, venueId, reason);
  return NextResponse.json({ block });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const venueId = body?.venueId;
  if (!DATE_RE.test(date) || !VENUE_IDS.includes(venueId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  await unblockDate(date, venueId);
  return NextResponse.json({ ok: true });
}
