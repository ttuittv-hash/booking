import { describe, expect, it } from "vitest";
import { midHallDatesOutsideArenaRange, prefilledBaseDayTags } from "./dateRange";
import type { QuoteSelection } from "./types";

// 2026-09-01(화)가 속한 주(9월 1주차)를 아레나 기준으로 쓴다 — 기본 6일이면
// 2026-09-01(화) ~ 2026-09-06(일).
const arenaSelection: Pick<
  QuoteSelection,
  "week" | "excludedDays" | "extraDays"
> = {
  week: { year: 2026, month: 9, weekOfMonth: 1 },
  excludedDays: [],
  extraDays: 0,
};

describe("midHallDatesOutsideArenaRange", () => {
  it("중형 일정이 없으면 검증 대상이 없다(빈 배열)", () => {
    expect(midHallDatesOutsideArenaRange(arenaSelection, {})).toEqual([]);
  });

  it("아레나 기간(9/1~9/6) 안의 중형 날짜는 문제 없다", () => {
    const result = midHallDatesOutsideArenaRange(arenaSelection, {
      "2026-09-02": { role: "SETUP", shows: 1 },
      "2026-09-05": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual([]);
  });

  it("아레나 기간보다 늦은 중형 날짜는 범위 밖으로 걸린다", () => {
    const result = midHallDatesOutsideArenaRange(arenaSelection, {
      "2026-09-10": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual(["2026-09-10"]);
  });

  it("아레나 기간보다 이른 중형 날짜도 범위 밖으로 걸린다", () => {
    const result = midHallDatesOutsideArenaRange(arenaSelection, {
      "2026-08-20": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual(["2026-08-20"]);
  });

  it("범위 안팎이 섞이면 범위 밖 날짜만 반환한다(정렬됨)", () => {
    const result = midHallDatesOutsideArenaRange(arenaSelection, {
      "2026-09-25": { role: "PERFORMANCE", shows: 1 },
      "2026-09-03": { role: "SETUP", shows: 1 },
      "2026-08-30": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual(["2026-08-30", "2026-09-25"]);
  });

  it("아레나가 요일을 제외해 기간이 좁아지면 그만큼 범위도 좁아진다", () => {
    const narrowed = { ...arenaSelection, excludedDays: ["SUN" as const] };
    // 기본 화~일(9/1~9/6)에서 일(9/6)을 뺐으니 범위는 9/1~9/5.
    const result = midHallDatesOutsideArenaRange(narrowed, {
      "2026-09-06": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual(["2026-09-06"]);
  });

  it("연장일(extraDays)만큼 범위가 넓어진다", () => {
    const extended = { ...arenaSelection, extraDays: 2 };
    // 화~일(9/1~9/6) + 2일 연장 = 9/8까지.
    const result = midHallDatesOutsideArenaRange(extended, {
      "2026-09-08": { role: "PERFORMANCE", shows: 1 },
      "2026-09-09": { role: "PERFORMANCE", shows: 1 },
    });
    expect(result).toEqual(["2026-09-09"]);
  });
});

describe("prefilledBaseDayTags — 달력 진입 시 기본 일정(준비 4일 + 공연 2일)", () => {
  it("기본 6일(화~일)에 준비 4일 + 공연 2일을 실제 태그로 채운다", () => {
    const tags = prefilledBaseDayTags({ week: { year: 2026, month: 9, weekOfMonth: 1 }, excludedDays: [] }, 2);
    expect(tags).toEqual({
      "2026-09-01": "PREP",
      "2026-09-02": "PREP",
      "2026-09-03": "PREP",
      "2026-09-04": "PREP",
      "2026-09-05": "PERFORMANCE",
      "2026-09-06": "PERFORMANCE",
    });
  });

  it("제외 요일은 빼고, 공연일은 항상 뒤에서부터 센다", () => {
    const tags = prefilledBaseDayTags({ week: { year: 2026, month: 9, weekOfMonth: 1 }, excludedDays: ["TUE"] }, 2);
    expect(Object.keys(tags)).toHaveLength(5);
    expect(tags["2026-09-01"]).toBeUndefined();
    expect(tags["2026-09-04"]).toBe("PREP");
    expect(tags["2026-09-05"]).toBe("PERFORMANCE");
    expect(tags["2026-09-06"]).toBe("PERFORMANCE");
  });
});
