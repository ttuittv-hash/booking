import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDateBlocks, listQuotes } from "@/lib/db";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { Quote } from "@/lib/pricing/types";

// 공지사항 "대관 현황 캘린더" 레이어에서 쓰는 읽기 전용 조회 — /api/admin/schedule와
// 같은 날짜 그리드·점유 계산을 쓰지만, 회사명·quoteId·심사상태 등 기업 정보는 절대
// 내려주지 않는다(공지사항은 로그인만 하면 누구나 본다 — LOGIN_ONLY, 어드민 전용 아님).
// 아레나/중형 각각 그 날짜에 걸린 신청 건수만 집계해서 돌려준다.
function monthGridRange(year: number, month: number): { start: string; end: string } {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstCol = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - firstCol);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return { start: isoDate(gridStart), end: isoDate(gridEnd) };
}

function resolveQuoteDatesInRange(
  quote: Quote,
  start: string,
  end: string,
): Array<{ date: string; venueId: "arena" | "medium-hall" }> {
  const selection = quote.selection;
  const hasArenaPart = selection.venueId !== "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  const hasMidHallPart = selection.venueId === "medium-hall" || selection.bookingMode === "SIMULTANEOUS";

  const entries: Array<{ date: string; venueId: "arena" | "medium-hall" }> = [];
  if (hasArenaPart && selection.week) {
    for (const date of resolveSelectedDates(selection)) {
      if (date < start || date > end) continue;
      entries.push({ date, venueId: "arena" });
    }
  }
  if (hasMidHallPart) {
    for (const date of Object.keys(selection.midHallDays ?? {})) {
      if (date < start || date > end) continue;
      entries.push({ date, venueId: "medium-hall" });
    }
  }
  return entries;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const { start, end } = monthGridRange(year, month);

  const [blocks, quotes] = await Promise.all([listDateBlocks(), listQuotes()]);

  const occupancy: Record<string, { arena: number; mediumHall: number }> = {};
  for (const quote of quotes) {
    if (quote.review?.decision === "REJECTED") continue;
    for (const entry of resolveQuoteDatesInRange(quote, start, end)) {
      const bucket = (occupancy[entry.date] ??= { arena: 0, mediumHall: 0 });
      if (entry.venueId === "arena") bucket.arena += 1;
      else bucket.mediumHall += 1;
    }
  }

  return NextResponse.json({ blocks, occupancy });
}
