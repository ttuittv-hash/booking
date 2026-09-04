import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./sanitizeHtml";

describe("sanitizeRichText — 편집기가 만든 서식은 살리고 위험한 것만 걷어낸다", () => {
  it("글자 크기를 지우지 않는다 — 운영자가 맞춘 크기가 화면에 그대로 나가야 한다", () => {
    for (const size of ["14px", "10.5pt", "1.2rem", "120%"]) {
      const html = `<p><span style="font-size: ${size}">주석</span></p>`;
      expect(sanitizeRichText(html)).toContain(`font-size:${size}`);
    }
  });

  it("크기 자리에 이상한 값이 오면 뺀다", () => {
    const html = `<p><span style="font-size: expression(alert(1))">x</span></p>`;
    expect(sanitizeRichText(html)).not.toContain("expression");
  });

  it("굵게·취소선·색·표는 그대로 둔다", () => {
    const html =
      '<p><strong>굵게</strong><s>취소</s><span style="color:#a8200d">색</span></p>' +
      '<table><tbody><tr><th colspan="2">머리</th><td>칸</td></tr></tbody></table>';
    const out = sanitizeRichText(html);
    expect(out).toContain("<strong>굵게</strong>");
    expect(out).toContain("<s>취소</s>");
    expect(out).toContain("color:#a8200d");
    expect(out).toContain('colspan="2"');
  });

  it("스크립트와 이벤트 속성은 걷어낸다", () => {
    const out = sanitizeRichText('<p onclick="steal()">글</p><script>alert(1)</script>');
    expect(out).toBe("<p>글</p>");
  });

  it("자바스크립트 링크는 주소를 지운다", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">링크</a>')).not.toContain("javascript:");
  });
});
