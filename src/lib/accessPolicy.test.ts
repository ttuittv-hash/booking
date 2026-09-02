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

// [개정 2026-09-02] 시설 제원·대관 절차는 로그인 없이 본다 — 어떤 공연장인지,
// 어떻게 신청하는지는 가입을 결정하기 전에 알아야 하는 정보다.
describe("시설 제원 · 대관 절차 — 비로그인도 열람", () => {
  for (const [path, label] of [
    ["/features", "시설 제원"],
    ["/guide", "대관 절차"],
  ] as const) {
    it(`${label} 은 비로그인도 본다`, () => expect(canAccess(path, "GUEST")).toBe(true));
    it(`${label} 은 승인 대기도 본다`, () => expect(canAccess(path, "PENDING")).toBe(true));
    it(`${label} 은 반려된 계정도 본다`, () => expect(canAccess(path, "REJECTED")).toBe(true));
    it(`${label} 규칙이 등록돼 있다`, () => expect(findRule(path)?.label).toBe(label));
  }
});

// [개정 2026-09-02] 승인 완료 전에는 Your Stage 와 마이페이지만 본다.
// 대관 업무에 관한 내용(절차·요금·규약·자료·공지)은 심사를 통과한 대관사에게만 준다.
describe("대관 업무 메뉴 — 승인 완료 전용", () => {
  for (const [path, label] of [
    ["/rates", "대관료"],
    ["/rules", "대관 규약"],
    ["/documents", "대관 자료"],
    ["/notices", "공지사항"],
    // [추가 2026-09-02] FAQ 도 대관 업무 안내다 — 승인 전에는 1:1 문의로 받는다.
    ["/faq", "FAQ"],
  ] as const) {
    it(`${label} 은 비로그인이 막힌다`, () => expect(canAccess(path, "GUEST")).toBe(false));
    it(`${label} 은 승인 대기가 막힌다`, () => expect(canAccess(path, "PENDING")).toBe(false));
    it(`${label} 은 반려된 계정이 막힌다`, () => expect(canAccess(path, "REJECTED")).toBe(false));
    it(`${label} 은 승인 완료만 본다`, () => expect(canAccess(path, "APPROVED")).toBe(true));
    it(`${label} 규칙이 등록돼 있다`, () => expect(findRule(path)?.label).toBe(label));
  }
});

describe("사라진 경로", () => {
  // /venue·/packages 는 IA 재구성으로 없어졌다. 규칙도 같이 지웠는지 확인한다.
  it("/venue 규칙은 남아 있지 않다", () => expect(findRule("/venue")).toBeUndefined());
  it("/packages 규칙은 남아 있지 않다", () => expect(findRule("/packages")).toBeUndefined());
});

// 승인 대기 상태에서 실제로 열려 있어야 하는 것 — 이게 "Your Stage 와 마이페이지" 다.
// /pending 화면이 이 경로들로 링크하므로, 막히면 안내에서 갈 곳이 없어진다.
describe("승인 대기에 열려 있는 곳", () => {
  it("서울아레나 소개는 비로그인부터 열린다", () =>
    expect(canAccess("/seoularena", "PENDING")).toBe(true));
  it("시설 제원은 누구나 열린다", () => expect(canAccess("/features", "PENDING")).toBe(true));
  it("대관 절차도 누구나 열린다", () => expect(canAccess("/guide", "PENDING")).toBe(true));
  it("회원정보 수정", () => expect(canAccess("/mypage/profile", "PENDING")).toBe(true));
  it("회원 탈퇴", () => expect(canAccess("/mypage/withdraw", "PENDING")).toBe(true));
  it("1:1 문의 — 대기·반려 상태에서 물어볼 곳이 남아야 한다", () => {
    expect(canAccess("/mypage/inquiries", "PENDING")).toBe(true);
    expect(canAccess("/mypage/inquiries", "REJECTED")).toBe(true);
  });
  // [개정 2026-09-02] 승인 전에 열려 있는 것은 이 셋뿐이다 — 서울아레나 소개 ·
  // 시설 제원 · 1:1 문의(+ 정보수정·탈퇴). FAQ 는 여기서 빠졌다.
  it("FAQ 는 승인 전에 막힌다 — 궁금한 것은 1:1 문의로 받는다", () => {
    expect(canAccess("/faq", "GUEST")).toBe(false);
    expect(canAccess("/faq", "PENDING")).toBe(false);
    expect(canAccess("/faq", "REJECTED")).toBe(false);
  });
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

  // [신규 2026-09-02] 반려 안내 화면(/pending)이 이 두 경로로 링크한다 —
  // "정보를 고쳐 재심사 요청" 과 "탈퇴" 가 반려된 사람의 유일한 출구다.
  // 여기가 막히면 반려된 사람은 다시 아무것도 할 수 없게 된다.
  it("반려된 계정도 정보수정에 들어간다", () =>
    expect(canAccess("/mypage/profile", "REJECTED")).toBe(true));
  it("반려된 계정도 탈퇴할 수 있다", () =>
    expect(canAccess("/mypage/withdraw", "REJECTED")).toBe(true));
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
