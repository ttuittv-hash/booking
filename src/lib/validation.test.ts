import { describe, it, expect } from "vitest";
import {
  checkBusinessNumber,
  checkEmail,
  checkPassword,
  checkUsername,
  firstFailure,
  USERNAME_RE,
} from "./validation";

// 규칙이 흩어져 있어 중복확인은 통과하는데 가입에서 거부되던 상태를 고정한다.
describe("로그인 ID", () => {
  it("5~20자 영문·숫자를 받는다", () => {
    expect(checkUsername("abc12").ok).toBe(true);
    expect(checkUsername("A".repeat(20)).ok).toBe(true);
  });
  it("4자 이하는 거부한다", () => expect(checkUsername("abc1").ok).toBe(false));
  it("21자 이상은 거부한다", () => expect(checkUsername("a".repeat(21)).ok).toBe(false));
  it("한글·특수문자는 거부한다", () => {
    expect(checkUsername("아이디12").ok).toBe(false);
    expect(checkUsername("user_01").ok).toBe(false);
  });
  it("대문자를 허용한다 — 중복확인 API 와 같은 규칙이어야 한다", () =>
    expect(USERNAME_RE.test("User01")).toBe(true));
});

describe("비밀번호 (기획서 1-33)", () => {
  it("네 종류를 모두 포함한 8~20자를 받는다", () =>
    expect(checkPassword("Test1234!").ok).toBe(true));
  it("8자 미만은 거부한다", () => expect(checkPassword("Ab1!").ok).toBe(false));
  it("20자 초과는 거부한다", () => expect(checkPassword("Ab1!" + "x".repeat(20)).ok).toBe(false));
  it("대문자가 없으면 무엇이 빠졌는지 알려준다", () => {
    const r = checkPassword("test1234!");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("대문자");
  });
  it("특수문자가 없으면 알려준다", () => {
    expect(checkPassword("Test12345").message).toContain("특수문자");
  });
  it("빠진 것을 한꺼번에 알려준다", () => {
    const r = checkPassword("aaaaaaaa");
    expect(r.message).toContain("대문자");
    expect(r.message).toContain("숫자");
    expect(r.message).toContain("특수문자");
  });
});

describe("이메일", () => {
  it("정상 주소를 받는다", () => expect(checkEmail("a@b.co.kr").ok).toBe(true));
  it("형식이 아니면 거부한다", () => {
    expect(checkEmail("a@b").ok).toBe(false);
    expect(checkEmail("ab.co.kr").ok).toBe(false);
  });
});

describe("사업자등록번호", () => {
  it("하이픈이 있어도 10자리면 통과한다", () =>
    expect(checkBusinessNumber("120-81-47521").ok).toBe(true));
  it("자릿수가 모자라면 거부한다", () => expect(checkBusinessNumber("12081").ok).toBe(false));
});

describe("firstFailure", () => {
  it("첫 실패 하나만 돌려준다 — 사용자에게 한 번에 하나만 알린다", () => {
    const msg = firstFailure(checkUsername("ab"), checkPassword("x"), checkEmail("nope"));
    expect(msg).toContain("아이디");
  });
  it("전부 통과하면 null 이다", () => {
    expect(firstFailure(checkUsername("abc12"), checkPassword("Test1234!"))).toBeNull();
  });
});
