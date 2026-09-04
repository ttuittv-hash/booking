import { describe, it, expect } from "vitest";
import { QUOTE_TEMPLATES, TEMPLATES, findTemplate, placeholdersIn, renderTemplate, TemplateVariableError, templatePlaceholders, fillUrlVariables, findTemplateByKakaoCode } from "./templates";
import { classifyBizTalkCode, isBizTalkConfigured } from "./kakaoBizTalk";

// 기획서 B2 — 1차 오픈(8/24) 회원가입 5종.
describe("1차 오픈 템플릿", () => {
  it("MB-01~05(+합류용 MB-01J)와 2026-09-01 ARENA 연동분이 1차 오픈 대상이다", () => {
    const first = TEMPLATES.filter((t) => t.release === "FIRST").map((t) => t.code);
    expect(first).toEqual([
      "MB-01", "MB-01J", "MB-02", "MB-03", "MB-04", "MB-05",
      "MB-06", "MB-09", "MB-10",
      "ARENA-0003", "ARENA-0004", "ARENA-0012", "ARENA-0010", "ARENA-0009",
      // 0009 를 대체할 재등록분 — 버튼이 답변이 달린 그 문의로 바로 열린다 (2026-09-04)
      "ARENA-0019",
      "ARENA-0014", "ARENA-0015", "ARENA-0016",
    ]);
  });

  it("선언한 변수와 본문·버튼 링크의 자리표시자가 일치한다", () => {
    // 어긋나면 빈 값이 그대로 발송되거나, 채워야 할 값을 안 채운다. 버튼 URL 변수(0006·0016)도 포함.
    for (const t of TEMPLATES) {
      expect(new Set(templatePlaceholders(t))).toEqual(new Set(t.variables));
    }
  });

  it("2026-09-03 정본 전환: 회원가입 계열이 ARENA_ 코드로 나가고, 구 CTSELARNA0 코드는 MB-02·07·08 만 남는다", () => {
    const kakao = Object.fromEntries(TEMPLATES.map((t) => [t.code, t.kakaoTemplateCode]));
    expect(kakao["MB-01"]).toBe("ARENA_0001");
    expect(kakao["MB-03"]).toBe("ARENA_0002");
    expect(kakao["MB-04"]).toBe("ARENA_0005");
    expect(kakao["MB-06"]).toBe("ARENA_0006");
    expect(kakao["MB-09"]).toBe("ARENA_0007");
    expect(kakao["MB-10"]).toBe("ARENA_0008");
    const legacy = TEMPLATES.filter((t) => t.kakaoTemplateCode?.startsWith("CTSELARNA0_")).map((t) => t.code);
    expect(legacy).toEqual(["MB-02", "MB-07", "MB-08"]);
  });

  it("버튼 링크의 #{변수} 를 채우고, 비면 발송 전에 막는다 (초대 링크·비회원 문의 링크)", () => {
    expect(fillUrlVariables("https://partner.seoularena.net/#{초대링크}", { 초대링크: "register?invite=abc" })).toBe(
      "https://partner.seoularena.net/register?invite=abc",
    );
    expect(() => fillUrlVariables("https://partner.seoularena.net/#{초대링크}", { 초대링크: " " })).toThrow(
      TemplateVariableError,
    );
  });

  it("재등록 템플릿(0017·0018)은 카카오 코드로 찾을 수 있고 1차 목록에는 안 들어간다 — 승인 후 env 로 전환", () => {
    expect(findTemplateByKakaoCode("ARENA_0017")?.code).toBe("ARENA-0017");
    expect(findTemplateByKakaoCode("ARENA_0018")?.kakaoExtraButtons?.length).toBe(1);
    expect(findTemplateByKakaoCode("ARENA_0018")?.variables).toEqual(["신청자명", "거절사유"]);
    expect(findTemplateByKakaoCode("NOPE")).toBeUndefined();
  });

  it("ARENA_0002(반려)는 버튼 2개를 등록 순서대로 싣는다", () => {
    const t = TEMPLATES.find((x) => x.code === "MB-03")!;
    expect(t.button?.name).toBe("대관시스템 바로가기");
    expect(t.kakaoExtraButtons?.map((b) => b.name)).toEqual(["1:1 문의 바로가기"]);
  });

  it("신청서 이벤트(RT-01~09)도 변수·자리표시자가 일치하고 카카오 코드가 있다", () => {
    expect(QUOTE_TEMPLATES.map((t) => t.code)).toEqual([
      "RT-01", "RT-02", "RT-03", "RT-04", "RT-05", "RT-06", "RT-07", "RT-08", "RT-09",
    ]);
    for (const t of QUOTE_TEMPLATES) {
      expect(new Set(placeholdersIn(t.body))).toEqual(new Set(t.variables));
      expect(t.kakaoTemplateCode).toBe(t.code);
      expect(t.variables).toContain("신청번호");
    }
    expect(renderTemplate("RT-03", { 신청자명: "홍길동", 신청번호: "Q-1", 금액: "1,000" })).toContain("1,000원");
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
    const body = renderTemplate("MB-05", { 운영자명: "관리자" });
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
