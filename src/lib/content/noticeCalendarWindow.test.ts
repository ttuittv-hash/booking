import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTICE_CALENDAR_WINDOW,
  formatWindowMoment,
  kstNowLocal,
  noticeCalendarClosedMessage,
  noticeCalendarWindowState,
  normalizeWindowMoment,
  type NoticeCalendarWindow,
} from "./noticeCalendarWindow";

const base: NoticeCalendarWindow = {
  ...DEFAULT_NOTICE_CALENDAR_WINDOW,
  enabled: true,
  startAt: "2026-09-10T09:00",
  endAt: "2026-09-30T18:00",
};

describe("noticeCalendarWindowState", () => {
  it("기간을 끄면 언제든 열려 있다", () => {
    expect(noticeCalendarWindowState({ ...base, enabled: false }, "2100-01-01T00:00")).toBe("OPEN");
  });

  it("시작 전 · 기간 안 · 종료 후를 나눈다", () => {
    expect(noticeCalendarWindowState(base, "2026-09-09T23:59")).toBe("BEFORE");
    expect(noticeCalendarWindowState(base, "2026-09-10T09:00")).toBe("OPEN");
    expect(noticeCalendarWindowState(base, "2026-09-20T12:00")).toBe("OPEN");
    expect(noticeCalendarWindowState(base, "2026-09-30T18:00")).toBe("OPEN");
    expect(noticeCalendarWindowState(base, "2026-09-30T18:01")).toBe("AFTER");
  });

  // 운영자가 체크만 하고 시각을 안 넣는 일이 실제로 생긴다 — 그때 캘린더가 조용히
  // 사라지면 "공지에 넣었는데 안 보인다"는 신고가 된다.
  it("켜 두고 시각을 비우면 제한이 없다", () => {
    const open = { ...base, startAt: null, endAt: null };
    expect(noticeCalendarWindowState(open, "2026-01-01T00:00")).toBe("OPEN");
  });

  it("한쪽만 넣어도 그쪽만 본다", () => {
    expect(noticeCalendarWindowState({ ...base, endAt: null }, "2099-01-01T00:00")).toBe("OPEN");
    expect(noticeCalendarWindowState({ ...base, startAt: null }, "2026-01-01T00:00")).toBe("OPEN");
  });
});

describe("kstNowLocal", () => {
  it("서버 TZ 와 무관하게 한국 시각으로 만든다", () => {
    // 2026-09-02T00:30Z = 한국 시각 09:30 (같은 날)
    expect(kstNowLocal(new Date("2026-09-02T00:30:00Z"))).toBe("2026-09-02T09:30");
    // 2026-09-01T16:00Z = 한국 시각 다음 날 01:00 — 날짜가 넘어가야 한다
    expect(kstNowLocal(new Date("2026-09-01T16:00:00Z"))).toBe("2026-09-02T01:00");
  });
});

describe("normalizeWindowMoment", () => {
  it("분까지만 남긴다", () => {
    expect(normalizeWindowMoment("2026-09-10T09:00:00")).toBe("2026-09-10T09:00");
    expect(normalizeWindowMoment("2026-09-10T09:00")).toBe("2026-09-10T09:00");
  });

  it("형식이 어긋나면 비운다", () => {
    expect(normalizeWindowMoment("")).toBeNull();
    expect(normalizeWindowMoment("2026-09-10")).toBeNull();
    expect(normalizeWindowMoment("내일부터")).toBeNull();
    expect(normalizeWindowMoment(undefined)).toBeNull();
  });
});

describe("noticeCalendarClosedMessage", () => {
  it("상태에 맞는 문구를 고른다", () => {
    const w = { ...base, beforeMessage: "곧 열립니다", afterMessage: "마감했습니다" };
    expect(noticeCalendarClosedMessage(w, "BEFORE")).toBe("곧 열립니다");
    expect(noticeCalendarClosedMessage(w, "AFTER")).toBe("마감했습니다");
    expect(noticeCalendarClosedMessage(w, "OPEN")).toBe("");
  });

  it("비워 두면 기본 문구로 채운다 — 빈 자리를 남기지 않는다", () => {
    const w = { ...base, beforeMessage: "   ", afterMessage: "" };
    expect(noticeCalendarClosedMessage(w, "BEFORE")).toBe(
      DEFAULT_NOTICE_CALENDAR_WINDOW.beforeMessage,
    );
    expect(noticeCalendarClosedMessage(w, "AFTER")).toBe(
      DEFAULT_NOTICE_CALENDAR_WINDOW.afterMessage,
    );
  });
});

describe("formatWindowMoment", () => {
  it("한국식 표기로 바꾼다", () => {
    expect(formatWindowMoment("2026-09-10T09:00")).toBe("2026년 9월 10일 09:00");
  });

  it("값이 없거나 형식이 어긋나면 null", () => {
    expect(formatWindowMoment(null)).toBeNull();
    expect(formatWindowMoment("2026-09-10")).toBeNull();
  });
});
