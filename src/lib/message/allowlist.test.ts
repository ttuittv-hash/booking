import { describe, expect, it } from "vitest";
import { isRecipientAllowed } from "./allowlist";

describe("수신자 허용 목록", () => {
  it("목록이 없으면 전원 허용(운영)", () => {
    expect(isRecipientAllowed("01000001234", undefined)).toBe(true);
    expect(isRecipientAllowed("01000001234", "")).toBe(true);
  });
  it("목록이 있으면 그 번호만 — 하이픈·공백은 무시한다", () => {
    const list = "010-1111-2222, 01033334444";
    expect(isRecipientAllowed("010-1111-2222", list)).toBe(true);
    expect(isRecipientAllowed("01033334444", list)).toBe(true);
    expect(isRecipientAllowed("01000001234", list)).toBe(false);
    expect(isRecipientAllowed("", list)).toBe(false);
  });
});
