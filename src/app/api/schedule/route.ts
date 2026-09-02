import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNoticeCalendarWindow, listDateBlocks, listQuotes, listUsersByIds } from "@/lib/db";
import { kstNowLocal, noticeCalendarWindowState } from "@/lib/content/noticeCalendarWindow";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { Quote } from "@/lib/pricing/types";

// 공지사항 "대관 현황 캘린더" 레이어에서 쓰는 읽기 전용 조회 — /api/admin/schedule와
// 같은 날짜 그리드·점유 계산을 쓰지만, 회사명·quoteId·심사상태 등 기업 정보는 절대
// 내려주지 않는다(공지사항은 로그인만 하면 누구나 본다 — LOGIN_ONLY, 어드민 전용 아님).
// 아레나/중형 각각 그 날짜에 걸린 신청 건수와, 몇 개 회사가 겹쳐 신청했는지(경합)만
// 집계해서 돌려준다 — 회사명 자체는 내려주지 않는다.
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

  // 공개 기간(2026-09-02)은 화면에서 버튼을 감추는 것으로 끝내지 않는다 — 주소를 아는
  // 사람이 그대로 부르면 기간과 무관하게 현황이 나가기 때문이다. 운영자는 설정을
  // 확인해야 하므로 기간과 상관없이 통과시킨다.
  if (user.role !== "ADMIN") {
    const window = await getNoticeCalendarWindow();
    if (noticeCalendarWindowState(window, kstNowLocal(new Date())) !== "OPEN") {
      return NextResponse.json({ error: "대관 현황 공개 기간이 아닙니다." }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const { start, end } = monthGridRange(year, month);

  const [blocks, quotes] = await Promise.all([listDateBlocks(), listQuotes()]);

  // 신청자 -> 회사 매핑을 한 번에 읽는다(목록 화면에서 행마다 findUserById를
  // 부르지 말라는 규칙과 같은 이유 — N+1 방지).
  const applicantIds = [...new Set(quotes.map((quote) => quote.applicantId))];
  const applicants = await listUsersByIds(applicantIds);
  const companyKeyByApplicantId = new Map(
    applicants.map((u) => [u.id, u.companyId ?? u.id] as const),
  );

  const occupancy: Record<string, { arena: number; mediumHall: number }> = {};
  const demandCompanies: Record<string, { arena: Set<string>; mediumHall: Set<string> }> = {};
  const approved: Record<string, { arena: boolean; mediumHall: boolean }> = {};
  for (const quote of quotes) {
    if (quote.review?.decision === "REJECTED") continue;
    const companyKey = companyKeyByApplicantId.get(quote.applicantId) ?? quote.applicantId;
    const isApproved = quote.review?.decision === "APPROVED";
    for (const entry of resolveQuoteDatesInRange(quote, start, end)) {
      const bucket = (occupancy[entry.date] ??= { arena: 0, mediumHall: 0 });
      const demandBucket = (demandCompanies[entry.date] ??= { arena: new Set(), mediumHall: new Set() });
      const approvedBucket = (approved[entry.date] ??= { arena: false, mediumHall: false });
      if (entry.venueId === "arena") {
        bucket.arena += 1;
        demandBucket.arena.add(companyKey);
        if (isApproved) approvedBucket.arena = true;
      } else {
        bucket.mediumHall += 1;
        demandBucket.mediumHall.add(companyKey);
        if (isApproved) approvedBucket.mediumHall = true;
      }
    }
  }

  // 회사명 자체는 절대 내려주지 않는다 — 몇 개 회사가 겹쳤는지 개수와, 대관사가
  // 확정됐는지(승인된 신청이 있는지) 여부만 넘긴다.
  type Status = "CONFIRMED" | "COMPETING" | null;
  const demand: Record<string, { arena: number; mediumHall: number }> = {};
  const status: Record<string, { arena: Status; mediumHall: Status }> = {};
  const statusOf = (isApproved: boolean, companyCount: number): Status =>
    isApproved ? "CONFIRMED" : companyCount > 1 ? "COMPETING" : null;
  for (const [date, sets] of Object.entries(demandCompanies)) {
    demand[date] = { arena: sets.arena.size, mediumHall: sets.mediumHall.size };
    const approvedBucket = approved[date] ?? { arena: false, mediumHall: false };
    status[date] = {
      arena: statusOf(approvedBucket.arena, sets.arena.size),
      mediumHall: statusOf(approvedBucket.mediumHall, sets.mediumHall.size),
    };
  }

  return NextResponse.json({ blocks, occupancy, demand, status });
}
