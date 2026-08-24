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

describe("서울아레나 소개 — 3단계 모두 열람", () => {
  for (const state of ["GUEST", "PENDING", "APPROVED"] as const) {
    it(`${state} 도 /seoularena 를 본다`, () => expect(canAccess("/seoularena", state)).toBe(true));
  }
  it("하위 경로도 열린다", () => expect(canAccess("/seoularena/x", "GUEST")).toBe(true));
  // 규칙이 없는 경로는 공개로 보기 때문에, 규칙이 실제로 걸려 있는지도 같이 확인한다.
  // (이게 없으면 경로가 사라져도 테스트가 계속 통과한다 — 2026-08 IA 재구성 때 실제로 그랬다.)
  it("규칙이 실제로 등록돼 있다", () => expect(findRule("/seoularena")?.label).toBe("서울아레나"));
});

describe("IA 재구성으로 새로 생긴 페이지 — 비로그인 차단", () => {
  for (const [path, label] of [
    ["/features", "시설 제원"],
    ["/rates", "대관료"],
    ["/rules", "대관 규약"],
    ["/documents", "대관 자료"],
  ] as const) {
    it(`${label} 은 비로그인이 막힌다`, () => expect(canAccess(path, "GUEST")).toBe(false));
    it(`${label} 은 승인 대기도 열람한다`, () => expect(canAccess(path, "PENDING")).toBe(true));
    it(`${label} 규칙이 등록돼 있다`, () => expect(findRule(path)?.label).toBe(label));
  }
});

describe("사라진 경로", () => {
  // /venue·/packages 는 IA 재구성으로 없어졌다. 규칙도 같이 지웠는지 확인한다.
  it("/venue 규칙은 남아 있지 않다", () => expect(findRule("/venue")).toBeUndefined());
  it("/packages 규칙은 남아 있지 않다", () => expect(findRule("/packages")).toBeUndefined());
});

describe("대관안내·대관현황 — 비로그인 차단, 로그인하면 승인 전에도 열람", () => {
  it("비로그인은 대관안내가 막힌다", () => expect(canAccess("/guide", "GUEST")).toBe(false));
  it("승인 대기도 대관안내를 본다", () => expect(canAccess("/guide", "PENDING")).toBe(true));
  it("비로그인은 대관현황이 막힌다", () => expect(canAccess("/notices", "GUEST")).toBe(false));
  it("승인 대기도 대관현황을 본다", () => expect(canAccess("/notices", "PENDING")).toBe(true));
});

describe("대관신청·신청내역 — 승인 완료 필수", () => {
  it("승인 대기는 대관신청이 막힌다", () => expect(canAccess("/apply", "PENDING")).toBe(false));
  it("미승인도 막힌다", () => expect(canAccess("/apply", "REJECTED")).toBe(false));
  it("승인 완료만 가능하다", () => expect(canAccess("/apply", "APPROVED")).toBe(true));
  it("신청내역도 승인 완료여야 한다", () => expect(canAccess("/mypage", "PENDING")).toBe(false));
  it("마이페이지 하위(시설회의·정산·티켓오픈)도 승인 완료여야 한다", () =>
    expect(canAccess("/mypage/settlement", "PENDING")).toBe(false));
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
