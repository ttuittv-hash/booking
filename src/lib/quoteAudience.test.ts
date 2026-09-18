import { describe, expect, it } from "vitest";

import { rowAudience } from "./quoteAudience";

// 「신청현황 탭 관객수 필드에 동기화가 안 되는 이슈」(niki 2026-09-18) — 목록이 공간과
// 무관하게 expectedAudience(아레나 몫)만 읽어, 중형 단독 신청은 신청자가 값을 제대로
// 적어 냈어도 항상 0 으로 떴다. 세 갈래를 전부 못 박는다.
describe("rowAudience — 목록 관객 열이 공간에 맞는 값을 읽는다", () => {
  const base = { expectedAudience: 12000, secondaryAudience: 2500 } as const;

  it("아레나 단독은 아레나 값을 쓴다", () => {
    expect(rowAudience({ ...base, bookingMode: "SINGLE", venueId: "arena" })).toEqual({
      main: 12000,
      sub: null,
    });
  });

  it("중형 단독은 중형 값을 쓴다 — 아레나 몫이 아니다", () => {
    expect(rowAudience({ ...base, bookingMode: "SINGLE", venueId: "medium-hall" })).toEqual({
      main: 2500,
      sub: null,
    });
  });

  // 이게 실제로 났던 증상이다: 중형 단독은 아레나 입력칸이 화면에 없으니 expectedAudience
  // 가 0 인 채로 저장되는데, 목록이 그 0 을 읽어 「중형공연장 / 0」 행을 만들었다.
  it("중형 단독에서 아레나 값이 0 이어도 중형 값을 그대로 보여준다", () => {
    expect(
      rowAudience({
        expectedAudience: 0,
        secondaryAudience: 2500,
        bookingMode: "SINGLE",
        venueId: "medium-hall",
      }).main,
    ).toBe(2500);
  });

  // 동시 대관은 venueId 가 "arena" 로 고정돼 있어 venueId 만 보면 중형 몫을 놓친다.
  it("동시 대관은 아레나를 주값으로, 중형을 보조값으로 함께 낸다", () => {
    expect(rowAudience({ ...base, bookingMode: "SIMULTANEOUS", venueId: "arena" })).toEqual({
      main: 12000,
      sub: 2500,
    });
  });

  it("동시 대관은 venueId 가 medium-hall 로 저장돼 있어도 두 값을 그대로 낸다", () => {
    expect(rowAudience({ ...base, bookingMode: "SIMULTANEOUS", venueId: "medium-hall" })).toEqual({
      main: 12000,
      sub: 2500,
    });
  });
});
