"use client";

/*
  규약 전문 편집기 — 표를 끼워 넣을 수 있는 텍스트박스 (2026-09-02).

  규약 본문은 줄 단위 평문이고, 그 위에 장·조 구조와 왼쪽 목차가 서 있다(`parseRules`).
  통째로 리치텍스트 에디터로 바꾸면 그 구조가 무너지므로, 표만 HTML 덩어리로 본문에
  섞어 넣는다 — `<table>` 로 시작해 `</table>` 로 끝나는 블록은 파서가 한 항으로 묶어
  그대로 들고 가고, 화면에서는 sanitize 후 표로 그린다.

  [표 넣기] 는 커서 자리에 뼈대를 끼워 준다. 손으로 태그를 외워 치게 두면 오타 한 번에
  표가 통째로 안 나오고, 왜 안 나오는지도 화면에 드러나지 않는다.
*/

import { useRef, useState } from "react";
import { FIELD, HELP, LINK_BTN } from "@/components/admin/adminUi";

/** 표 뼈대 — 첫 줄은 머리행. 행·열 수는 넣은 뒤 손으로 늘린다. */
function tableSkeleton(rows: number, cols: number): string {
  const head = `    <tr>${Array.from({ length: cols }, (_, i) => `<th>항목 ${i + 1}</th>`).join("")}</tr>`;
  const body = Array.from(
    { length: rows },
    () => `    <tr>${Array.from({ length: cols }, () => "<td></td>").join("")}</tr>`,
  ).join("\n");
  return ["<table>", "  <thead>", head, "  </thead>", "  <tbody>", body, "  </tbody>", "</table>"].join(
    "\n",
  );
}

export function RuleBodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 커서 자리에 한 줄(또는 블록)을 끼운다. 포커스가 없으면 맨 뒤에 붙인다 —
   *  아무 일도 안 일어난 것처럼 보이는 것보다 낫다. */
  function insertAtCursor(text: string, asBlock: boolean) {
    const el = ref.current;
    const at = el ? el.selectionStart : value.length;
    const before = value.slice(0, at);
    const after = value.slice(at);
    // 블록(표)은 제 줄을 통째로 차지한다 — 앞뒤에 줄바꿈을 넣어 다른 항과 붙지 않게 한다.
    const lead = asBlock && before !== "" && !before.endsWith("\n") ? "\n" : "";
    const tail = asBlock && !after.startsWith("\n") ? "\n" : "";
    const block = `${lead}${text}${tail}`;
    onChange(before + block + after);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = (before + block).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
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
      // 규약 본문은 평문이라 링크는 <a> 로 넣는다 — 화면에서 sanitize 를 거쳐 그려진다.
      // 파일명을 ?name= 으로 붙여야 이용자 컴퓨터에 원래 이름으로 저장된다.
      const href = `${data.url}?name=${encodeURIComponent(data.name)}`;
      insertAtCursor(`<a href="${href}">${data.name}</a>`, false);
    } catch {
      setError("파일을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => insertAtCursor(tableSkeleton(rows, cols), true)}
          className={LINK_BTN}
        >
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
        <span className={HELP}>커서 자리에 표 뼈대를 넣습니다. 칸 안의 내용은 직접 채우세요.</span>
      </div>

      {/* [신규 2026-09-02] 규약 본문 안에서 바로 파일을 올려 링크로 건다 — 별표·서식처럼
          본문에 딸린 문서를 따로 올리고 주소를 옮겨 적을 필요가 없다. */}
      <div className="flex flex-wrap items-center gap-2">
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
        <span className={HELP}>커서 자리에 내려받기 링크를 넣습니다.</span>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>

      <textarea
        ref={ref}
        rows={28}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} h-auto whitespace-pre font-mono leading-6`}
        spellCheck={false}
      />
    </div>
  );
}
