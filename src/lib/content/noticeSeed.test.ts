import { describe, expect, it } from "vitest";
import { SEED_NOTICE } from "./noticeSeed";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

// 공고문을 코드에 실어 두는 이상, 화면에 나갈 때 필터에 뜯기지 않는지가 전부다.
// (예전에 표·머리행이 통째로 사라진 적이 있어 렌더 경로를 그대로 태워 확인한다.)
describe("첫 공지 시드", () => {
  const clean = sanitizeRichText(SEED_NOTICE.body);

  it("표와 소제목이 살아남는다", () => {
    expect(clean).toContain("<table>");
    expect(clean).toContain("<th>신청 자격</th>");
    expect(clean).toContain("<h2>01 OVERVIEW — 공고 개요</h2>");
    expect(clean).toContain("<h3>아레나 대관료</h3>");
  });

  it("본문 길이가 필터 전후로 크게 줄지 않는다", () => {
    expect(clean.length).toBeGreaterThan(SEED_NOTICE.body.length * 0.95);
  });

  it("외부 링크를 넣지 않는다 — 운영자 편집 콘텐츠의 규칙", () => {
    expect(SEED_NOTICE.body).not.toMatch(/https?:\/\//);
  });

  it("공고의 뼈대(01~08)가 모두 있다", () => {
    for (const section of [
      "01 OVERVIEW",
      "02 SCHEDULE",
      "03 HOW TO APPLY",
      "04 RENTAL RATES",
      "05 EVALUATION",
      "06 CONTRACT",
      "07 NOTE",
      "08 CONTACT",
    ]) {
      expect(SEED_NOTICE.body).toContain(section);
    }
  });
});
