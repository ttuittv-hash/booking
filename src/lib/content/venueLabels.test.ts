import { describe, expect, it } from "vitest";
import { VENUES, SPECIAL_VENUE_ID } from "@/lib/pricing/types";
import { defaultVenueName, venueLabel, venueLabelKey } from "./venueLabels";

describe("venueLabel", () => {
  it("운영자가 바꾼 이름이 있으면 그것을 쓴다", () => {
    const overrides = { [venueLabelKey(SPECIAL_VENUE_ID)]: "루프탑 스테이지" };
    expect(venueLabel(SPECIAL_VENUE_ID, overrides)).toBe("루프탑 스테이지");
  });

  it("바꾼 이름이 없으면 기본 이름", () => {
    expect(venueLabel("arena")).toBe("아레나");
    expect(venueLabel("medium-hall", {})).toBe("중형공연장");
  });

  // 빈 탭 이름은 누를 곳이 사라진 것처럼 보인다 — 지우면 기본 이름으로 돌아가야 한다.
  it("공백만 남기면 기본 이름으로 되돌린다", () => {
    expect(venueLabel("arena", { [venueLabelKey("arena")]: "   " })).toBe("아레나");
    expect(venueLabel("arena", { [venueLabelKey("arena")]: "" })).toBe("아레나");
  });

  it("모르는 공간 id 는 id 를 그대로 쓴다", () => {
    expect(venueLabel("nope")).toBe("nope");
  });
});

describe("VENUES", () => {
  it("스페셜홀이 세 번째 공간으로 있다", () => {
    expect(VENUES.map((v) => v.id)).toEqual(["arena", "medium-hall", SPECIAL_VENUE_ID]);
    expect(defaultVenueName(SPECIAL_VENUE_ID)).toBe("스페셜홀");
  });

  it("공간 id 는 중복되지 않는다 — 패키지가 id 로 공간에 붙는다", () => {
    expect(new Set(VENUES.map((v) => v.id)).size).toBe(VENUES.length);
  });
});
