import { describe, expect, it } from "vitest";
import {
  midHallDatesOutsideArenaRange,
  prefilledBaseDayTags,
  resolveSelectedDates,
  weekTuesdayOf,
} from "./dateRange";
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

// [신규 2026-09-18] 중형 달력 경합 표시("검토 중 · N개사 신청")가 올바른 주 행에 붙는지는
// 전적으로 이 함수에 달려 있다 — 하루라도 밀리면 옆 줄에 뜬다.
describe("weekTuesdayOf — 날짜가 속한 주 행의 화요일", () => {
  it("화요일은 자기 자신을 돌려준다", () => {
    expect(weekTuesdayOf("2027-07-06")).toBe("2027-07-06");
  });

  it("월~일 한 주(월요일 시작 격자)가 전부 같은 화요일로 모인다", () => {
    // 2027-07-05(월) ~ 2027-07-11(일) 은 한 행이고 그 행의 화요일은 07-06.
    const week = [
      "2027-07-05", "2027-07-06", "2027-07-07", "2027-07-08",
      "2027-07-09", "2027-07-10", "2027-07-11",
    ];
    for (const date of week) expect(weekTuesdayOf(date)).toBe("2027-07-06");
  });

  it("다음 주는 다른 화요일로 갈린다 — 경계에서 섞이지 않는다", () => {
    expect(weekTuesdayOf("2027-07-11")).toBe("2027-07-06"); // 일요일(행 끝)
    expect(weekTuesdayOf("2027-07-12")).toBe("2027-07-13"); // 월요일(다음 행 시작)
  });

  it("달을 넘는 행도 하나로 묶인다 — 같은 주가 두 달에 걸쳐도 화요일은 하나", () => {
    // 2027-06-28(월)~07-04(일) 은 한 행이고 화요일은 6월 29일이다.
    // 아레나에서는 이 행이 "6월 5주차"로도, "7월 0주차(첫 주)"로도 불리는데
    // 화요일 날짜로 잡으면 어느 쪽에서 보든 같은 키가 된다.
    expect(weekTuesdayOf("2027-06-28")).toBe("2027-06-29");
    expect(weekTuesdayOf("2027-07-01")).toBe("2027-06-29");
    expect(weekTuesdayOf("2027-07-04")).toBe("2027-06-29");
  });

  it("KST 기준으로 요일을 읽는다 — UTC 파싱이면 하루 밀려 전 주로 잡힌다", () => {
    // new Date("2027-07-05") 는 UTC 자정 = KST 7/5 09:00 이라 우연히 같지만,
    // 월요일 첫 칸이 전달로 넘어가는 날짜에서 어긋난다. 월요일이 그 행의 시작이어야 한다.
    expect(weekTuesdayOf("2027-03-01")).toBe("2027-03-02"); // 3/1(월) → 3/2(화)
    expect(weekTuesdayOf("2027-02-28")).toBe("2027-02-23"); // 2/28(일) → 앞 행 화요일
  });

  it("findWeekTuesday 와 짝이 맞는다 — 주차로 연 날짜를 되돌리면 같은 화요일", () => {
    // resolveSelectedDates 의 첫 날짜가 그 주의 화요일이다(findWeekTuesday 결과).
    // 그 화요일을 weekTuesdayOf 에 다시 넣으면 자기 자신이 나와야 왕복이 성립한다.
    for (const week of [
      { year: 2027, month: 7, weekOfMonth: 1 },
      { year: 2027, month: 7, weekOfMonth: 3 },
      { year: 2027, month: 8, weekOfMonth: 1 },
      { year: 2026, month: 9, weekOfMonth: 1 },
      { year: 2027, month: 7, weekOfMonth: 0 }, // 0주차 — 화요일이 전달(6/29)에 걸린 행
    ]) {
      const dates = resolveSelectedDates({ week, excludedDays: [], extraDays: 0 });
      if (dates.length === 0) continue; // 그 달에 0주차가 없으면 건너뛴다
      expect(weekTuesdayOf(dates[0])).toBe(dates[0]);
      // 그 주의 모든 날짜가 같은 화요일로 모여야 경합 표시가 한 줄에 붙는다.
      for (const d of dates) expect(weekTuesdayOf(d)).toBe(dates[0]);
    }
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
