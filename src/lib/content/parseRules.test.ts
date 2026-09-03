import { describe, expect, it } from "vitest";
import { isRuleTableParagraph, parseRules } from "./pageContent";

// 좌측 목차는 이 함수가 뽑은 "장" 으로 만들어진다. 목차에서 빠지면 본문에는 있는데
// 찾아갈 수가 없다 — 규약은 길어서 스크롤로 찾는 문서가 아니다.
describe("parseRules", () => {
  it("장·조·항을 나눈다", () => {
    const chapters = parseRules(
      ["제1장 총칙", "제1조 (목적)", "① 이 규약은 …", "② 또한 …", "제2조 (적용범위)", "① …"].join(
        "\n",
      ),
    );
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("제1장 총칙");
    expect(chapters[0].articles.map((a) => a.title)).toEqual(["제1조 (목적)", "제2조 (적용범위)"]);
    expect(chapters[0].articles[0].paragraphs).toEqual(["① 이 규약은 …", "② 또한 …"]);
  });

  // [신규 2026-09-02] 부칙은 장 번호가 없어 목차에서 빠졌고, 시행일을 보려면
  // 본문 끝까지 스크롤해야 했다.
  it("부칙도 장으로 잡아 목차에 올린다", () => {
    const chapters = parseRules(
      ["제10장 대관 종료", "제57조 (준용)", "① …", "부칙", "제1조 (시행일)", "본 규약은 …"].join(
        "\n",
      ),
    );
    expect(chapters.map((c) => c.title)).toEqual(["제10장 대관 종료", "부칙"]);
    expect(chapters[1].articles.map((a) => a.title)).toEqual(["제1조 (시행일)"]);
  });

  it("부칙 뒤에 날짜가 붙어도 잡는다", () => {
    expect(parseRules("부칙 (2026.9.1.)\n제1조 (시행일)\n본 규약은 …")[0].title).toBe(
      "부칙 (2026.9.1.)",
    );
    expect(parseRules("부 칙\n제1조 (시행일)\n…")[0].title).toBe("부 칙");
  });

  it("장 번호가 붙은 부칙도 그대로 장이다", () => {
    // 시드 본문은 "제15장 부칙" 형태다 — 예전 규칙으로도 잡히던 것이 계속 잡혀야 한다.
    expect(parseRules("제15장 부칙\n제1조 (시행일)\n…")[0].title).toBe("제15장 부칙");
  });

  it("'부칙'으로 시작하는 다른 문장은 장으로 보지 않는다", () => {
    const chapters = parseRules("제1장 총칙\n제1조 (목적)\n부칙에 정한 바에 따른다");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].articles[0].paragraphs).toEqual(["부칙에 정한 바에 따른다"]);
  });

  // [신규 2026-09-02] 규약 본문에 표를 넣을 수 있어야 한다는 요청. 표는 여러 줄에
  // 걸쳐 있으므로 한 항으로 묶어야 하고, 줄마다 쪼개지면 화면에 태그가 그대로 찍힌다.
  it("표는 여러 줄이어도 한 항으로 묶는다", () => {
    const chapters = parseRules(
      [
        "제1장 총칙",
        "제1조 (요금)",
        "요금은 아래와 같다.",
        "<table>",
        "  <thead><tr><th>구분</th><th>금액</th></tr></thead>",
        "  <tbody><tr><td>기본</td><td>100원</td></tr></tbody>",
        "</table>",
        "부가세는 별도다.",
      ].join("\n"),
    );
    const paragraphs = chapters[0].articles[0].paragraphs;
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toBe("요금은 아래와 같다.");
    expect(isRuleTableParagraph(paragraphs[1])).toBe(true);
    expect(paragraphs[1]).toContain("<th>구분</th>");
    expect(paragraphs[1]).toContain("</table>");
    expect(paragraphs[2]).toBe("부가세는 별도다.");
  });

  it("한 줄짜리 표도 잡는다", () => {
    const chapters = parseRules("제1조 (표)\n<table><tr><td>가</td></tr></table>");
    expect(chapters[0].articles[0].paragraphs).toEqual(["<table><tr><td>가</td></tr></table>"]);
  });

  /*
    [수정 2026-09-03] 조 밖의 표도 버리지 않는다.

    예전에는 조용히 버렸다. 그런데 표를 넣는 자리가 대개 별표·부칙이라(조 번호가 없다)
    운영자가 규약에 표를 넣어도 화면에 아무것도 나오지 않았다 — 저장은 됐는데 화면에서만
    사라지니 고장으로 보인다. 제목 없는 조를 만들어 담고, 화면은 그 머리글을 그리지 않는다.
  */
  it("조 밖의 표도 제목 없는 조에 담아 살린다", () => {
    const chapters = parseRules("제1장 총칙\n<table><tr><td>가</td></tr></table>\n제1조 (목적)\n① …");
    expect(chapters[0].articles[0]).toEqual({
      title: "",
      paragraphs: ["<table><tr><td>가</td></tr></table>"],
    });
    expect(chapters[0].articles[1].title).toBe("제1조 (목적)");
    expect(chapters[0].articles[1].paragraphs).toEqual(["① …"]);
  });

  it("별표 아래의 글과 표를 모두 싣는다", () => {
    const chapters = parseRules(
      [
        "[별표 1] 위약금 산정표",
        "취소 시점에 따라 아래와 같이 정한다.",
        "<table>",
        "<tr><th>시점</th><th>위약금</th></tr>",
        "<tr><td>30일 전</td><td>30%</td></tr>",
        "</table>",
      ].join("\n"),
    );
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("[별표 1] 위약금 산정표");
    expect(chapters[0].articles[0].paragraphs).toHaveLength(2);
    expect(chapters[0].articles[0].paragraphs[1]).toContain("<table>");
  });

  it("표 안의 '제1조' 같은 글자를 조 제목으로 잘못 잡지 않는다", () => {
    const chapters = parseRules(
      ["제1조 (준용)", "<table>", "<tr><td>제2조 (별표)</td></tr>", "</table>"].join("\n"),
    );
    expect(chapters[0].articles).toHaveLength(1);
    expect(chapters[0].articles[0].paragraphs).toHaveLength(1);
  });

  // [신규 2026-09-02] 별표는 규약 뒤에 붙는데 장 번호가 없어 목차에서 빠졌다.
  it("별표도 장으로 잡아 목차에 올린다", () => {
    const chapters = parseRules(
      ["제15장 부칙", "제1조 (시행일)", "…", "별표 1 대관료 산정표", "제1조 (기준)", "…"].join("\n"),
    );
    expect(chapters.map((c) => c.title)).toEqual(["제15장 부칙", "별표 1 대관료 산정표"]);
  });

  it("괄호·공백이 섞인 별표 표기도 잡는다", () => {
    expect(parseRules("[별표 2] 위약금\n제1조 (기준)\n…")[0].title).toBe("[별표 2] 위약금");
    expect(parseRules("별 표 1\n제1조 (기준)\n…")[0].title).toBe("별 표 1");
    expect(parseRules("<별표 3>\n제1조 (기준)\n…")[0].title).toBe("<별표 3>");
  });

  it("'별표' 로 시작해도 번호가 없으면 장으로 보지 않는다", () => {
    const chapters = parseRules("제1장 총칙\n제1조 (목적)\n별표에 정한 바에 따른다");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].articles[0].paragraphs).toEqual(["별표에 정한 바에 따른다"]);
  });

  it("장 없이 조부터 시작하면 총칙으로 감싼다", () => {
    const chapters = parseRules("제1조 (목적)\n① …");
    expect(chapters[0].title).toBe("총칙");
  });
});
