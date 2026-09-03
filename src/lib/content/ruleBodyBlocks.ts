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

/**
 * 붙여넣기로 들어온 표를 읽는다 (2026-09-02).
 *
 * `parseTableHtml` 은 **우리가 저장한 표**만 받는다(속성이 붙으면 null) — 되돌리기에서
 * 원문을 잃지 않기 위한 규칙이다. 하지만 페이지·워드·스프레드시트에서 복사한 표는
 * class·style·colspan 이 잔뜩 붙은 HTML 이라 그 규칙에 걸려 통째로 글이 돼 버렸다.
 *
 * 붙여넣기는 성격이 다르다 — 원문을 보존할 것이 없고, 칸 값만 건지면 된다. 그래서
 * 여기서는 태그를 다 벗기고 격자만 만든다. 병합된 칸(colspan)은 늘려서 채우지 않고
 * 값만 첫 칸에 넣는다(맞춰 늘리면 없던 칸이 생겨 표가 틀어진다).
 */
export function parsePastedTableHtml(html: string): { head: string[]; rows: string[][] } | null {
  const table = /<table[\s\S]*?<\/table>/i.exec(html ?? "");
  if (!table) return null;
  const trs = table[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (!trs || trs.length === 0) return null;

  const parsed = trs
    .map((tr) => ({
      isHead: /<th[\s>]/i.test(tr),
      cells: (tr.match(/<(th|td)[^>]*>[\s\S]*?<\/(th|td)>/gi) ?? []).map((cell) =>
        // 줄바꿈 태그는 줄바꿈으로 살리고 나머지 태그는 벗긴다.
        decodeCell(cell.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")),
      ),
    }))
    .filter((r) => r.cells.length > 0);
  if (parsed.length === 0) return null;

  const head = parsed[0].isHead ? parsed[0].cells : [];
  const rows = (head.length > 0 ? parsed.slice(1) : parsed).map((r) => r.cells);
  if (rows.length === 0) rows.push(new Array(Math.max(1, head.length)).fill(""));
  return { head, rows };
}

/**
 * 붙여넣은 문서를 **글과 표가 섞인 순서 그대로** 읽는다 (2026-09-03).
 *
 * `parsePastedTableHtml` 은 문서에서 **표 하나만** 건져 왔다. 그래서 표가 들어 있는
 * 문서를 통째로 붙여넣으면 표 말고는 전부 사라졌고, 본문을 다 선택한 채 붙여넣었다면
 * 규약 전문이 표 한 장으로 바뀌었다 — 되돌릴 방법이 없다.
 *
 * 이제는 표를 기준으로 문서를 잘라 글·표·글… 순서대로 모두 담는다. 표가 하나도 없으면
 * null 을 돌려 평범한 붙여넣기에 맡긴다(글만 있는 붙여넣기는 브라우저가 더 잘한다).
 */
export function parsePastedBlocks(html: string): RuleBodyBlock[] | null {
  const source = html ?? "";
  const re = /<table[\s\S]*?<\/table>/gi;
  const blocks: RuleBodyBlock[] = [];
  let cursor = 0;
  let found = false;

  for (const m of source.matchAll(re)) {
    const table = parsePastedTableHtml(m[0]);
    if (!table) continue;
    found = true;
    const before = htmlToLines(source.slice(cursor, m.index));
    if (before) blocks.push({ kind: "text", text: before });
    blocks.push({ kind: "table", ...table });
    cursor = m.index + m[0].length;
  }
  if (!found) return null;

  const tail = htmlToLines(source.slice(cursor));
  if (tail) blocks.push({ kind: "text", text: tail });
  return blocks;
}

/** 표 바깥 조각의 태그를 벗겨 줄글로 만든다 — 규약 본문은 줄 단위 평문이다. */
function htmlToLines(fragment: string): string {
  return fragment
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n")
    .trim();
}

/**
 * 탭으로 나뉜 글(스프레드시트·페이지에서 복사하면 HTML 없이 이것만 올 때가 있다).
 * 두 줄 이상이고 탭이 있어야 표로 본다 — 문장 하나에 탭이 끼었다고 표로 만들면
 * 글을 쓰다가 표가 튀어나온다.
 */
export function parsePastedTsv(text: string): { head: string[]; rows: string[][] } | null {
  const lines = (text ?? "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2 || !lines.every((l) => l.includes("\t"))) return null;
  const grid = lines.map((l) => l.split("\t").map((c) => c.trim()));
  const width = Math.max(...grid.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? "");
  return { head: pad(grid[0]), rows: grid.slice(1).map(pad) };
}

/**
 * 규약 본문은 **한 줄 = 한 항(paragraph)** 이다(`parseRules`). PDF·워드 뷰어에서 복사한
 * 조문은 화면 너비에 맞춰 강제로 줄바꿈된 상태 그대로 클립보드에 담기는 일이 흔하고,
 * 그 강제 줄바꿈은 한글 조사·쉼표 뒤처럼 자연스러운 개행 지점에서 특히 자주 일어난다.
 * 그걸 그대로 받으면 한 문장이 문장 중간, 흔히 쉼표 바로 뒤에서 툭 끊긴 채 별개의
 * 항으로 저장되고, 화면에는 문장 중간에 줄바꿈이 노출된다
 * ("쉼표 있을 때 또는 간헐적으로 줄바꿈" 신고, 2026-09-03).
 *
 * 붙여넣은 글에서 **문장이 끝나지 않은 줄**(마침표 등으로 끝나지 않고, 다음 줄도
 * 새 장·조·항목 표식으로 시작하지 않는 경우)은 다음 줄과 이어 붙여 되돌린다.
 * 이 문서의 실제 관례(장·조·부칙·별표·가나다라 항목·원문자 항은 늘 새 줄에서
 * 시작한다, 완결된 문장도 새 줄에서 시작한다)를 그대로 규칙으로 쓴다 — 표식이나
 * 마침표로 이미 끝난 문장은 손대지 않으므로 정상적으로 한 줄씩 써 둔 본문에는
 * 아무 효과가 없다(원본을 복사해 다시 붙여넣어도 그대로 유지된다).
 */
const STRUCTURAL_LINE_RE =
  /^(제\s*\d+\s*장|제\s*\d+\s*조|부\s*칙(\s|$|[(（])|[[<(]?\s*별\s*표\s*\d|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|[가-힣]\.\s|\d+\.\s)/;

/** 문장이 끝났다고 볼 수 있는 줄(빈 줄 포함) — 이 뒤는 새 줄로 이어 붙이지 않는다. */
function endsLikeSentence(trimmed: string): boolean {
  if (trimmed === "") return true;
  return /[.!?:)"'）」』】]$/.test(trimmed);
}

export function dewrapPastedText(text: string): string {
  const rawLines = (text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      out.push("");
      continue;
    }
    const prev = out.length > 0 ? out[out.length - 1] : null;
    const prevTrimmed = prev?.trim() ?? "";
    const isStructural = STRUCTURAL_LINE_RE.test(trimmed);
    if (prev !== null && prevTrimmed !== "" && !isStructural && !endsLikeSentence(prevTrimmed)) {
      out[out.length - 1] = `${prevTrimmed} ${trimmed}`;
    } else {
      out.push(trimmed);
    }
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 새 표 한 장 — 머리행 + 빈 행들. */
export function blankTable(rows: number, cols: number): RuleBodyBlock {
  return {
    kind: "table",
    head: Array.from({ length: cols }, (_, i) => `항목 ${i + 1}`),
    rows: Array.from({ length: rows }, () => new Array(cols).fill("")),
  };
}
