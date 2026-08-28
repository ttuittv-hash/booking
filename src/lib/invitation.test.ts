import { describe, expect, it } from "vitest";
import { hashInviteToken, invitePhoneMatches, issueInviteToken } from "./invitation";

describe("invitePhoneMatches", () => {
  it("표기가 달라도 숫자가 같으면 통과한다", () => {
    expect(invitePhoneMatches("01012345678", "010-1234-5678")).toBe(true);
    expect(invitePhoneMatches("010-1234-5678", "010 1234 5678")).toBe(true);
    expect(invitePhoneMatches("+82 10 1234 5678", "821012345678")).toBe(true);
  });

  it("다른 번호는 막는다", () => {
    expect(invitePhoneMatches("01012345678", "01087654321")).toBe(false);
    // 뒤 네 자리만 다른 경우까지 확실히 걸러야 한다.
    expect(invitePhoneMatches("01012345678", "01012345679")).toBe(false);
  });

  it("인증 번호가 없으면 절대 통과시키지 않는다", () => {
    // 본인인증을 쓰지 않는 환경에서 번호만 맞춰 적어도 통과하면 안 된다.
    expect(invitePhoneMatches(null, "01012345678")).toBe(false);
    expect(invitePhoneMatches(undefined, "01012345678")).toBe(false);
    expect(invitePhoneMatches("", "01012345678")).toBe(false);
  });

  it("초대장에 번호가 없으면 통과시키지 않는다", () => {
    expect(invitePhoneMatches("01012345678", null)).toBe(false);
    expect(invitePhoneMatches("01012345678", "")).toBe(false);
  });

  it("빈 값끼리 같다고 판정하지 않는다", () => {
    expect(invitePhoneMatches("", "")).toBe(false);
    expect(invitePhoneMatches(null, null)).toBe(false);
    expect(invitePhoneMatches("--", "--")).toBe(false);
  });

  it("자릿수가 모자란 값은 막는다", () => {
    expect(invitePhoneMatches("12345678", "12345678")).toBe(false);
  });
});

describe("초대 토큰", () => {
  it("발급할 때마다 다르고, 해시는 같은 입력에 같은 값을 준다", () => {
    const a = issueInviteToken();
    const b = issueInviteToken();
    expect(a).not.toBe(b);
    expect(hashInviteToken(a)).toBe(hashInviteToken(a));
    expect(hashInviteToken(a)).not.toBe(hashInviteToken(b));
    // 원문이 그대로 저장되지 않는다.
    expect(hashInviteToken(a)).not.toBe(a);
  });
});
