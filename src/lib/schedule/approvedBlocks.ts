/**
 * 승인된 신청서가 잡아 둔 날짜 (2026-09-02).
 *
 * 운영자가 심사에서 [승인]을 눌러도 그 날짜가 달력에서 그대로 열려 있었다 — 대관사가
 * 확정된 날에 다른 회사가 계속 신청할 수 있었고, 운영자는 그때마다 「대관 불가 일정」을
 * 손으로 찍어 줘야 했다. 승인은 곧 그 공간·그 날짜를 내준다는 뜻이므로, 승인된 신청서의
 * 날짜는 **운영자가 지정한 대관 불가 일정과 같은 자리**에서 막는다.
 *
 * 저장은 하지 않고 승인 건에서 매번 만들어 낸다(파생값) — 승인을 되돌리거나 일정이
 * 바뀌면 따로 지울 것 없이 같이 사라져야 한다. 예전에 date_blocks 로 복사해 두는 방식을
 * 쓰면 심사를 되돌린 뒤에도 막힌 날이 남는다.
 */

import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import type { DateBlock, Quote } from "@/lib/pricing/types";

export const APPROVED_BLOCK_REASON = "대관 확정";

/** 이 신청서가 실제로 차지하는 날짜 — 공간별로 나눠 준다. */
export function quoteOccupiedDates(quote: Quote): Array<{
  date: string;
  venueId: "arena" | "medium-hall";
}> {
  const selection = quote.selection;
  const hasArenaPart =
    selection.venueId !== "medium-hall" || selection.bookingMode === "SIMULTANEOUS";
  // 「패키지」는 공간 id 가 medium-hall 도 아니고 동시 대관도 아니지만 기본 6일 안에서
  // 중형을 함께 쓴다 — 공간 id 로만 판단하면 그 예약이 중형 달력에 안 잡힌다.
  const midHallDays = Object.keys(selection.midHallDays ?? {});
  const hasMidHallPart =
    selection.venueId === "medium-hall" ||
    selection.bookingMode === "SIMULTANEOUS" ||
    midHallDays.length > 0;

  const out: Array<{ date: string; venueId: "arena" | "medium-hall" }> = [];
  if (hasArenaPart && selection.week) {
    for (const date of resolveSelectedDates(selection)) out.push({ date, venueId: "arena" });
  }
  if (hasMidHallPart) {
    for (const date of midHallDays) out.push({ date, venueId: "medium-hall" });
  }
  return out;
}

/**
 * 승인된 신청서에서 만든 대관 불가 일정.
 *
 * `excludeQuoteId` 는 그 신청서 **자신**을 뺀다 — 승인된 신청서를 고칠 때 자기가 잡은
 * 날짜에 막혀 저장이 안 되면 안 된다.
 */
export function approvedQuoteBlocks(quotes: Quote[], excludeQuoteId?: string): DateBlock[] {
  const seen = new Set<string>();
  const blocks: DateBlock[] = [];
  for (const quote of quotes) {
    if (quote.review?.decision !== "APPROVED") continue;
    if (excludeQuoteId && quote.id === excludeQuoteId) continue;
    for (const entry of quoteOccupiedDates(quote)) {
      const key = `${entry.date}:${entry.venueId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push({ date: entry.date, venueId: entry.venueId, reason: APPROVED_BLOCK_REASON });
    }
  }
  return blocks.sort((a, b) => a.date.localeCompare(b.date));
}
