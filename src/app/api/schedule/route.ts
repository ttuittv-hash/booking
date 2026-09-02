import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNoticeCalendarWindow, listDateBlocks, listQuotes, listUsersByIds } from "@/lib/db";
import { isMonthInRange, toMonthKey } from "@/lib/content/noticeCalendarWindow";
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
  // [개정 2026-09-02] 「패키지」는 공간 id 가 medium-hall 도 아니고 동시 대관도 아니지만
  // 기본 6일 안에서 중형을 함께 쓴다 — 조건을 공간 id 로만 보면 그 예약이 중형 달력에
  // 안 잡혀 이중 예약이 난다. 실제로 중형 날짜를 잡았는지로 판단한다.
  const hasMidHallPart =
    selection.venueId === "medium-hall" ||
    selection.bookingMode === "SIMULTANEOUS" ||
    Object.keys(selection.midHallDays ?? {}).length > 0;

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

  // 노출 월 제한(2026-09-02)은 화면에서 이전/다음 버튼을 잠그는 것으로 끝내지 않는다 —
  // 주소를 아는 사람이 연·월을 바꿔 부르면 범위 밖 현황이 그대로 나가기 때문이다.
  // 운영자는 설정을 확인해야 하므로 범위와 상관없이 통과시킨다.
  if (user.role !== "ADMIN") {
    const window = await getNoticeCalendarWindow();
    if (!isMonthInRange(toMonthKey(year, month), window)) {
      return NextResponse.json({ error: "공개된 대관 현황 기간이 아닙니다." }, { status: 403 });
    }
  }

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
  // [신규 2026-09-02] 확정 건수를 따로 센다 — 어드민 일정 관리와 같은 말로 보여 주기
  // 위해서다. 예전에는 총 건수만 내려줘, 같은 주가 어드민에서는 "대관사 확정"인데
  // 공지 캘린더에서는 "1건"으로만 나와 두 화면이 서로 다른 사실을 말했다.
  const confirmed: Record<string, { arena: number; mediumHall: number }> = {};
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
      const confirmedBucket = (confirmed[entry.date] ??= { arena: 0, mediumHall: 0 });
      // 승인·계약·정산은 이미 그 날짜를 내준 것이다 — 나머지는 아직 심사 중이다.
      const isSettled = isApproved || quote.status === "CONTRACTED" || quote.status === "SETTLED";
      if (entry.venueId === "arena") {
        bucket.arena += 1;
        demandBucket.arena.add(companyKey);
        if (isSettled) confirmedBucket.arena += 1;
        if (isApproved) approvedBucket.arena = true;
      } else {
        bucket.mediumHall += 1;
        demandBucket.mediumHall.add(companyKey);
        if (isSettled) confirmedBucket.mediumHall += 1;
        if (isApproved) approvedBucket.mediumHall = true;
      }
    }
  }

  // 회사명 자체는 절대 내려주지 않는다 — 몇 개 회사가 겹쳤는지 개수와, 대관사가
  // 확정됐는지(승인된 신청이 있는지) 여부만 넘긴다.
  type Status = "CONFIRMED" | "COMPETING" | "REVIEWING" | null;
  const demand: Record<string, { arena: number; mediumHall: number }> = {};
  const status: Record<string, { arena: Status; mediumHall: Status }> = {};
  /*
    [개정 2026-09-02] 한 회사만 신청한 날은 아무 말도 하지 않아, 어드민에서 "심사 중"인
    날이 여기서는 그냥 "1건"으로 보였다. 겨루는 중인지(2개사 이상)와 심사 중인지를
    나눠 말한다 — 두 화면이 같은 사실을 같은 말로 해야 한다.
  */
  const statusOf = (isApproved: boolean, companyCount: number): Status =>
    isApproved ? "CONFIRMED" : companyCount > 1 ? "COMPETING" : companyCount > 0 ? "REVIEWING" : null;
  for (const [date, sets] of Object.entries(demandCompanies)) {
    demand[date] = { arena: sets.arena.size, mediumHall: sets.mediumHall.size };
    const approvedBucket = approved[date] ?? { arena: false, mediumHall: false };
    status[date] = {
      arena: statusOf(approvedBucket.arena, sets.arena.size),
      mediumHall: statusOf(approvedBucket.mediumHall, sets.mediumHall.size),
    };
  }

  return NextResponse.json({ blocks, occupancy, confirmed, demand, status });
}
