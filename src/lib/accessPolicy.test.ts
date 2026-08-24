import { describe, it, expect } from "vitest";
import { accountStateOf, canAccess, findRule, redirectFor } from "./accessPolicy";

// 기획서 A15 표를 그대로 고정한다. 이 표가 흔들리면 승인 전 계정이 대관신청까지
// 들어가거나, 반대로 안내 페이지조차 못 보게 된다.
describe("계정 상태 판정", () => {
  it("비로그인은 GUEST", () => expect(accountStateOf(null)).toBe("GUEST"));
  it("승인 대기는 PENDING", () =>
    expect(accountStateOf({ role: "APPLICANT", approvalStatus: "PENDING" })).toBe("PENDING"));
  it("미승인은 REJECTED", () =>
    expect(accountStateOf({ role: "APPLICANT", approvalStatus: "REJECTED" })).toBe("REJECTED"));
  it("승인 완료는 APPROVED", () =>
    expect(accountStateOf({ role: "APPLICANT", approvalStatus: "APPROVED" })).toBe("APPROVED"));
  it("운영자는 매트릭스 대상이 아니라 APPROVED 로 본다", () =>
    expect(accountStateOf({ role: "ADMIN", approvalStatus: "APPROVED" })).toBe("APPROVED"));
});

describe("시설 소개 — 3단계 모두 열람", () => {
  for (const state of ["GUEST", "PENDING", "APPROVED"] as const) {
    it(`${state} 도 /venue 를 본다`, () => expect(canAccess("/venue", state)).toBe(true));
  }
  it("하위 경로도 열린다", () => expect(canAccess("/venue/specs", "GUEST")).toBe(true));
});

describe("대관 절차·대관현황 — 비로그인 차단, 로그인하면 승인 전에도 열람", () => {
  it("비로그인은 대관 절차가 막힌다", () => expect(canAccess("/guide", "GUEST")).toBe(false));
  it("승인 대기도 대관 절차를 본다", () => expect(canAccess("/guide", "PENDING")).toBe(true));
  it("비로그인은 대관현황이 막힌다", () => expect(canAccess("/notices", "GUEST")).toBe(false));
  it("승인 대기도 대관현황을 본다", () => expect(canAccess("/notices", "PENDING")).toBe(true));
});

describe("대관신청·신청내역 — 승인 완료 필수", () => {
  it("승인 대기는 대관신청이 막힌다", () => expect(canAccess("/apply", "PENDING")).toBe(false));
  it("미승인도 막힌다", () => expect(canAccess("/apply", "REJECTED")).toBe(false));
  it("승인 완료만 가능하다", () => expect(canAccess("/apply", "APPROVED")).toBe(true));
  it("신청내역도 승인 완료여야 한다", () => expect(canAccess("/mypage", "PENDING")).toBe(false));
});

describe("마이 — 승인 대기여도 본인 정보 수정은 가능", () => {
  it("승인 대기도 정보수정에 들어간다", () =>
    expect(canAccess("/mypage/profile", "PENDING")).toBe(true));
  it("승인 대기도 탈퇴할 수 있다", () =>
    expect(canAccess("/mypage/withdraw", "PENDING")).toBe(true));
  it("더 긴 접두사가 먼저 잡혀 /mypage 규칙에 삼켜지지 않는다", () =>
    expect(findRule("/mypage/profile")?.label).toBe("회원정보 수정"));
});

describe("차단 시 이동 경로", () => {
  it("비로그인은 로그인으로 보내고 돌아올 곳을 남긴다", () =>
    expect(redirectFor("GUEST", "/apply")).toBe("/login?next=%2Fapply"));
  it("승인 대기는 대기 안내로 보낸다", () => expect(redirectFor("PENDING", "/apply")).toBe("/pending"));
  it("미승인은 사유를 볼 수 있게 구분한다", () =>
    expect(redirectFor("REJECTED", "/apply")).toBe("/pending?state=rejected"));
});

describe("규칙이 없는 경로", () => {
  it("홈은 누구나 본다", () => expect(canAccess("/", "GUEST")).toBe(true));
  it("약관 페이지도 열린다", () => expect(canAccess("/terms", "GUEST")).toBe(true));
});
