import { describe, expect, it } from "vitest";
import { parseInlineLinks } from "./inlineLinks";

// 운영자가 콘텐츠 관리에서 넣는 링크 표기다. 외부 주소가 링크가 되면 그 문구가
// 그대로 신청자에게 보이는 피싱 링크가 되므로, 그 선을 테스트로 고정한다.
describe("parseInlineLinks", () => {
  it("내부 경로는 링크 조각이 된다", () => {
    expect(parseInlineLinks("자세한 내용은 [대관료](/rates)를 확인하세요.")).toEqual([
      { type: "text", text: "자세한 내용은 " },
      { type: "link", text: "대관료", href: "/rates" },
      { type: "text", text: "를 확인하세요." },
    ]);
  });

  it("한 문장에 여러 링크가 있어도 모두 살아난다", () => {
    const parts = parseInlineLinks("[대관 규약](/rules), [대관료](/rates), [공지사항](/notices)");
    expect(parts.filter((p) => p.type === "link").map((p) => p.href)).toEqual([
      "/rules",
      "/rates",
      "/notices",
    ]);
  });

  it("여러 번 호출해도 앞 호출의 위치가 남지 않는다", () => {
    // 정규식을 모듈 수준에 두면 lastIndex 가 남아 두 번째 호출이 링크를 건너뛴다.
    parseInlineLinks("[대관료](/rates)");
    expect(parseInlineLinks("[대관료](/rates)")).toEqual([
      { type: "link", text: "대관료", href: "/rates" },
    ]);
  });

  it("외부 주소는 링크로 만들지 않고 글자만 남긴다", () => {
    expect(parseInlineLinks("[여기](https://evil.example.com) 를 누르세요")).toEqual([
      { type: "text", text: "여기" },
      { type: "text", text: " 를 누르세요" },
    ]);
  });

  it("프로토콜 상대 주소도 외부로 본다", () => {
    expect(parseInlineLinks("[여기](//evil.example.com)")).toEqual([
      { type: "text", text: "여기" },
    ]);
  });

  it("링크 표기가 없으면 원문 그대로다", () => {
    expect(parseInlineLinks("그냥 문장입니다.")).toEqual([
      { type: "text", text: "그냥 문장입니다." },
    ]);
  });
});
