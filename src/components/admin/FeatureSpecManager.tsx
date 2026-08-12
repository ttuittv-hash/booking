"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FEATURE_SPEC_SHEET_KEYS,
  type FeatureSpecRow,
  type FeatureSpecSheetKey,
} from "@/lib/pricing/types";

function isSheetKey(value: string | null): value is FeatureSpecSheetKey {
  return !!value && (FEATURE_SPEC_SHEET_KEYS as readonly string[]).includes(value);
}

const SHEET_HEADERS: Record<FeatureSpecSheetKey, string[]> = {
  "기능정의(프론트)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  "기능정의(어드민)": ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
  버그: ["#", "위치", "문제"],
  약관: ["#", "영역", "기능", "상세 정의", "검토 필요 사항"],
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
  "기능",
]);
// "영역"은 약관 시트에서 "구간1 · 회원가입 — 이용약관 동의"처럼 다른 NARROW_COLS보다
// 값이 길어서, 같은 100px로 묶으면 내용이 너무 눌려 보인다. 별도 폭을 준다.
const MEDIUM_COLS = new Set(["영역"]);
const WIDE_COLS = new Set([
  "문제",
  "필요한 이유 / 준비물",
  "확보되면 할 일",
  "검토 필요 사항",
  "비고",
  "하위메뉴",
]);
// "상세 정의"는 실제 조항 전문·상세 설명이 들어가는 칸이라 다른 WIDE_COLS보다도
// 더 넓게 잡는다.
const EXTRA_WIDE_COLS = new Set(["상세 정의"]);

// 영역/기능처럼 짧은 값만 들어가는 컬럼은 min-width만으로는 충분히 좁아지지
// 않는다 — table-layout: auto에서는 남는 폭이 모든 컬럼에 비례 배분되기 때문에,
// max-width로 상한을 함께 박아야 실제로 좁게 고정되고 그만큼 남는 공간이
// "상세 정의"(상한 없음) 쪽으로 몰린다.
function columnWidthClass(header: string): string {
  if (TINY_COLS.has(header)) return "w-[48px] min-w-[48px] max-w-[48px]";
  if (NARROW_COLS.has(header)) return "w-[100px] min-w-[100px] max-w-[100px]";
  if (MEDIUM_COLS.has(header)) return "w-[170px] min-w-[170px] max-w-[170px]";
  if (EXTRA_WIDE_COLS.has(header)) return "min-w-[480px]";
  if (WIDE_COLS.has(header)) return "min-w-[260px]";
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

// 메뉴트리 시트는 표(스프레드시트) 형태로만 보면 계층 구조가 한눈에 안 들어와서,
// "구분 > 대분류 > 메뉴 > 하위메뉴" 순서를 실제 가지치기(branch) 도식으로도 보여준다.
const MENU_TREE_LEVEL_KEYS: Partial<Record<FeatureSpecSheetKey, string[]>> = {
  "메뉴트리(프론트)": ["구분", "대분류", "메뉴", "하위메뉴"],
  "메뉴트리(어드민)": ["대분류", "메뉴", "하위메뉴"],
};

interface MenuTreeNode {
  label: string;
  path?: string;
  note?: string;
  children: MenuTreeNode[];
}

function buildMenuTree(rows: FeatureSpecRow[], levelKeys: string[]): MenuTreeNode[] {
  const roots: MenuTreeNode[] = [];
  for (const row of rows) {
    const parts = levelKeys.map((key) => (row[key] ?? "").trim()).filter(Boolean);
    if (parts.length === 0) continue;
    let siblings = roots;
    let node: MenuTreeNode | undefined;
    for (const label of parts) {
      node = siblings.find((n) => n.label === label);
      if (!node) {
        node = { label, children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
    if (node) {
      if (row["경로"]) node.path = row["경로"];
      if (row["비고"]) node.note = row["비고"];
    }
  }
  return roots;
}

function MenuTreeBranch({ node }: { node: MenuTreeNode }) {
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[15px] before:h-px before:w-4 before:bg-border">
      <div className="inline-flex flex-wrap items-center gap-2 py-1">
        <span className="rounded-sm border border-border bg-panel px-2 py-1 text-[12px] font-medium">
          {node.label}
        </span>
        {node.path && (
          <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
            {node.path}
          </span>
        )}
        {node.note && <span className="text-[11px] text-muted">{node.note}</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="ml-[7px] border-l border-border pl-0">
          {node.children.map((child, i) => (
            <MenuTreeBranch key={i} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

function MenuTreeDiagram({ rows, levelKeys }: { rows: FeatureSpecRow[]; levelKeys: string[] }) {
  const tree = buildMenuTree(rows, levelKeys);
  if (tree.length === 0) return null;
  return (
    <div className="mt-2 overflow-x-auto rounded border border-border bg-background p-4">
      <ul className="flex flex-col">
        {tree.map((node, i) => (
          <MenuTreeBranch key={i} node={node} />
        ))}
      </ul>
    </div>
  );
}

export function FeatureSpecManager({
  initialSheets,
}: {
  initialSheets: Record<FeatureSpecSheetKey, FeatureSpecRow[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sheetParam = searchParams.get("sheet");

  const [data, setData] = useState(initialSheets);
  const [activeSheet, setActiveSheet] = useState<FeatureSpecSheetKey>(
    isSheetKey(sheetParam) ? sheetParam : FEATURE_SPEC_SHEET_KEYS[0],
  );
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  // 선택된 행 다음에 새 행을 끼워 넣기 위한 앵커. 시트를 바꾸면 행 번호 의미가
  // 달라지므로 selectSheet에서 항상 null로 리셋한다.
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
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
    // 새로 만든 행을 선택 상태로 만들어, 이어서 "행 추가"를 눌러도 계속 그
    // 바로 다음에 순서대로 끼워 넣을 수 있게 한다.
    setSelectedRowIdx(afterIdx === null ? null : afterIdx + 1);
  }

  function deleteRow(sheet: FeatureSpecSheetKey, rowIdx: number) {
    setData((prev) => {
      const rows = prev[sheet].filter((_, i) => i !== rowIdx);
      persist(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
    setSelectedRowIdx((prev) => {
      if (prev === null) return null;
      if (prev === rowIdx) return null;
      if (prev > rowIdx) return prev - 1;
      return prev;
    });
  }

  function moveRow(sheet: FeatureSpecSheetKey, rowIdx: number, direction: -1 | 1) {
    const rowCount = data[sheet].length;
    const target = rowIdx + direction;
    if (target < 0 || target >= rowCount) return;
    setData((prev) => {
      const rows = [...prev[sheet]];
      [rows[rowIdx], rows[target]] = [rows[target], rows[rowIdx]];
      persist(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
    setSelectedRowIdx((prev) => {
      if (prev === rowIdx) return target;
      if (prev === target) return rowIdx;
      return prev;
    });
  }

  // 새로고침해도 보던 시트가 그대로 유지되도록 선택한 시트를 URL(?sheet=...)에도
  // 반영한다. router.replace를 써서 탭을 눌러도 방문 기록이 계속 쌓이지 않게 한다.
  function selectSheet(key: FeatureSpecSheetKey) {
    setActiveSheet(key);
    setSelectedRowIdx(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sheet", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
              onClick={() => selectSheet(key)}
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted">셀을 클릭해서 바로 수정하세요. 변경 사항은 자동 저장됩니다.</p>
          <p className="text-[12px] text-muted">
            {state === "saving" && "저장 중…"}
            {state === "saved" && `저장됨 · ${savedAt[activeSheet] ?? ""}`}
            {state === "error" && <span className="text-red-600">저장 실패 — 다시 시도해 주세요</span>}
          </p>
        </div>

        {MENU_TREE_LEVEL_KEYS[activeSheet] && (
          <div className="mt-3">
            <p className="text-[12px] font-medium text-muted">메뉴 구조도</p>
            <MenuTreeDiagram rows={rows} levelKeys={MENU_TREE_LEVEL_KEYS[activeSheet]!} />
          </div>
        )}

        <div ref={tableRef} className="mt-2 overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="sticky left-0 z-10 w-1 border-r border-border bg-panel px-2 py-2.5" />
                {headers.map((h) => (
                  <th key={h} className={`whitespace-nowrap px-3 py-2.5 ${columnWidthClass(h)}`}>
                    {h}
                  </th>
                ))}
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
                <tr
                  key={rowIdx}
                  className={[
                    "border-b border-border/70 align-top hover:bg-panel/50",
                    selectedRowIdx === rowIdx ? "bg-accent-soft/60" : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "sticky left-0 z-10 whitespace-nowrap border-r border-border px-1.5 py-2.5 text-center align-middle",
                      selectedRowIdx === rowIdx ? "bg-accent-soft" : "bg-background",
                    ].join(" ")}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        title="이 행을 선택 — 다음 '행 추가'가 이 행 바로 뒤에 들어감"
                        onClick={() => setSelectedRowIdx((prev) => (prev === rowIdx ? null : rowIdx))}
                        className={[
                          "h-3.5 w-3.5 rounded-full border",
                          selectedRowIdx === rowIdx ? "border-accent bg-accent" : "border-border hover:border-accent",
                        ].join(" ")}
                      />
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          title="위로 이동"
                          disabled={rowIdx === 0}
                          onClick={() => moveRow(activeSheet, rowIdx, -1)}
                          className="rounded-sm text-[10px] leading-none text-muted hover:text-accent disabled:opacity-20 disabled:hover:text-muted"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          title="아래로 이동"
                          disabled={rowIdx === rows.length - 1}
                          onClick={() => moveRow(activeSheet, rowIdx, 1)}
                          className="rounded-sm text-[10px] leading-none text-muted hover:text-accent disabled:opacity-20 disabled:hover:text-muted"
                        >
                          ▼
                        </button>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          title="아래에 행 추가"
                          onClick={() => addRow(activeSheet, rowIdx)}
                          className="rounded-sm border border-border px-1 text-[11px] leading-tight text-muted hover:border-accent hover:text-accent"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          title="이 행 삭제"
                          onClick={() => deleteRow(activeSheet, rowIdx)}
                          className="rounded-sm border border-border px-1 text-[11px] leading-tight text-muted hover:border-red-600 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </td>
                  {headers.map((h) => {
                    const widthClass = columnWidthClass(h);
                    const charsPerLine = TINY_COLS.has(h)
                      ? 6
                      : NARROW_COLS.has(h)
                        ? 14
                        : MEDIUM_COLS.has(h)
                          ? 22
                          : EXTRA_WIDE_COLS.has(h)
                            ? 50
                            : WIDE_COLS.has(h)
                              ? 34
                              : 20;
                    return (
                      <td key={h} className={`p-0 ${widthClass}`}>
                        <textarea
                          value={row[h] ?? ""}
                          placeholder="입력…"
                          rows={estimateRows(row[h] ?? "", charsPerLine)}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            // "상세" 계열 칸은 첫 줄도 다른 줄들과 마찬가지로 가운데 점으로
                            // 시작해야 하므로, 빈 칸에서 처음 입력(타이핑/붙여넣기)이 들어올
                            // 때 맨 앞에 "· "를 붙여준다.
                            if (h.includes("상세") && (row[h] ?? "") === "" && nextValue !== "" && !nextValue.startsWith("· ")) {
                              updateCell(activeSheet, rowIdx, h, "· " + nextValue);
                              return;
                            }
                            updateCell(activeSheet, rowIdx, h, nextValue);
                          }}
                          onKeyDown={(e) => {
                            // "상세" 계열 칸(상세 정의 등)에서 Enter를 누르면 줄은 그대로
                            // 바뀌고, 새 줄 맨 앞에 가운데 점을 붙여준다(글머리 기호처럼).
                            if (h.includes("상세") && e.key === "Enter") {
                              e.preventDefault();
                              const el = e.currentTarget;
                              const start = el.selectionStart;
                              const end = el.selectionEnd;
                              const value = row[h] ?? "";
                              const insertion = "\n· ";
                              const nextValue = value.slice(0, start) + insertion + value.slice(end);
                              updateCell(activeSheet, rowIdx, h, nextValue);
                              requestAnimationFrame(() => {
                                const pos = start + insertion.length;
                                el.selectionStart = el.selectionEnd = pos;
                                el.style.height = "auto";
                                el.style.height = `${el.scrollHeight}px`;
                              });
                            }
                          }}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => addRow(activeSheet, selectedRowIdx)}
          className="mt-3 w-full rounded border border-dashed border-border py-2.5 text-[12.5px] font-medium text-muted hover:border-accent hover:text-accent"
        >
          {selectedRowIdx !== null ? "+ 선택한 행 다음에 추가" : "+ 행 추가"}
        </button>
      </div>
    </div>
  );
}
