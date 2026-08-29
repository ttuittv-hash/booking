import { describe, expect, it } from "vitest";
import { formatQuoteNumber } from "./db";

// 이 값은 quotes 의 기본키다 — URL(/quotes/{id})과 업로드 경로(uploads/{id}/)에 그대로
// 박혀서, 한 번 발급되면 소급해서 못 바꾼다. 형식이 흔들리면 이미 나간 링크가 끊기므로
// 여기서 못 박아 둔다.
describe("신청번호 채번 형식", () => {
  it("연도-5자리 순번이다", () => {
    expect(formatQuoteNumber(2026, 6)).toBe("2026-00006");
    expect(formatQuoteNumber(2027, 125)).toBe("2027-00125");
  });

  it("접두사를 붙이지 않는다", () => {
    // "SA-" 는 서울아레나 약자였다. 브랜드가 바뀌어도 신청번호는 따라 틀려지면 안 된다
    // (2026-08-29 제거). 되살리지 말 것.
    expect(formatQuoteNumber(2026, 1)).not.toMatch(/^[A-Za-z]/);
  });

  it("5자리를 넘으면 자르지 않고 그대로 늘린다", () => {
    // 한 해 10만 건을 넘길 일은 없지만, 넘겼을 때 잘라서 번호가 겹치면 기본키 충돌이다.
    expect(formatQuoteNumber(2026, 123456)).toBe("2026-123456");
  });
});
