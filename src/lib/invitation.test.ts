import { describe, expect, it } from "vitest";
import {
  hashInviteToken,
  inviteEmailMatches,
  inviteNameMatches,
  invitePhoneLooksMatched,
  invitePhoneMatches,
  issueInviteToken,
  maskInvitePhone,
} from "./invitation";

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

// [신규 2026-09-02] 링크는 전달된다 — 초대받은 1 이 2 에게 넘기면 2 가 가입할 수 있었다.
// 번호·이메일·이름 셋이 모두 맞아야 초대가 성립한다.
describe("inviteEmailMatches", () => {
  it("대소문자·앞뒤 공백은 무시한다", () => {
    expect(inviteEmailMatches("Nora@Example.com", " nora@example.com ")).toBe(true);
  });

  it("다른 주소는 막는다", () => {
    expect(inviteEmailMatches("ted@example.com", "nora@example.com")).toBe(false);
  });

  it("한쪽이 비면 통과시키지 않는다", () => {
    expect(inviteEmailMatches("", "nora@example.com")).toBe(false);
    expect(inviteEmailMatches("nora@example.com", null)).toBe(false);
    expect(inviteEmailMatches("", "")).toBe(false);
  });
});

describe("inviteNameMatches", () => {
  it("공백 차이는 같은 이름으로 본다", () => {
    expect(inviteNameMatches("홍 길동", "홍길동")).toBe(true);
  });

  it("전달받은 다른 사람은 막는다", () => {
    expect(inviteNameMatches("김철수", "홍길동")).toBe(false);
  });

  it("직함·약칭은 다른 이름으로 본다 — 대표가 실명을 적어야 한다", () => {
    expect(inviteNameMatches("김철수", "김대리")).toBe(false);
  });

  it("한쪽이 비면 통과시키지 않는다", () => {
    expect(inviteNameMatches(null, "홍길동")).toBe(false);
    expect(inviteNameMatches("홍길동", "")).toBe(false);
    expect(inviteNameMatches("", "")).toBe(false);
  });
});

describe("maskInvitePhone · invitePhoneLooksMatched", () => {
  it("가운데를 가린다", () => {
    expect(maskInvitePhone("010-1234-5678")).toBe("010-****-5678");
  });

  it("자릿수가 모자라면 빈 문자열", () => {
    expect(maskInvitePhone("1234")).toBe("");
    expect(maskInvitePhone(null)).toBe("");
  });

  it("화면 사전 대조는 앞 3 · 뒤 4 로 판단한다", () => {
    expect(invitePhoneLooksMatched("01012345678", "010-****-5678")).toBe(true);
    expect(invitePhoneLooksMatched("01087655678", "010-****-5678")).toBe(true); // 가운데는 못 본다
    expect(invitePhoneLooksMatched("01012345679", "010-****-5678")).toBe(false);
    expect(invitePhoneLooksMatched("01112345678", "010-****-5678")).toBe(false);
  });

  it("마스크가 없거나 인증 번호가 없으면 일치로 보지 않는다", () => {
    expect(invitePhoneLooksMatched("01012345678", "")).toBe(false);
    expect(invitePhoneLooksMatched(null, "010-****-5678")).toBe(false);
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
