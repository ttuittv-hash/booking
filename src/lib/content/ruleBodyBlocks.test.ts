import { describe, expect, it } from "vitest";
import {
  blankTable,
  joinRuleBody,
  parseTableHtml,
  splitRuleBody,
  tableToHtml,
  type RuleBodyBlock,
} from "./ruleBodyBlocks";
import { parseRules } from "./pageContent";

const BODY = [
  "제1장 총칙",
  "제1조 (요금)",
  "요금은 아래와 같다.",
  "<table>",
  "  <thead>",
  "    <tr><th>구분</th><th>금액</th></tr>",
  "  </thead>",
  "  <tbody>",
  "    <tr><td>기본</td><td>100원</td></tr>",
  "  </tbody>",
  "</table>",
  "부가세는 별도다.",
].join("\n");

describe("splitRuleBody", () => {
  it("글과 표를 순서대로 쪼갠다", () => {
    const blocks = splitRuleBody(BODY);
    expect(blocks.map((b) => b.kind)).toEqual(["text", "table", "text"]);
    const table = blocks[1];
    expect(table.kind === "table" && table.head).toEqual(["구분", "금액"]);
    expect(table.kind === "table" && table.rows).toEqual([["기본", "100원"]]);
  });

  it("표가 없으면 글 한 덩어리", () => {
    expect(splitRuleBody("제1조 (목적)\n① …")).toEqual([
      { kind: "text", text: "제1조 (목적)\n① …" },
    ]);
  });

  it("빈 본문에도 편집할 자리를 하나 준다", () => {
    expect(splitRuleBody("")).toEqual([{ kind: "text", text: "" }]);
  });

  // 되돌리기에서 내용을 잃지 않는 것이 이 모듈의 유일한 규칙이다.
  it("우리 형태가 아닌 표는 격자로 만들지 않고 원문 그대로 남긴다", () => {
    const odd = '제1조 (표)\n<table class="x"><tr><td colspan="2">가</td></tr></table>';
    const blocks = splitRuleBody(odd);
    expect(blocks.every((b) => b.kind === "text")).toBe(true);
    expect(joinRuleBody(blocks)).toContain('colspan="2"');
  });

  it("닫는 태그가 없는 조각도 잃지 않는다", () => {
    const broken = "제1조 (표)\n<table>\n<tr><td>가</td></tr>";
    expect(joinRuleBody(splitRuleBody(broken))).toContain("<tr><td>가</td></tr>");
  });
});

describe("joinRuleBody", () => {
  it("쪼갠 뒤 합치면 규약 구조가 그대로 살아 있다", () => {
    const round = joinRuleBody(splitRuleBody(BODY));
    const chapters = parseRules(round);
    expect(chapters[0].title).toBe("제1장 총칙");
    const paragraphs = chapters[0].articles[0].paragraphs;
    expect(paragraphs[0]).toBe("요금은 아래와 같다.");
    expect(paragraphs[1]).toContain("<th>구분</th>");
    expect(paragraphs[2]).toBe("부가세는 별도다.");
  });

  it("빈 블록은 떨어뜨린다 — 빈 줄만 쌓이면 본문이 벌어진다", () => {
    const blocks: RuleBodyBlock[] = [
      { kind: "text", text: "가" },
      { kind: "text", text: "   " },
      { kind: "text", text: "나" },
    ];
    expect(joinRuleBody(blocks)).toBe("가\n\n나");
  });
});

describe("tableToHtml", () => {
  it("칸 안의 <, & 는 그대로 글자로 남는다", () => {
    const html = tableToHtml(["a<b"], [["x & y"]]);
    expect(html).toContain("<th>a&lt;b</th>");
    expect(html).toContain("<td>x &amp; y</td>");
    // 다시 읽으면 원래 글자로 돌아온다
    expect(parseTableHtml(html)).toEqual({ head: ["a<b"], rows: [["x & y"]] });
  });

  it("머리행 없이도 만든다", () => {
    expect(tableToHtml([], [["가", "나"]])).not.toContain("<thead>");
  });
});

describe("blankTable", () => {
  it("행·열 수대로 빈 표를 만든다", () => {
    const t = blankTable(2, 3);
    expect(t.kind === "table" && t.head).toHaveLength(3);
    expect(t.kind === "table" && t.rows).toHaveLength(2);
    expect(t.kind === "table" && t.rows[0]).toEqual(["", "", ""]);
  });
});
