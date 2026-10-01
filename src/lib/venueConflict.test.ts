import { describe, expect, it } from "vitest";
import { selectionsShareVenue } from "./db";
import type { QuoteSelection } from "./pricing/types";

// [신규 2026-10-01] 승인 충돌(findApprovedWeekConflict)이 공간을 보지 않아 아레나 승인 건 때문에
// 같은 주차 중형공연장 신청서가 승인되지 않던 문제 — 두 신청서가 같은 공간을 쓸 때만 충돌이다.
const sel = (venueId: string, bookingMode: "SINGLE" | "SIMULTANEOUS" = "SINGLE") =>
  ({ venueId, bookingMode }) as unknown as QuoteSelection;

describe("selectionsShareVenue — 같은 주차 승인 충돌은 같은 공간끼리만", () => {
  it("아레나와 중형공연장 단독은 서로 겹치지 않는다", () => {
    expect(selectionsShareVenue(sel("medium-hall"), sel("arena"))).toBe(false);
    expect(selectionsShareVenue(sel("arena"), sel("medium-hall"))).toBe(false);
  });

  it("같은 공간끼리는 겹친다", () => {
    expect(selectionsShareVenue(sel("arena"), sel("arena"))).toBe(true);
    expect(selectionsShareVenue(sel("medium-hall"), sel("medium-hall"))).toBe(true);
  });

  it("동시 대관은 아레나·중형 어느 쪽과도 겹친다", () => {
    expect(selectionsShareVenue(sel("arena", "SIMULTANEOUS"), sel("medium-hall"))).toBe(true);
    expect(selectionsShareVenue(sel("medium-hall"), sel("arena", "SIMULTANEOUS"))).toBe(true);
    expect(selectionsShareVenue(sel("arena", "SIMULTANEOUS"), sel("arena"))).toBe(true);
  });
});
