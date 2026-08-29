import { describe, expect, it } from "vitest";
import { displayEmail } from "./format";

describe("displayEmail", () => {
  it("탈퇴 계정의 보관용 접두사를 떼어 낸다", () => {
    expect(
      displayEmail("withdrawn+3f0a8577-3d50-4ced-8172-cda04721dcdb+heeue@naver.com"),
    ).toBe("heeue@naver.com");
  });

  it("보통 주소는 그대로 둔다", () => {
    expect(displayEmail("nora@example.com")).toBe("nora@example.com");
    // 사람이 실제로 쓰는 + 별칭까지 잘라내면 안 된다.
    expect(displayEmail("nora+arena@example.com")).toBe("nora+arena@example.com");
    // uuid 자리가 아니면 접두사로 보지 않는다.
    expect(displayEmail("withdrawn+abc+nora@example.com")).toBe("withdrawn+abc+nora@example.com");
  });
});
