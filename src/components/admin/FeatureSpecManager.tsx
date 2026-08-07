"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  FEATURE_SPEC_SHEET_KEYS,
  type FeatureSpecRow,
  type FeatureSpecSheetKey,
} from "@/lib/pricing/types";

const SHEET_HEADERS: Record<FeatureSpecSheetKey, string[]> = {
  "기능정의(프론트)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  "기능정의(어드민)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  버그: ["#", "위치", "문제"],
  "메뉴트리(프론트)": ["구분", "대분류", "메뉴", "하위메뉴", "경로", "비고"],
  "메뉴트리(어드민)": ["대분류", "메뉴", "하위메뉴", "경로", "비고"],
  "추가 개발 내역": ["#", "항목", "구분", "필요한 이유 / 준비물", "확보되면 할 일", "비고"],
  "패키지 참고": ["패키지", "공간", "수용 규모", "기본 대관료(주)", "홍보매체", "기본 준비/공연일수"],
  "옵션 참고": ["id", "카테고리", "이름", "과금 단위", "단가", "비고"],
};

// 짧은 값만 들어가는 컬럼은 좁게, 문장이 길게 들어가는 컬럼은 넓게 — 표가 옆으로
// 한없이 늘어나지 않고 긴 텍스트는 줄바꿈되도록 헤더별로 폭을 다르게 준다.
// 전부 min-width로만 지정한다 — 고정 width를 쓰면 한글 내용이 그 폭보다 길 때
// 단어 단위가 아니라 한 글자씩 세로로 쪼개져 줄바꿈되는 문제가 생긴다.
const TINY_COLS = new Set(["#", "id"]);
const NARROW_COLS = new Set([
  "구분",
  "위치",
  "카테고리",
  "과금 단위",
  "단가",
  "공간",
  "수용 규모",
  "기본 대관료(주)",
  "기본 준비/공연일수",
  "홍보매체",
]);
const WIDE_COLS = new Set([
  "상세 정의",
  "문제",
  "필요한 이유 / 준비물",
  "확보되면 할 일",
  "검토 필요 사항",
  "비고",
  "하위메뉴",
]);

function columnWidthClass(header: string): string {
  if (TINY_COLS.has(header)) return "min-w-[64px]";
  if (NARROW_COLS.has(header)) return "min-w-[120px]";
  if (WIDE_COLS.has(header)) return "min-w-[280px]";
  return "min-w-[160px]";
}

// 서버에서도(첫 렌더 시) 대략 맞는 줄 수를 계산해, 자바스크립트가 붙기 전에도
// 긴 텍스트가 한 줄로 잘려 보이지 않게 한다. 타이핑 중에는 아래 onInput 핸들러가
// scrollHeight 기준으로 더 정확하게 다시 맞춘다.
function estimateRows(value: string, charsPerLine: number): number {
  if (!value) return 1;
  const explicitLines = value.split("\n").length;
  const wrappedLines = Math.ceil(value.length / charsPerLine);
  return Math.max(1, explicitLines, wrappedLines);
}

type SaveState = "idle" | "saving" | "saved" | "error";

function blankRow(sheet: FeatureSpecSheetKey): FeatureSpecRow {
  const row: FeatureSpecRow = {};
  SHEET_HEADERS[sheet].forEach((h) => {
    row[h] = "";
  });
  return row;
}

export function FeatureSpecManager({
  initialSheets,
}: {
  initialSheets: Record<FeatureSpecSheetKey, FeatureSpecRow[]>;
}) {
  const [data, setData] = useState(initialSheets);
  const [activeSheet, setActiveSheet] = useState<FeatureSpecSheetKey>(FEATURE_SPEC_SHEET_KEYS[0]);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const saveTimers = useRef<Partial<Record<FeatureSpecSheetKey, ReturnType<typeof setTimeout>>>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  // estimateRows()의 글자수 어림값은 한글 폭·줄바꿈 규칙 때문에 실제보다 부족할 수 있다.
  // 탭을 바꾸거나 행이 늘어나면(즉 새로 렌더링된 textarea가 생기면) 실제 scrollHeight를
  // 다시 재서 높이를 맞춰, 내용이 잘려 보이는 셀이 없도록 한다.
  useLayoutEffect(() => {
    const textareas = tableRef.current?.querySelectorAll("textarea") ?? [];
    textareas.forEach((el) => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [activeSheet, data]);

  async function persist(sheet: FeatureSpecSheetKey, rows: FeatureSpecRow[]) {
    setSaveState((s) => ({ ...s, [sheet]: "saving" }));
    try {
      const res = await fetch(`/api/admin/feature-spec/${encodeURIComponent(sheet)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState((s) => ({ ...s, [sheet]: "saved" }));
      setSavedAt((s) => ({
        ...s,
        [sheet]: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      }));
    } catch {
      setSaveState((s) => ({ ...s, [sheet]: "error" }));
    }
  }

  function scheduleSave(sheet: FeatureSpecSheetKey, rows: FeatureSpecRow[]) {
    setSaveState((s) => ({ ...s, [sheet]: "saving" }));
    const timers = saveTimers.current;
    if (timers[sheet]) clearTimeout(timers[sheet]);
    timers[sheet] = setTimeout(() => persist(sheet, rows), 700);
  }

  function updateCell(sheet: FeatureSpecSheetKey, rowIdx: number, col: string, value: string) {
    setData((prev) => {
      const rows = prev[sheet].map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r));
      scheduleSave(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
  }

  function addRow(sheet: FeatureSpecSheetKey, afterIdx: number | null) {
    setData((prev) => {
      const rows = [...prev[sheet]];
      const insertAt = afterIdx === null ? rows.length : afterIdx + 1;
      rows.splice(insertAt, 0, blankRow(sheet));
      persist(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
  }

  function deleteRow(sheet: FeatureSpecSheetKey, rowIdx: number) {
    setData((prev) => {
      const rows = prev[sheet].filter((_, i) => i !== rowIdx);
      persist(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
  }

  const rows = data[activeSheet];
  const headers = SHEET_HEADERS[activeSheet];
  const state = saveState[activeSheet] ?? "idle";

  return (
    <div className="mt-8 flex flex-col gap-6 lg:flex-row">
      <aside className="shrink-0 lg:w-56">
        <nav className="sticky top-20 flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {FEATURE_SPEC_SHEET_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSheet(key)}
              className={[
                "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-left text-[13px] font-medium outline-none transition-colors",
                activeSheet === key
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-panel hover:text-foreground",
              ].join(" ")}
            >
              <span>{key}</span>
              <span className="text-[11px] tabular-nums text-muted">{data[key].length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted">셀을 클릭해서 바로 수정하세요. 변경 사항은 자동 저장됩니다.</p>
          <p className="text-[12px] text-muted">
            {state === "saving" && "저장 중…"}
            {state === "saved" && `저장됨 · ${savedAt[activeSheet] ?? ""}`}
            {state === "error" && <span className="text-red-600">저장 실패 — 다시 시도해 주세요</span>}
          </p>
        </div>

        <div ref={tableRef} className="mt-2 overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                {headers.map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 ${columnWidthClass(h)}`}>
                    {h}
                  </th>
                ))}
                <th className="w-1 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="px-3 py-6 text-center text-muted">
                    행이 없습니다.
                  </td>
                </tr>
              )}
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/70 align-top hover:bg-panel/50">
                  {headers.map((h) => {
                    const widthClass = columnWidthClass(h);
                    const charsPerLine = TINY_COLS.has(h)
                      ? 8
                      : NARROW_COLS.has(h)
                        ? 14
                        : WIDE_COLS.has(h)
                          ? 34
                          : 20;
                    return (
                      <td key={h} className={`p-0 ${widthClass}`}>
                        <textarea
                          value={row[h] ?? ""}
                          placeholder="입력…"
                          rows={estimateRows(row[h] ?? "", charsPerLine)}
                          onChange={(e) => updateCell(activeSheet, rowIdx, h, e.target.value)}
                          onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = "auto";
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          className="block w-full resize-none whitespace-pre-wrap break-words border-0 bg-transparent px-3 py-2.5 text-[13px] leading-5 outline-none focus:bg-accent-soft"
                        />
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">
                    <button
                      type="button"
                      title="아래에 행 추가"
                      onClick={() => addRow(activeSheet, rowIdx)}
                      className="mr-1 rounded-sm border border-border px-1.5 py-0.5 text-muted hover:border-accent hover:text-accent"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      title="이 행 삭제"
                      onClick={() => deleteRow(activeSheet, rowIdx)}
                      className="rounded-sm border border-border px-1.5 py-0.5 text-muted hover:border-red-600 hover:text-red-600"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => addRow(activeSheet, null)}
          className="mt-3 w-full rounded border border-dashed border-border py-2.5 text-[12.5px] font-medium text-muted hover:border-accent hover:text-accent"
        >
          + 행 추가
        </button>
      </div>
    </div>
  );
}
