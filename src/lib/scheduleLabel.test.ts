import { describe, expect, it } from "vitest";
import { midHallRangeLabel, scheduleLabel } from "./scheduleLabel";
import type { QuoteSelection } from "./pricing/types";

const D = { role: "PERFORMANCE", shows: 1 };
const sel = (venueId: string, bookingMode: string, days: string[]) =>
  ({
    venueId,
    bookingMode,
    week: { year: 2027, month: 7, weekOfMonth: 1 },
    midHallDays: Object.fromEntries(days.map((d) => [d, D])),
  }) as unknown as QuoteSelection;

describe("scheduleLabel — 중형은 week 가 아니라 실제 날짜로", () => {
  it("중형 단독은 week 값(7월 1주차)을 쓰지 않고 날짜 범위를 쓴다", () => {
    expect(scheduleLabel(sel("medium-hall", "SINGLE", ["2027-06-30", "2027-06-28", "2027-06-29"]))).toBe(
      "2027.6.28~6.30 (3일)",
    );
  });
  it("아레나 단독은 주차 그대로", () => {
    expect(scheduleLabel(sel("arena", "SINGLE", []))).toBe("2027.7 1주차");
  });
  it("동시 대관은 아레나 주차 · 중형 날짜", () => {
    expect(scheduleLabel(sel("arena", "SIMULTANEOUS", ["2027-07-07"]))).toBe("2027.7 1주차 · 중형 2027.7.7 (1일)");
  });
  it("해를 넘기면 끝 날짜에도 연도", () => {
    expect(midHallRangeLabel({ "2027-12-30": D, "2028-01-02": D })).toBe("2027.12.30~2028.1.2 (2일)");
  });
  it("날짜가 없으면 미선택", () => {
    expect(midHallRangeLabel({})).toBe("날짜 미선택");
  });
});
