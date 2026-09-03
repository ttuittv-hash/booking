import { describe, expect, it } from "vitest";
import { applyDiscount, normalizeDiscountPercent } from "./rateDiscount";

describe("applyDiscount — 대관료 카드 할인 표시", () => {
  it("정상가 문자열의 금액에 %를 적용하고 접미사는 그대로 둔다", () => {
    expect(applyDiscount("518,300,000원", 10)).toEqual({ original: "518,300,000원", percent: 10, discounted: "466,470,000원" });
    expect(applyDiscount("303,840,000원/일당", 10)?.discounted).toBe("273,456,000원/일당");
    expect(applyDiscount("약 12,000명 · 518,000,000원", 10)?.discounted).toBe("약 10,800명 · 518,000,000원");
  });
  it("할인율이 없거나 0·범위 밖·숫자 없는 문자열이면 null", () => {
    expect(applyDiscount("518,300,000원", 0)).toBeNull();
    expect(applyDiscount("518,300,000원", undefined)).toBeNull();
    expect(applyDiscount("518,300,000원", 100)).toBeNull();
    expect(applyDiscount("협의", 10)).toBeNull();
  });
  it("normalizeDiscountPercent 는 1~99 정수만", () => {
    expect(normalizeDiscountPercent("10")).toBe(10);
    expect(normalizeDiscountPercent(9.6)).toBe(10);
    expect(normalizeDiscountPercent("")).toBeUndefined();
    expect(normalizeDiscountPercent(0)).toBeUndefined();
    expect(normalizeDiscountPercent(150)).toBeUndefined();
  });
});
