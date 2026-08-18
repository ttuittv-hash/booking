import { describe, it, expect } from "vitest";
import { normalizeBusinessNumber } from "./db";

// 회사의 유일 키가 사업자등록번호로 바뀌면서(기획서 1-35) 표기 흔들림이 곧 데이터 분열이 된다.
// "220-88-12345" 와 "2208812345" 가 다른 회사로 갈리면 UNIQUE 인덱스가 아무 일도 못 한다.
describe("normalizeBusinessNumber", () => {
  it("하이픈을 제거해 숫자만 남긴다", () => {
    expect(normalizeBusinessNumber("220-88-12345")).toBe("2208812345");
  });

  it("표기가 달라도 같은 값으로 모인다", () => {
    const forms = ["220-88-12345", "2208812345", " 220 88 12345 ", "220.88.12345"];
    const normalized = forms.map(normalizeBusinessNumber);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("2208812345");
  });

  it("값이 없으면 null 이다 — 빈 문자열이 유일 키를 차지하면 안 된다", () => {
    expect(normalizeBusinessNumber(null)).toBeNull();
    expect(normalizeBusinessNumber(undefined)).toBeNull();
    expect(normalizeBusinessNumber("")).toBeNull();
    expect(normalizeBusinessNumber("   ")).toBeNull();
    expect(normalizeBusinessNumber("---")).toBeNull();
  });

  it("숫자가 아닌 문자는 모두 떨어져 나간다", () => {
    expect(normalizeBusinessNumber("사업자 220-88-12345 번")).toBe("2208812345");
  });
});
