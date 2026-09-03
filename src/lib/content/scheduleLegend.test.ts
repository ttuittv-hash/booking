import { describe, expect, it } from "vitest";
import { LEGEND_KEYS, scheduleLegend } from "./scheduleLegend";

describe("scheduleLegend — 일정 달력 범주 문구·색", () => {
  it("비어 있으면 기존 기본값 그대로(문구·색 모두)", () => {
    const l = scheduleLegend({});
    expect(l.confirmed).toEqual({ label: "대관 확정", dot: "bg-foreground", badge: "bg-foreground text-background" });
    expect(l.reviewing).toEqual({ label: "심사 중", dot: null, badge: null });
    expect(l.blocked).toEqual({ label: "대관 불가 일정", dot: "bg-danger", badge: "bg-danger-soft text-danger" });
    expect(scheduleLegend(null).confirmed.label).toBe("대관 확정");
  });
  it("운영자가 넣은 문구·색을 쓴다", () => {
    const l = scheduleLegend({
      [LEGEND_KEYS.confirmedLabel]: "확정",
      [LEGEND_KEYS.confirmedColor]: "good",
      [LEGEND_KEYS.reviewingColor]: "accent",
      [LEGEND_KEYS.blockedLabel]: "휴관",
    });
    expect(l.confirmed).toEqual({ label: "확정", dot: "bg-good", badge: "bg-good-soft text-good" });
    expect(l.reviewing.dot).toBe("bg-accent");
    expect(l.blocked.label).toBe("휴관");
  });
  it("허용되지 않은 색·공백 문구는 기본값으로", () => {
    const l = scheduleLegend({ [LEGEND_KEYS.confirmedColor]: "purple", [LEGEND_KEYS.blockedLabel]: "   " });
    expect(l.confirmed.dot).toBe("bg-foreground");
    expect(l.blocked.label).toBe("대관 불가 일정");
  });
});
