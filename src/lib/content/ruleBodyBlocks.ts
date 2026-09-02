/**
 * 규약 본문을 "글 덩어리 + 표" 로 쪼갠다 (2026-09-02).
 *
 * 본문은 줄 단위 평문이고 그 위에 장·조 구조와 왼쪽 목차가 서 있다(`parseRules`). 표만
 * `<table>` HTML 로 섞여 들어가는데, 편집 화면에서 그 태그를 날것으로 보여 주면 운영자가
 * 표를 고칠 수가 없다 — 태그를 읽고 쓸 줄 알아야 하기 때문이다.
 *
 * 그래서 편집기는 저장 문자열을 이 함수로 **블록 목록**으로 펴서, 글은 텍스트 상자로,
 * 표는 칸이 보이는 격자로 보여 준다. 저장할 때 다시 한 문자열로 합친다.
 *
 * 되돌리기(round-trip)에서 내용을 잃지 않는 것이 이 모듈의 유일한 규칙이다 —
 * 우리가 만든 형태가 아닌 표(속성·colspan 등)는 **파싱하지 않고 글 덩어리로 남긴다.**
 * 못 알아본 표를 어설프게 고쳐 저장하면 원문이 소리 없이 뭉개진다.
 */

export type RuleBodyBlock =
  | { kind: "text"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

const TABLE_OPEN = /^<table\s*>/i;
const TABLE_CLOSE = /<\/table>/i;

/** 우리가 쓰는 표만 격자로 편집한다 — 속성이 붙은 표는 손대지 않고 글로 둔다. */
function isPlainTable(html: string): boolean {
  return TABLE_OPEN.test(html.trim()) && !/<(td|th|tr|table)[^>]*\s[^>]*>/i.test(html);
}

function decodeCell(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export function escapeCell(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 표 HTML → 머리행 + 본문 행. 우리 형태가 아니면 null(=글로 남긴다). */
export function parseTableHtml(html: string): { head: string[]; rows: string[][] } | null {
  if (!isPlainTable(html)) return null;
  const trs = html.match(/<tr>[\s\S]*?<\/tr>/gi);
  if (!trs || trs.length === 0) return null;

  const parsed = trs.map((tr) => {
    const cells = tr.match(/<(th|td)>[\s\S]*?<\/(th|td)>/gi) ?? [];
    return {
      isHead: /<th>/i.test(tr),
      cells: cells.map(decodeCell),
    };
  });
  if (parsed.some((r) => r.cells.length === 0)) return null;

  const head = parsed[0].isHead ? parsed[0].cells : [];
  const rows = (head.length > 0 ? parsed.slice(1) : parsed).map((r) => r.cells);
  // 머리행만 있고 본문이 없으면 빈 행 하나를 둬서 편집할 칸을 남긴다.
  if (rows.length === 0) rows.push(new Array(Math.max(1, head.length)).fill(""));
  return { head, rows };
}

export function tableToHtml(head: string[], rows: string[][]): string {
  const cell = (tag: "th" | "td", v: string) => `<${tag}>${escapeCell(v)}</${tag}>`;
  const lines = ["<table>"];
  if (head.length > 0) {
    lines.push("  <thead>", `    <tr>${head.map((h) => cell("th", h)).join("")}</tr>`, "  </thead>");
  }
  lines.push("  <tbody>");
  for (const row of rows) lines.push(`    <tr>${row.map((c) => cell("td", c)).join("")}</tr>`);
  lines.push("  </tbody>", "</table>");
  return lines.join("\n");
}

export function splitRuleBody(body: string | null | undefined): RuleBodyBlock[] {
  // 저장본이 없는 화면(신규 판본 등)에서 값이 비어 들어올 수 있다 — 여기서 터지면
  // 편집기 전체가 안 뜨고, 버튼이 안 눌리는 것처럼 보인다.
  if (!body) return [{ kind: "text", text: "" }];
  const blocks: RuleBodyBlock[] = [];
  let text: string[] = [];
  let table: string[] | null = null;

  const flushText = () => {
    if (text.length > 0) {
      blocks.push({ kind: "text", text: text.join("\n").replace(/^\n+|\n+$/g, "") });
      text = [];
    }
  };

  for (const line of body.split("\n")) {
    if (table) {
      table.push(line);
      if (TABLE_CLOSE.test(line)) {
        const html = table.join("\n");
        const parsed = parseTableHtml(html);
        if (parsed) blocks.push({ kind: "table", ...parsed });
        else text.push(html); // 못 알아본 표 — 원문 그대로 글에 남긴다
        table = null;
      }
      continue;
    }
    if (TABLE_OPEN.test(line.trim())) {
      flushText();
      table = [line];
      if (TABLE_CLOSE.test(line)) {
        const parsed = parseTableHtml(line);
        if (parsed) blocks.push({ kind: "table", ...parsed });
        else text.push(line);
        table = null;
      }
      continue;
    }
    text.push(line);
  }
  // 닫는 태그를 못 만난 채 끝났다 — 열린 조각을 잃지 않도록 글로 되돌린다.
  if (table) text.push(...table);
  flushText();

  // 편집할 자리가 하나도 없으면 빈 글 상자를 하나 준다.
  if (blocks.length === 0) blocks.push({ kind: "text", text: "" });
  return blocks;
}

export function joinRuleBody(blocks: RuleBodyBlock[]): string {
  return blocks
    .map((b) => (b.kind === "text" ? b.text : tableToHtml(b.head, b.rows)))
    .filter((part, i, all) => part.trim() !== "" || i === all.length - 1)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** 새 표 한 장 — 머리행 + 빈 행들. */
export function blankTable(rows: number, cols: number): RuleBodyBlock {
  return {
    kind: "table",
    head: Array.from({ length: cols }, (_, i) => `항목 ${i + 1}`),
    rows: Array.from({ length: rows }, () => new Array(cols).fill("")),
  };
}
