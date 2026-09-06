import { describe, expect, it } from "vitest";
import { SIMULTANEOUS_WINDOW_MAX_DAYS, simultaneousWindowGapDays } from "./dateRange";
import type { QuoteSelection } from "./types";

// 2026-09-01(화)가 속한 주(9월 1주차)를 아레나 기준으로 쓴다.
const arenaWeek: QuoteSelection["week"] = { year: 2026, month: 9, weekOfMonth: 1 };

describe("simultaneousWindowGapDays", () => {
  it("중형 일정이 없으면 검증 대상이 없다(null)", () => {
    expect(simultaneousWindowGapDays(arenaWeek, {})).toBeNull();
  });

  it("두 시작일 간격이 14일 이내면 그 일수를 반환한다", () => {
    // 아레나 화요일: 2026-09-01. 중형 시작을 9/10(9일 뒤)로 잡는다.
    const gap = simultaneousWindowGapDays(arenaWeek, { "2026-09-10": { role: "PERFORMANCE", shows: 1 } });
    expect(gap).toBe(9);
    expect(gap).toBeLessThanOrEqual(SIMULTANEOUS_WINDOW_MAX_DAYS);
  });

  it("14일을 넘으면 그 초과 일수를 그대로 반환한다(호출부가 상한과 비교)", () => {
    const gap = simultaneousWindowGapDays(arenaWeek, { "2026-09-20": { role: "PERFORMANCE", shows: 1 } });
    expect(gap).toBeGreaterThan(SIMULTANEOUS_WINDOW_MAX_DAYS);
  });

  it("중형이 아레나보다 먼저여도(음수 방향) 절대값으로 계산한다", () => {
    const gap = simultaneousWindowGapDays(arenaWeek, { "2026-08-20": { role: "PERFORMANCE", shows: 1 } });
    expect(gap).toBe(12);
  });

  it("여러 중형 날짜 중 가장 이른 날짜를 시작일로 쓴다", () => {
    const gap = simultaneousWindowGapDays(arenaWeek, {
      "2026-09-25": { role: "PERFORMANCE", shows: 1 },
      "2026-09-05": { role: "SETUP", shows: 1 },
    });
    expect(gap).toBe(4);
  });
});
