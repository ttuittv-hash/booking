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
  joinRuleBody,
  splitRuleBody,
  type RuleBodyBlock,
} from "@/lib/content/ruleBodyBlocks";
import { FIELD, HELP, LINK_BTN, REMOVE_BTN } from "@/components/admin/adminUi";

const CELL =
  "w-full min-w-28 border border-border-soft bg-background px-2 py-1.5 text-xs outline-none focus:border-foreground";
const MINI_BTN =
  "inline-flex h-7 items-center border border-border-soft px-2 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground";

export function RuleBodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
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

  /** 표는 글 사이에 들어간다 — 뒤에 글 상자가 없으면 하나 만들어 이어 쓸 수 있게 한다. */
  function insertTable() {
    const at = Math.min(focused, blocks.length - 1);
    const next = [...blocks];
    const tail: RuleBodyBlock[] =
      next[at + 1]?.kind === "text" ? [] : [{ kind: "text", text: "" }];
    next.splice(at + 1, 0, blankTable(rows, cols), ...tail);
    commit(next);
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
            className="h-7 w-14 border border-border-soft bg-background px-2 text-right text-xs tabular-nums"
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
            className="h-7 w-14 border border-border-soft bg-background px-2 text-right text-xs tabular-nums"
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
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <p className={HELP}>
        방금 손댄 자리 아래에 표가 들어갑니다. 표는 조(제N조) 안에 있어야 화면에 나옵니다.
      </p>

      {blocks.map((block, i) =>
        block.kind === "text" ? (
          <textarea
            key={i}
            ref={(el) => {
              textRefs.current[i] = el;
            }}
            rows={Math.min(30, Math.max(6, block.text.split("\n").length + 1))}
            value={block.text}
            onFocus={() => setFocused(i)}
            onChange={(e) => replaceBlock(i, { kind: "text", text: e.target.value })}
            className={`${FIELD} h-auto whitespace-pre leading-6`}
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
    <div className="border border-border-soft bg-panel p-3" onFocus={onFocus}>
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
