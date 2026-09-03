import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTICE_CALENDAR_WINDOW,
  formatMonth,
  initialCalendarMonth,
  isMonthInRange,
  kstNowMonth,
  noticeCalendarMonthBounds,
  normalizeDay,
  nextMonthKey,
  normalizeMonth,
  toMonthKey,
  type NoticeCalendarWindow,
} from "./noticeCalendarWindow";

// 2027년 하반기 정기대관 — 캘린더는 그 여섯 달만 보여 준다.
const base: NoticeCalendarWindow = {
  ...DEFAULT_NOTICE_CALENDAR_WINDOW,
  enabled: true,
  startMonth: "2027-07",
  endMonth: "2027-12",
};

describe("isMonthInRange", () => {
  it("제한을 끄면 어느 달이든 본다", () => {
    expect(isMonthInRange("2030-01", { ...base, enabled: false })).toBe(true);
  });

  it("범위 안의 달만 본다 — 양 끝은 포함이다", () => {
    expect(isMonthInRange("2027-06", base)).toBe(false);
    expect(isMonthInRange("2027-07", base)).toBe(true);
    expect(isMonthInRange("2027-10", base)).toBe(true);
    expect(isMonthInRange("2027-12", base)).toBe(true);
    expect(isMonthInRange("2028-01", base)).toBe(false);
  });

  it("한쪽만 넣으면 그쪽만 막는다", () => {
    expect(isMonthInRange("2030-01", { ...base, endMonth: null })).toBe(true);
    expect(isMonthInRange("2020-01", { ...base, startMonth: null })).toBe(true);
  });

  // 운영자가 체크만 하고 달을 안 넣는 일이 실제로 생긴다 — 그때 캘린더가 한 달에
  // 갇히거나 텅 비면 "공지에 넣었는데 안 보인다"는 신고가 된다.
  it("켜 두고 달을 비우면 제한이 없다", () => {
    const open = { ...base, startMonth: null, endMonth: null };
    expect(isMonthInRange("2020-01", open)).toBe(true);
    expect(isMonthInRange("2099-12", open)).toBe(true);
  });

  it("시작이 끝보다 뒤면 잠그지 않고 제한을 푼다", () => {
    const wrong = { ...base, startMonth: "2027-12", endMonth: "2027-07" };
    expect(noticeCalendarMonthBounds(wrong)).toEqual({ start: null, end: null, endDay: null });
    expect(isMonthInRange("2027-01", wrong)).toBe(true);
  });
});

describe("initialCalendarMonth", () => {
  it("이번 달이 범위 안이면 이번 달을 연다", () => {
    expect(initialCalendarMonth(base, "2027-09")).toBe("2027-09");
  });

  it("범위보다 앞이면 첫 달, 뒤면 마지막 달을 연다 — 빈 화면으로 열지 않는다", () => {
    expect(initialCalendarMonth(base, "2026-09")).toBe("2027-07");
    expect(initialCalendarMonth(base, "2028-03")).toBe("2027-12");
  });

  it("제한이 없으면 이번 달 그대로", () => {
    expect(initialCalendarMonth({ ...base, enabled: false }, "2026-09")).toBe("2026-09");
  });
});

describe("kstNowMonth", () => {
  it("서버 TZ 와 무관하게 한국 기준 달을 만든다", () => {
    expect(kstNowMonth(new Date("2026-09-02T00:30:00Z"))).toBe("2026-09");
    // 2026-08-31T16:00Z = 한국 시각 9월 1일 01:00 — 달이 넘어가야 한다
    expect(kstNowMonth(new Date("2026-08-31T16:00:00Z"))).toBe("2026-09");
  });
});

describe("normalizeMonth", () => {
  it("`YYYY-MM` 만 받는다", () => {
    expect(normalizeMonth("2027-07")).toBe("2027-07");
    expect(normalizeMonth(" 2027-07 ")).toBe("2027-07");
  });

  it("형식이 어긋나면 비운다", () => {
    expect(normalizeMonth("")).toBeNull();
    expect(normalizeMonth("2027-13")).toBeNull();
    expect(normalizeMonth("2027-00")).toBeNull();
    expect(normalizeMonth("2027-07-01")).toBe("2027-07"); // 앞 7자만 본다
    expect(normalizeMonth("올해 하반기")).toBeNull();
    expect(normalizeMonth(undefined)).toBeNull();
  });
});

describe("toMonthKey", () => {
  it("캘린더가 넘기는 연·월을 저장 형식으로 맞춘다", () => {
    expect(toMonthKey(2027, 7)).toBe("2027-07");
    expect(toMonthKey(2027, 12)).toBe("2027-12");
  });
});

describe("formatMonth", () => {
  it("한국식 표기로 바꾼다", () => {
    expect(formatMonth("2027-07")).toBe("2027년 7월");
  });

  it("값이 없거나 형식이 어긋나면 null", () => {
    expect(formatMonth(null)).toBeNull();
    expect(formatMonth("2027")).toBeNull();
  });
});

// [2026-09-03 팀 요청] 마지막 달 뒤에 다음 달 며칠만 이어 붙이기(예: 12월 뒤 1/1~1/12).
describe("endDay — 마지막 달 격자에 이어 붙일 다음 달 마지막 날", () => {
  it("마지막 달 바로 다음 달의 날짜만 인정한다", () => {
    const w = { enabled: true, startMonth: "2026-09", endMonth: "2026-12", endDay: "2027-01-12" };
    expect(noticeCalendarMonthBounds(w).endDay).toBe("2027-01-12");
  });
  it("다음 달이 아니면(두 달 뒤·같은 달·형식 오류) 무시한다", () => {
    const base = { enabled: true, startMonth: "2026-09", endMonth: "2026-12" };
    expect(noticeCalendarMonthBounds({ ...base, endDay: "2027-02-01" }).endDay).toBeNull();
    expect(noticeCalendarMonthBounds({ ...base, endDay: "2026-12-20" }).endDay).toBeNull();
    expect(noticeCalendarMonthBounds({ ...base, endDay: "1월 12일" }).endDay).toBeNull();
    expect(noticeCalendarMonthBounds({ ...base, endMonth: null, endDay: "2027-01-12" }).endDay).toBeNull();
  });
  it("normalizeDay·nextMonthKey", () => {
    expect(normalizeDay(" 2027-01-12 ")).toBe("2027-01-12");
    expect(normalizeDay("2027-1-12")).toBeNull();
    expect(nextMonthKey("2026-12")).toBe("2027-01");
    expect(nextMonthKey("2026-07")).toBe("2026-08");
  });
});
