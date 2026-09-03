import { describe, expect, it } from "vitest";
import {
  blankTable,
  joinRuleBody,
  parsePastedBlocks,
  parsePastedTableHtml,
  parsePastedTsv,
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

// [회귀 2026-09-02] 규약 본문은 통째로 글 상자 하나다. 표를 "현재 블록 다음"에 넣으면
// 어디에 커서를 두든 문서 맨 끝(부칙·별표 뒤)에 붙어, 긴 본문에서는 화면 밖이라
// "표가 안 들어간다"로 보였다. 커서 자리에서 글을 쪼개 그 사이에 넣어야 한다.
describe("커서 자리에 표 넣기", () => {
  function insertAtCursor(body: string, cursor: number) {
    const blocks = splitRuleBody(body);
    const target = blocks[0];
    if (target.kind !== "text") throw new Error("글 블록이 아니다");
    const next: RuleBodyBlock[] = [
      { kind: "text", text: target.text.slice(0, cursor) },
      blankTable(1, 2),
      { kind: "text", text: target.text.slice(cursor) },
      ...blocks.slice(1),
    ];
    return joinRuleBody(next);
  }

  it("표가 문서 끝이 아니라 커서 자리에 들어간다", () => {
    const body = "제1조 (앞)\n① 가나다\n제2조 (뒤)\n① 라마바";
    const out = insertAtCursor(body, body.indexOf("제2조"));
    const kinds = splitRuleBody(out).map((b) => b.kind);
    expect(kinds).toEqual(["text", "table", "text"]);
    // 표는 제1조 뒤, 제2조 앞이다 — 뒤 조문이 표 아래에 그대로 남아야 한다
    const chapters = parseRules(out);
    expect(chapters[0].articles.map((a) => a.title)).toEqual(["제1조 (앞)", "제2조 (뒤)"]);
    expect(chapters[0].articles[0].paragraphs.some((p) => p.startsWith("<table"))).toBe(true);
    expect(chapters[0].articles[1].paragraphs).toEqual(["① 라마바"]);
  });
});

// [신규 2026-09-02] 페이지·워드에서 복사한 표는 class·style·colspan 이 붙어 있어
// 저장본용 엄격한 파서(parseTableHtml)에 걸린다. 붙여넣기는 원문을 보존할 것이
// 없으므로 태그를 벗기고 칸 값만 건진다.
describe("parsePastedTableHtml", () => {
  it("속성이 붙은 표도 격자로 읽는다", () => {
    const html = `<meta charset="utf-8"><table class="x" style="width:400px">
      <tr><th style="a">구분</th><th>금액</th></tr>
      <tr><td class="c"><p>기본</p></td><td>100원</td></tr>
    </table>`;
    expect(parsePastedTableHtml(html)).toEqual({
      head: ["구분", "금액"],
      rows: [["기본", "100원"]],
    });
  });

  it("<br> 은 줄바꿈으로 살린다", () => {
    const html = "<table><tr><td>가<br>나</td></tr></table>";
    const parsed = parsePastedTableHtml(html);
    expect(parsed?.rows[0][0]).toBe("가\n나");
  });

  it("머리행이 없으면 전부 본문 행이다", () => {
    const html = "<table><tr><td>가</td><td>나</td></tr></table>";
    expect(parsePastedTableHtml(html)).toEqual({ head: [], rows: [["가", "나"]] });
  });

  it("표가 아니면 손대지 않는다", () => {
    expect(parsePastedTableHtml("<p>그냥 글</p>")).toBeNull();
    expect(parsePastedTableHtml("")).toBeNull();
  });
});

describe("parsePastedTsv", () => {
  it("탭으로 나뉜 두 줄 이상이면 표로 본다", () => {
    expect(parsePastedTsv("구분\t금액\n기본\t100원")).toEqual({
      head: ["구분", "금액"],
      rows: [["기본", "100원"]],
    });
  });

  it("칸 수가 모자란 줄은 빈 칸으로 채운다", () => {
    const parsed = parsePastedTsv("가\t나\t다\n라\t마");
    expect(parsed?.rows[0]).toEqual(["라", "마", ""]);
  });

  // 글을 쓰다 탭이 낀 문장을 붙여넣었다고 표가 튀어나오면 안 된다.
  it("한 줄이거나 탭이 없으면 표로 보지 않는다", () => {
    expect(parsePastedTsv("구분\t금액")).toBeNull();
    expect(parsePastedTsv("제1조 (목적)\n① 이 규약은…")).toBeNull();
  });
});

/*
  [신규 2026-09-03] 붙여넣기가 본문을 삼키지 않는지.

  표 하나만 건져 오던 시절, 표가 든 문서를 붙여넣으면 글이 전부 사라졌다. 본문을 다
  선택한 채 붙여넣었다면 규약 전문이 표 한 장으로 바뀌어 화면이 통째로 비었다.
*/
describe("parsePastedBlocks", () => {
  it("표 앞뒤의 글까지 순서대로 담는다", () => {
    const blocks = parsePastedBlocks(
      [
        "<p>제12조 (위약금)</p>",
        "<p>① 취소 시점에 따라 아래와 같다.</p>",
        "<table><tr><th>시점</th><th>위약금</th></tr><tr><td>30일 전</td><td>30%</td></tr></table>",
        "<p>② 천재지변은 예외로 한다.</p>",
      ].join(""),
    );
    expect(blocks).toEqual([
      { kind: "text", text: "제12조 (위약금)\n① 취소 시점에 따라 아래와 같다." },
      { kind: "table", head: ["시점", "위약금"], rows: [["30일 전", "30%"]] },
      { kind: "text", text: "② 천재지변은 예외로 한다." },
    ]);
  });

  it("표가 여럿이면 사이의 글도 각각 남긴다", () => {
    const blocks = parsePastedBlocks(
      "<table><tr><td>가</td></tr></table><p>사이 글</p><table><tr><td>나</td></tr></table>",
    );
    expect(blocks?.map((b) => b.kind)).toEqual(["table", "text", "table"]);
  });

  it("표가 없으면 손대지 않는다(평범한 붙여넣기에 맡긴다)", () => {
    expect(parsePastedBlocks("<p>그냥 글</p>")).toBeNull();
    expect(parsePastedBlocks("")).toBeNull();
  });
});
