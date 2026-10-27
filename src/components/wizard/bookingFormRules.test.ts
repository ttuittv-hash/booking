import { describe, expect, it } from "vitest";
import { recordLayout, RECORD_LAYOUTS } from "./bookingFormRules";

describe("shared document layout", () => {
  it("preserves approved content widths independently of display labels", () => {
    expect(recordLayout("contacts").spans).toEqual([1, 2, 1, 1, 2]);
    expect(recordLayout("performanceHistory").spans).toEqual([3, 2, 2, 2, 1, 1, 1, 1]);
    expect(recordLayout("promotionChannels").spans).toEqual([1, 3, 2]);
  });
  it("reserves one action column and prevents expanded records from shrinking", () => {
    for (const key of Object.keys(RECORD_LAYOUTS) as (keyof typeof RECORD_LAYOUTS)[]) {
      const { spans, columns, minWidth } = recordLayout(key);
      expect(columns).toBe(spans!.reduce<number>((sum, n) => sum + n, 0) + 1);
      if (columns > 7) expect(minWidth).toBeGreaterThan(7 * 104);
      else expect(minWidth).toBeUndefined();
    }
  });
});
