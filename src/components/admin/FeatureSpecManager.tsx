"use client";

import { useRef, useState } from "react";
import {
  FEATURE_SPEC_SHEET_KEYS,
  type FeatureSpecRow,
  type FeatureSpecSheetKey,
} from "@/lib/pricing/types";

const SHEET_HEADERS: Record<FeatureSpecSheetKey, string[]> = {
  "기능정의(프론트)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  "기능정의(어드민)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  버그: ["#", "위치", "문제"],
  "메뉴트리(프론트)": ["대분류", "메뉴", "하위메뉴", "경로", "비고"],
  "메뉴트리(어드민)": ["대분류", "메뉴", "하위메뉴", "경로", "비고"],
  "추가 개발 내역": ["#", "항목", "구분", "필요한 이유 / 준비물", "확보되면 할 일", "담당", "비고"],
  "패키지 참고": ["패키지", "공간", "수용 규모", "기본 대관료(주)", "홍보매체", "기본 준비/공연일수"],
  "옵션 참고": ["id", "카테고리", "이름", "과금 단위", "단가", "비고"],
};

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
    <div className="mt-8">
      <div className="sticky top-14 z-10 -mx-6 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-background px-6 sm:top-16">
        {FEATURE_SPEC_SHEET_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSheet(key)}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium outline-none transition-colors",
              activeSheet === key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {key} ({data[key].length})
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] text-muted">셀을 클릭해서 바로 수정하세요. 변경 사항은 자동 저장됩니다.</p>
        <p className="text-[12px] text-muted">
          {state === "saving" && "저장 중…"}
          {state === "saved" && `저장됨 · ${savedAt[activeSheet] ?? ""}`}
          {state === "error" && <span className="text-red-600">저장 실패 — 다시 시도해 주세요</span>}
        </p>
      </div>

      <div className="mt-2 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">
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
                {headers.map((h) => (
                  <td key={h} className="p-0">
                    <textarea
                      value={row[h] ?? ""}
                      placeholder="입력…"
                      rows={1}
                      onChange={(e) => updateCell(activeSheet, rowIdx, h, e.target.value)}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      className="block w-full min-w-[120px] resize-none border-0 bg-transparent px-3 py-2.5 text-[13px] leading-5 outline-none focus:bg-accent-soft"
                    />
                  </td>
                ))}
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
  );
}
