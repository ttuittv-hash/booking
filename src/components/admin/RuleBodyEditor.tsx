"use client";

/*
  규약 전문 편집기 (2026-09-02).

  규약 본문은 줄 단위 평문이고, 그 위에 장·조 구조와 왼쪽 목차가 서 있다(`parseRules`).
  통째로 리치텍스트 에디터로 바꾸면 그 구조가 무너지므로, 본문을 **글 덩어리 + 표**로
  펴서 보여 준다 — 글은 텍스트 상자, 표는 칸이 보이는 격자다. 저장할 때 다시 한
  문자열로 합친다(`ruleBodyBlocks`).

  [개정] 처음에는 표를 `<table>` 태그째 텍스트 상자에 넣었는데, 그러면 태그를 읽고 쓸 줄
  아는 사람만 표를 고칠 수 있다. 표는 표로 보여야 고칠 수 있다.
*/

import { useMemo, useRef, useState } from "react";
import {
  blankTable,
  dewrapPastedText,
  joinRuleBody,
  parsePastedBlocks,
  parsePastedTsv,
  splitRuleBody,
  type RuleBodyBlock,
} from "@/lib/content/ruleBodyBlocks";
import { HELP, LINK_BTN, REMOVE_BTN } from "@/components/admin/adminUi";

const CELL =
  "w-full min-w-28 rounded-btn border border-border-soft bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground";
/* 글 상자 — 문서 한 장처럼 보이도록 테두리를 지운다. 블록마다 상자를 두르면 표가
   본문에서 떨어져 나온 것처럼 읽힌다. */
const DOC_TEXT =
  "w-full resize-none border-0 bg-transparent px-4 py-2 text-s leading-6 outline-none focus:ring-0";
const MINI_BTN =
  "inline-flex h-7 items-center rounded-btn border border-border-soft px-2 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground";

export function RuleBodyEditor({
  value,
  onChange,
  defaultBody,
}: {
  value: string;
  onChange: (value: string) => void;
  /** 되돌리기용 기본 전문 — 편집 사고로 본문을 잃었을 때 한 번에 복구한다 */
  defaultBody: string;
}) {
  // 저장 문자열이 정본이다 — 블록은 그걸 편집하기 좋게 편 모양일 뿐이라 매번 다시 편다.
  // (블록을 상태로 들고 있으면 바깥에서 값이 바뀌었을 때 두 벌이 어긋난다.)
  const blocks = useMemo(() => splitRuleBody(value), [value]);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 마지막으로 손댄 글 상자 — [표 넣기]·[파일 첨부] 가 그 뒤/그 자리에 들어간다 */
  const [focused, setFocused] = useState(0);
  const textRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const commit = (next: RuleBodyBlock[]) => onChange(joinRuleBody(next));

  const replaceBlock = (i: number, block: RuleBodyBlock) =>
    commit(blocks.map((b, k) => (k === i ? block : b)));

  const removeBlock = (i: number) => commit(blocks.filter((_, k) => k !== i));

  const moveBlock = (i: number, delta: number) => {
    const to = i + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[to]] = [next[to], next[i]];
    commit(next);
  };

  /**
   * 표는 **커서가 있던 자리**에 들어간다.
   *
   * [수정 2026-09-02] 예전에는 "지금 글 상자 다음"에 넣었는데, 규약 본문은 통째로
   * 글 상자 하나라서 어디에 커서를 두든 표가 문서 맨 끝(부칙·별표 뒤)에 붙었다.
   * 긴 본문에서는 화면 밖이라 "표가 안 들어간다"로 보였다. 커서 위치에서 글을 둘로
   * 쪼개고 그 사이에 표를 넣는다.
   */
  function insertTable() {
    const at = Math.min(focused, blocks.length - 1);
    const target = blocks[at];
    const table = blankTable(rows, cols);
    const next = [...blocks];

    if (target?.kind !== "text") {
      // 표에 커서가 있으면 그 표 바로 뒤에 새 표를 놓는다.
      next.splice(at + 1, 0, table, { kind: "text", text: "" });
      commit(next);
      return;
    }

    const el = textRefs.current[at];
    const pos = el ? el.selectionStart : target.text.length;
    const before = target.text.slice(0, pos);
    const after = target.text.slice(pos);
    next.splice(at, 1, { kind: "text", text: before }, table, { kind: "text", text: after });
    commit(next);
    // 표가 커서 자리에서 열리므로 화면 밖으로 밀리지 않는다 — 새로 생긴 표로 데려간다.
    setFocused(at + 1);
  }

  /**
   * 페이지·워드·스프레드시트에서 복사한 표를 붙여넣으면 표로 들어간다 (2026-09-02).
   *
   * 그냥 두면 표가 태그 덩어리(또는 탭이 낀 한 줄)로 글 상자에 박혀, 운영자가 칸을
   * 하나하나 다시 옮겨 적어야 했다. 클립보드의 HTML 을 먼저 보고, 없으면 탭으로
   * 나뉜 글을 본다. 표가 아니면 손대지 않는다(평범한 붙여넣기 그대로).
   */
  function pasteIntoText(i: number, e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    /*
      [수정 2026-09-03] 붙여넣은 문서의 **글까지 함께** 담는다.

      예전에는 표 하나만 건져 오고 나머지는 버렸다. 표가 든 문서를 통째로 붙여넣으면
      글이 전부 사라졌고, 본문을 다 선택한 채 붙여넣었다면 규약 전문이 표 한 장으로
      바뀌었다 — 되돌릴 방법이 없다.
    */
    const pastedBlocks: RuleBodyBlock[] | null =
      (html ? parsePastedBlocks(html) : null) ??
      ((tsv) => (tsv ? [{ kind: "table" as const, ...tsv }] : null))(parsePastedTsv(plain));

    /*
      [신규 2026-09-03] 표도 탭 구분 글도 아닌 보통 문단 붙여넣기.
      PDF·워드 뷰어에서 조문을 복사하면 화면 너비에 맞춰 강제로 줄바꿈된 상태 그대로
      클립보드에 담긴다 — 그 줄바꿈이 한글 조사·쉼표 뒤 같은 자연스러운 지점에서
      자주 일어난다. 그대로 브라우저 기본 붙여넣기에 맡기면 한 문장이 문장 중간(흔히
      쉼표 바로 뒤)에서 끊긴 채 별개의 항으로 들어가고, 화면에도 문장 중간에 줄바꿈이
      드러난다("쉼표 있을 때 또는 간헐적으로 줄바꿈" 신고). 문장이 끝나지 않은 줄은
      다음 줄과 이어 붙여서 넣는다(dewrapPastedText) — 이미 한 줄씩 잘 써 둔 본문을
      복사해 붙여넣으면 아무것도 바뀌지 않는다.
    */
    const pasted: RuleBodyBlock[] =
      pastedBlocks && pastedBlocks.length > 0
        ? pastedBlocks
        : plain.trim()
          ? [{ kind: "text" as const, text: dewrapPastedText(plain) }]
          : [];
    if (pasted.length === 0) return;

    e.preventDefault();
    const target = blocks[i];
    if (target?.kind !== "text") return;
    const el = textRefs.current[i];
    const start = el ? el.selectionStart : target.text.length;
    const end = el ? el.selectionEnd : target.text.length;
    const next = [...blocks];
    next.splice(
      i,
      1,
      { kind: "text", text: target.text.slice(0, start) },
      ...pasted,
      { kind: "text", text: target.text.slice(end) },
    );
    commit(next);
    setFocused(i + 1);
  }

  async function attachFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/content/document-upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "파일을 올리지 못했습니다.");
        return;
      }
      // 파일명을 ?name= 으로 붙여야 이용자 컴퓨터에 원래 이름으로 저장된다.
      const link = `<a href="${data.url}?name=${encodeURIComponent(data.name)}">${data.name}</a>`;
      const at = Math.min(focused, blocks.length - 1);
      const target = blocks[at];
      if (target?.kind !== "text") {
        // 표에 커서가 있으면 붙일 자리가 없다 — 바로 뒤에 글 상자를 만들어 넣는다.
        const next = [...blocks];
        next.splice(at + 1, 0, { kind: "text", text: link });
        commit(next);
        return;
      }
      const el = textRefs.current[at];
      const pos = el ? el.selectionStart : target.text.length;
      const text = `${target.text.slice(0, pos)}${link}${target.text.slice(pos)}`;
      replaceBlock(at, { kind: "text", text });
    } catch {
      setError("파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={insertTable} className={LINK_BTN}>
          + 표 넣기
        </button>
        <label className="flex items-center gap-1 text-xs text-muted">
          행
          <input
            type="number"
            min={1}
            max={30}
            value={rows}
            onChange={(e) => setRows(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            className="h-7 w-14 rounded-btn border border-border-soft bg-background px-2 text-right text-xs tabular-nums"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          열
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            className="h-7 w-14 rounded-btn border border-border-soft bg-background px-2 text-right text-xs tabular-nums"
          />
        </label>

        <label className={`${LINK_BTN} cursor-pointer`}>
          {busy ? "올리는 중..." : "+ 파일 첨부"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void attachFile(file);
            }}
          />
        </label>
        <span className="flex-1" />
        {/* [신규 2026-09-03] 편집 중 본문을 통째로 잃는 사고가 있었다(붙여넣기가 본문을
            표 한 장으로 갈아 끼웠다). 규약은 되돌릴 방법이 있어야 한다. */}
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "지금 본문을 버리고 기본 규약 전문으로 되돌립니다.\n되돌린 뒤 [저장]을 눌러야 화면에 반영됩니다. 계속할까요?",
              )
            ) {
              onChange(defaultBody);
            }
          }}
          className={LINK_BTN}
        >
          기본 전문으로 되돌리기
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <p className={HELP}>
        커서를 둔 자리에 표가 들어갑니다. 페이지·워드·엑셀에서 복사한 표를 그대로
        붙여넣어도 표로 들어옵니다(글과 표가 섞여 있어도 순서 그대로 들어옵니다).
      </p>
      {!value.trim() && (
        <p className="text-xs font-bold text-danger">
          본문이 비어 있습니다 — 이대로 저장하면 규약 화면에 아무것도 나오지 않습니다.
          원문을 붙여넣거나 [기본 전문으로 되돌리기] 를 눌러 주세요.
        </p>
      )}

      {/* 글과 표를 한 상자 안에 이어 붙인다 — 문서 한 장처럼 보여야 표가 규약 "안에"
          들어간 것으로 읽힌다. 블록마다 테두리를 두르면 표가 본문에서 떨어져 나온
          조각처럼 보인다(2026-09-02). */}
      <div className="rounded-btn border border-border-soft bg-background py-2">
        {blocks.map((block, i) =>
          block.kind === "text" ? (
            <textarea
              key={i}
              ref={(el) => {
                textRefs.current[i] = el;
              }}
              // 조각난 글은 짧다 — 최소 높이를 크게 잡으면 표 앞에 빈 자리가 생겨
              // 표가 멀리 떨어져 보인다. 내용 줄 수에 맞춘다.
              rows={Math.min(40, Math.max(1, block.text.split("\n").length))}
              value={block.text}
              onFocus={() => setFocused(i)}
              onPaste={(e) => pasteIntoText(i, e)}
              onChange={(e) => replaceBlock(i, { kind: "text", text: e.target.value })}
              className={`${DOC_TEXT} whitespace-pre`}
              spellCheck={false}
            />
          ) : (
            <TableBlock
              key={i}
              block={block}
              onChange={(next) => replaceBlock(i, next)}
              onRemove={() => removeBlock(i)}
              onMove={(d) => moveBlock(i, d)}
              onFocus={() => setFocused(i)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function TableBlock({
  block,
  onChange,
  onRemove,
  onMove,
  onFocus,
}: {
  block: Extract<RuleBodyBlock, { kind: "table" }>;
  onChange: (next: RuleBodyBlock) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onFocus: () => void;
}) {
  const colCount = Math.max(block.head.length, ...block.rows.map((r) => r.length), 1);

  const patch = (next: Partial<{ head: string[]; rows: string[][] }>) =>
    onChange({ kind: "table", head: next.head ?? block.head, rows: next.rows ?? block.rows });

  const setHead = (c: number, v: string) =>
    patch({ head: Array.from({ length: colCount }, (_, k) => (k === c ? v : block.head[k] ?? "")) });

  const setCell = (r: number, c: number, v: string) =>
    patch({
      rows: block.rows.map((row, ri) =>
        ri !== r ? row : Array.from({ length: colCount }, (_, k) => (k === c ? v : row[k] ?? "")),
      ),
    });

  const addRow = () => patch({ rows: [...block.rows, new Array(colCount).fill("")] });
  const removeRow = (r: number) =>
    patch({ rows: block.rows.length <= 1 ? block.rows : block.rows.filter((_, k) => k !== r) });
  const addCol = () =>
    patch({
      head: [...block.head, block.head.length > 0 ? `항목 ${colCount + 1}` : ""],
      rows: block.rows.map((row) => [...row, ""]),
    });
  const removeCol = () =>
    colCount > 1 &&
    patch({ head: block.head.slice(0, -1), rows: block.rows.map((row) => row.slice(0, -1)) });

  return (
    // 본문 흐름 안의 표 — 좌우 여백을 글과 맞추고 위아래 헤어라인으로만 구분한다.
    <div className="my-2 border-y border-border-soft bg-panel px-4 py-3" onFocus={onFocus}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold">표</span>
        <button type="button" onClick={addRow} className={MINI_BTN}>
          행 +
        </button>
        <button type="button" onClick={() => removeRow(block.rows.length - 1)} className={MINI_BTN}>
          행 −
        </button>
        <button type="button" onClick={addCol} className={MINI_BTN}>
          열 +
        </button>
        <button type="button" onClick={removeCol} className={MINI_BTN}>
          열 −
        </button>
        <span className="flex-1" />
        <button type="button" onClick={() => onMove(-1)} className={MINI_BTN} aria-label="위로">
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} className={MINI_BTN} aria-label="아래로">
          ↓
        </button>
        <button type="button" onClick={onRemove} className={REMOVE_BTN}>
          표 삭제
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {block.head.length > 0 && (
            <thead>
              <tr>
                {Array.from({ length: colCount }, (_, c) => (
                  <th key={c} className="p-0.5">
                    <input
                      value={block.head[c] ?? ""}
                      onChange={(e) => setHead(c, e.target.value)}
                      className={`${CELL} font-bold`}
                      placeholder={`머리 ${c + 1}`}
                    />
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: colCount }, (_, c) => (
                  <td key={c} className="p-0.5">
                    <input
                      value={row[c] ?? ""}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className={CELL}
                    />
                  </td>
                ))}
                <td className="p-0.5 text-center">
                  {/* 행마다 지울 수 있어야 한다 — 맨 끝 행만 뗄 수 있으면 가운데 행을
                      고치려고 아래를 다 지웠다 다시 쓰게 된다. */}
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    disabled={block.rows.length <= 1}
                    className="px-1 text-xs text-muted transition-colors hover:text-danger disabled:opacity-30"
                    aria-label={`${r + 1}번째 행 삭제`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
