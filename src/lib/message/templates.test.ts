import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  findTemplate,
  placeholdersIn,
  renderTemplate,
  TemplateVariableError,
} from "./templates";
import { classifyBizTalkCode, isBizTalkConfigured } from "./kakaoBizTalk";

// 기획서 B2 — 1차 오픈(8/24) 회원가입 5종.
describe("1차 오픈 템플릿", () => {
  it("MB-01~05(+합류용 MB-01J)가 1차 오픈 대상이다", () => {
    const first = TEMPLATES.filter((t) => t.release === "FIRST").map((t) => t.code);
    expect(first).toEqual(["MB-01", "MB-01J", "MB-02", "MB-03", "MB-04", "MB-05"]);
  });

  it("선언한 변수와 본문의 자리표시자가 일치한다", () => {
    // 어긋나면 빈 값이 그대로 발송되거나, 채워야 할 값을 안 채운다.
    for (const t of TEMPLATES) {
      expect(new Set(placeholdersIn(t.body))).toEqual(new Set(t.variables));
    }
  });

  it("MB-03 은 신청자명·거절사유가 필수 변수다", () => {
    expect(findTemplate("MB-03")?.variables).toEqual(["신청자명", "거절사유"]);
  });
});

describe("변수 바인딩 (기획서 1-54)", () => {
  it("변수를 채워 본문을 만든다", () => {
    const body = renderTemplate("MB-03", { 신청자명: "홍길동", 거절사유: "사업자 상태 확인 불가" });
    expect(body).toContain("홍길동님");
    expect(body).toContain("▪︎사유\n사업자 상태 확인 불가");
  });

  it("변수가 없으면 발송 전에 막는다", () => {
    expect(() => renderTemplate("MB-03", {})).toThrow(TemplateVariableError);
  });

  it("빈 문자열·공백도 누락으로 본다", () => {
    expect(() => renderTemplate("MB-03", { 신청자명: "홍길동", 거절사유: "   " })).toThrow(/변수 누락/);
  });

  it("변수가 없는 템플릿은 그대로 렌더링된다", () => {
    expect(renderTemplate("MB-02", { 신청자명: "홍길동" })).toContain("가입이 승인되었습니다");
  });

  it("없는 템플릿은 오류다", () => {
    expect(() => renderTemplate("XX-99", {})).toThrow(TemplateVariableError);
  });

  it("자리표시자가 남지 않는다", () => {
    const body = renderTemplate("MB-05", { 회사명: "카카오", 신청자명: "홍길동" });
    expect(body).not.toContain("#{");
  });
});

describe("알림톡 어댑터", () => {
  it("키가 없으면 설정되지 않은 것으로 본다", () => {
    // 키를 아직 못 받았다 — 이 값이 false 면 파이프라인이 인앱만 쓴다.
    expect(isBizTalkConfigured()).toBe(false);
  });

  it("결과 코드를 실패 분류로 옮긴다", () => {
    expect(classifyBizTalkCode("410")).toBe("TEMPLATE");
    expect(classifyBizTalkCode("400")).toBe("TEMPLATE");
    expect(classifyBizTalkCode("520")).toBe("TRANSIENT");
    expect(classifyBizTalkCode("500")).toBe("TRANSIENT");
  });

  it("템플릿 오류는 재시도 대상이 아니다", () => {
    // 같은 요청을 다시 보내도 결과가 같다. 재시도하면 실패만 쌓인다.
    expect(classifyBizTalkCode("410")).not.toBe("TRANSIENT");
  });
});
