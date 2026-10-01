import { describe, expect, it } from "vitest";
import { selectionsOverlap } from "./db";
import type { QuoteSelection } from "./pricing/types";

// [신규 2026-10-01] 승인 충돌(findApprovedWeekConflict) 운영 신고 두 건:
//  ① 아레나 승인 건 때문에 같은 주차 중형공연장 신청서가 승인되지 않음
//  ② 중형끼리 실제 날짜는 안 겹치는데(6월 말 vs 7월 초) 둘 다 같은 week 값을 들고 있어 막힘
// 아레나는 그 주 화요일로, 중형은 고른 날짜로 비교한다.
type Week = QuoteSelection["week"];
const arena = (week: Week) =>
  ({ venueId: "arena", bookingMode: "SINGLE", week, midHallDays: {} }) as unknown as QuoteSelection;
const mid = (dates: string[], week: Week = { year: 2027, month: 7, weekOfMonth: 1 }) =>
  ({
    venueId: "medium-hall",
    bookingMode: "SINGLE",
    week,
    midHallDays: Object.fromEntries(dates.map((d) => [d, { role: "PERFORMANCE", shows: 1 }])),
  }) as unknown as QuoteSelection;
const simul = (week: Week, dates: string[]) =>
  ({ ...mid(dates, week), venueId: "arena", bookingMode: "SIMULTANEOUS" }) as unknown as QuoteSelection;

const JUL1: Week = { year: 2027, month: 7, weekOfMonth: 1 };
const JUL2: Week = { year: 2027, month: 7, weekOfMonth: 2 };

describe("selectionsOverlap — 승인 충돌은 같은 공간·같은 기간일 때만", () => {
  it("① 아레나와 중형 단독은 같은 주차여도 겹치지 않는다", () => {
    expect(selectionsOverlap(mid(["2027-07-07"]), arena(JUL1))).toBeNull();
    expect(selectionsOverlap(arena(JUL1), mid(["2027-07-07"]))).toBeNull();
  });

  it("② 중형끼리는 week 값이 같아도 날짜가 안 겹치면 충돌이 아니다(6월 말 vs 7월 초)", () => {
    // 둘 다 위저드 기본 week(7월 1주차)를 들고 있지만 실제 날짜는 다르다.
    expect(selectionsOverlap(mid(["2027-06-28", "2027-06-29"]), mid(["2027-07-06", "2027-07-07"]))).toBeNull();
  });

  it("중형끼리 하루라도 겹치면 충돌이고, 겹친 날짜를 돌려준다", () => {
    const o = selectionsOverlap(mid(["2027-07-06", "2027-07-07"]), mid(["2027-07-07", "2027-07-08"]));
    expect(o?.midHallDates).toEqual(["2027-07-07"]);
    expect(o?.arenaWeekTuesday).toBeNull();
  });

  it("중형끼리는 week 값이 달라도 날짜가 겹치면 충돌이다", () => {
    expect(selectionsOverlap(mid(["2027-07-07"], JUL1), mid(["2027-07-07"], JUL2))).not.toBeNull();
  });

  it("아레나끼리는 같은 주면 충돌, 다른 주면 아니다", () => {
    expect(selectionsOverlap(arena(JUL1), arena(JUL1))?.arenaWeekTuesday).toBeTruthy();
    expect(selectionsOverlap(arena(JUL1), arena(JUL2))).toBeNull();
  });

  it("아레나는 이름이 둘인 같은 주(전달 마지막 주 = 이번 달 0주차)도 같은 주로 본다", () => {
    // 2027-06 마지막 행과 2027-07 0주차가 같은 화요일이면 겹쳐야 한다.
    const jul0: Week = { year: 2027, month: 7, weekOfMonth: 0 };
    const o0 = selectionsOverlap(arena(jul0), arena(jul0));
    if (o0) {
      const tue = o0.arenaWeekTuesday!;
      const juneLast: Week = { year: 2027, month: 6, weekOfMonth: [1, 2, 3, 4, 5].find((n) =>
        selectionsOverlap(arena({ year: 2027, month: 6, weekOfMonth: n }), arena(jul0)))! };
      expect(selectionsOverlap(arena(juneLast), arena(jul0))?.arenaWeekTuesday).toBe(tue);
    }
  });

  it("동시 대관은 아레나 쪽은 주로, 중형 쪽은 날짜로 비교한다", () => {
    expect(selectionsOverlap(simul(JUL1, ["2027-07-07"]), arena(JUL1))?.arenaWeekTuesday).toBeTruthy();
    expect(selectionsOverlap(simul(JUL1, ["2027-07-07"]), mid(["2027-07-07"]))?.midHallDates).toEqual(["2027-07-07"]);
    expect(selectionsOverlap(simul(JUL1, ["2027-07-07"]), mid(["2027-07-09"]))).toBeNull();
  });
});
