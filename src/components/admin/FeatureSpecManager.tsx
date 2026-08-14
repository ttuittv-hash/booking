"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FEATURE_SPEC_SHEET_KEYS,
  type FeatureSpecRow,
  type FeatureSpecSheetKey,
} from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import {
  ADD_BTN,
  ADD_BTN_LG,
  FIELD_SM,
  HELP,
  TABLE,
  TABLE_SCROLL,
  TH,
  THEAD_ROW,
  TR_HOVER,
} from "@/components/admin/adminUi";

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
  path: string[];
  routePath?: string;
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
    let pathSoFar: string[] = [];
    for (const label of parts) {
      pathSoFar = [...pathSoFar, label];
      node = siblings.find((n) => n.label === label);
      if (!node) {
        node = { label, path: pathSoFar, children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
    if (node) {
      if (row["경로"]) node.routePath = row["경로"];
      if (row["비고"]) node.note = row["비고"];
    }
  }
  return roots;
}

// 트리 도식을 직접 편집하면 그 결과가 곧 시트의 행(rows)이어야 하므로, 모든 편집은
// "행 배열을 어떻게 바꿀지"로 귀결시킨다 — 별도 데이터 모델을 만들지 않고 기존
// FeatureSpecRow[] 저장 방식을 그대로 재사용한다.
function blankTreeRow(levelKeys: string[]): FeatureSpecRow {
  const row: FeatureSpecRow = {};
  levelKeys.forEach((k) => (row[k] = ""));
  row["경로"] = "";
  row["비고"] = "";
  return row;
}

function renameTreeNode(
  rows: FeatureSpecRow[],
  levelKeys: string[],
  path: string[],
  newLabel: string,
): FeatureSpecRow[] {
  const depth = path.length;
  const key = levelKeys[depth - 1];
  return rows.map((row) => {
    const ancestorsMatch = path.slice(0, depth - 1).every((label, i) => (row[levelKeys[i]] ?? "") === label);
    if (ancestorsMatch && (row[key] ?? "") === path[depth - 1]) {
      return { ...row, [key]: newLabel };
    }
    return row;
  });
}

function addTreeChild(rows: FeatureSpecRow[], levelKeys: string[], parentPath: string[]): FeatureSpecRow[] {
  const depth = parentPath.length;
  if (depth >= levelKeys.length) return rows;
  const row = blankTreeRow(levelKeys);
  parentPath.forEach((label, i) => (row[levelKeys[i]] = label));
  row[levelKeys[depth]] = "새 항목";
  return [...rows, row];
}

function addTreeRoot(rows: FeatureSpecRow[], levelKeys: string[]): FeatureSpecRow[] {
  const row = blankTreeRow(levelKeys);
  row[levelKeys[0]] = "새 항목";
  return [...rows, row];
}

function deleteTreeNode(rows: FeatureSpecRow[], levelKeys: string[], path: string[]): FeatureSpecRow[] {
  return rows.filter((row) => !path.every((label, i) => (row[levelKeys[i]] ?? "") === label));
}

function updateTreeLeaf(
  rows: FeatureSpecRow[],
  levelKeys: string[],
  path: string[],
  field: "경로" | "비고",
  value: string,
): FeatureSpecRow[] {
  const depth = path.length;
  const idx = rows.findIndex((row) => {
    const parts = levelKeys.map((k) => (row[k] ?? "").trim()).filter(Boolean);
    return parts.length === depth && parts.every((label, i) => label === path[i]);
  });
  if (idx === -1) {
    const row = blankTreeRow(levelKeys);
    path.forEach((label, i) => (row[levelKeys[i]] = label));
    row[field] = value;
    return [...rows, row];
  }
  return rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
}

// "ch" 단위는 숫자(0) 글자 폭 기준이라 한글처럼 훨씬 넓게 그려지는 글자에는
// 그대로 쓰면 폭이 크게 부족해진다. 한글 음절/자모/한자 범위는 두 배 가까이
// 넓게 잡아서 실제 렌더링 폭에 맞춘다.
function estimateWidthCh(text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isWide =
      (code >= 0xac00 && code <= 0xd7a3) || // 한글 음절
      (code >= 0x3131 && code <= 0x318e) || // 한글 자모
      (code >= 0x4e00 && code <= 0x9fff); // 한자
    width += isWide ? 1.9 : 1;
  }
  return width;
}

function TreeTextField({
  value,
  placeholder,
  className,
  minWidthCh,
  onCommit,
}: {
  value: string;
  placeholder: string;
  className: string;
  minWidthCh: number;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // 다른 데이터 갱신으로 바깥 값이 바뀌면(예: 다른 조작으로 rows가 재계산된 경우)
  // 편집 중이 아닌 이상 최신 값으로 다시 맞춘다. useEffect 대신 렌더 중 비교하는
  // React 공식 패턴("Adjusting state when a prop changes")을 사용해 불필요한
  // 추가 렌더링을 피한다.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }
  // 고정 폭이면 긴 텍스트가 잘려서 안 보이므로, 글자 수에 맞춰 칸 자체가 늘어나게
  // 한다. 한글은 "ch" 단위(숫자 폭 기준)보다 실제로 더 넓게 그려지므로 여유를
  // 넉넉히 둔다.
  const widthCh = Math.max(minWidthCh, estimateWidthCh(draft) + 3);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      style={{ width: `${widthCh}ch` }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={className}
    />
  );
}

function MenuTreeBranch({
  node,
  levelKeys,
  onRename,
  onAddChild,
  onDelete,
  onUpdateLeaf,
}: {
  node: MenuTreeNode;
  levelKeys: string[];
  onRename: (path: string[], newLabel: string) => void;
  onAddChild: (parentPath: string[]) => void;
  onDelete: (path: string[]) => void;
  onUpdateLeaf: (path: string[], field: "경로" | "비고", value: string) => void;
}) {
  const canAddChild = node.path.length < levelKeys.length;
  return (
    <li className="relative pl-10 before:absolute before:left-0 before:top-[17px] before:h-px before:w-8 before:bg-border-soft">
      <div className="inline-flex flex-wrap items-center gap-1.5 py-1.5">
        <TreeTextField
          value={node.label}
          placeholder="이름"
          minWidthCh={8}
          onCommit={(v) => v.trim() && onRename(node.path, v.trim())}
          className={`${FIELD_SM} bg-panel font-bold`}
        />
        <TreeTextField
          value={node.routePath ?? ""}
          placeholder="경로"
          minWidthCh={10}
          onCommit={(v) => onUpdateLeaf(node.path, "경로", v)}
          className={`${FIELD_SM} text-muted-strong`}
        />
        <TreeTextField
          value={node.note ?? ""}
          placeholder="비고"
          minWidthCh={12}
          onCommit={(v) => onUpdateLeaf(node.path, "비고", v)}
          className={`${FIELD_SM} border-transparent text-muted focus:border-border-soft`}
        />
        {canAddChild && (
          <button
            type="button"
            title="아래 가지 추가"
            onClick={() => onAddChild(node.path)}
            className={`${ADD_BTN} px-1.5 py-0.5 leading-tight`}
          >
            +
          </button>
        )}
        <button
          type="button"
          title="이 가지 삭제 (하위 가지도 함께 삭제됨)"
          onClick={() => onDelete(node.path)}
          className="border border-border-soft px-1.5 py-0.5 text-xs leading-tight text-muted transition-colors hover:border-danger hover:text-danger"
        >
          ×
        </button>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-3 border-l border-border-soft pl-0">
          {node.children.map((child, i) => (
            <MenuTreeBranch
              key={i}
              node={child}
              levelKeys={levelKeys}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onUpdateLeaf={onUpdateLeaf}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MenuTreeDiagram({
  rows,
  levelKeys,
  onChange,
}: {
  rows: FeatureSpecRow[];
  levelKeys: string[];
  onChange: (nextRows: FeatureSpecRow[]) => void;
}) {
  const tree = buildMenuTree(rows, levelKeys);
  const onRename = (path: string[], newLabel: string) => onChange(renameTreeNode(rows, levelKeys, path, newLabel));
  const onAddChild = (parentPath: string[]) => onChange(addTreeChild(rows, levelKeys, parentPath));
  const onDelete = (path: string[]) => onChange(deleteTreeNode(rows, levelKeys, path));
  const onUpdateLeaf = (path: string[], field: "경로" | "비고", value: string) =>
    onChange(updateTreeLeaf(rows, levelKeys, path, field, value));

  return (
    <div className="mt-2 overflow-x-auto border border-border-soft bg-panel p-4">
      {tree.length === 0 && <p className="px-1 py-2 text-xs text-muted">항목이 없습니다.</p>}
      <ul className="flex flex-col">
        {tree.map((node, i) => (
          <MenuTreeBranch
            key={i}
            node={node}
            levelKeys={levelKeys}
            onRename={onRename}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onUpdateLeaf={onUpdateLeaf}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange(addTreeRoot(rows, levelKeys))}
        className={`${ADD_BTN_LG} mt-3 w-full justify-center`}
      >
        + 새 항목 추가 (최상위)
      </button>
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
  // 마우스 드래그로 행 순서를 바꿀 때 쓰는 상태 — 어떤 행을 잡았는지, 지금 어느 행
  // 위에 올라가 있는지.
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
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

  // 마우스로 행을 잡아 원하는 자리에 끌어다 놓는 방식의 순서 변경.
  function moveRowTo(sheet: FeatureSpecSheetKey, fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setData((prev) => {
      const rows = [...prev[sheet]];
      const [moved] = rows.splice(fromIdx, 1);
      rows.splice(toIdx, 0, moved);
      persist(sheet, rows);
      return { ...prev, [sheet]: rows };
    });
    setSelectedRowIdx((prev) => {
      if (prev === null) return null;
      if (prev === fromIdx) return toIdx;
      if (fromIdx < prev && prev <= toIdx) return prev - 1;
      if (toIdx <= prev && prev < fromIdx) return prev + 1;
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
  const menuTreeLevelKeys = MENU_TREE_LEVEL_KEYS[activeSheet];

  function updateTreeRows(nextRows: FeatureSpecRow[]) {
    setData((prev) => ({ ...prev, [activeSheet]: nextRows }));
    persist(activeSheet, nextRows);
  }

  // 셀이 전부 textarea라 마우스로 여러 칸에 걸쳐 드래그 선택/복사를 할 수 없다.
  // 대신 지금 보고 있는 시트 전체를 표 형태(탭으로 구분된 텍스트)로 클립보드에
  // 복사해서, 채팅에 붙여넣어 전달할 수 있게 한다.
  async function copySheetAsText() {
    const tsvLine = (cells: string[]) => cells.map((c) => c.replace(/\t/g, " ").replace(/\r?\n/g, " ")).join("\t");
    const lines = [tsvLine(headers), ...rows.map((row) => tsvLine(headers.map((h) => row[h] ?? "")))];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

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
                "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap border px-3 py-2 text-left text-s font-bold outline-none transition-colors",
                activeSheet === key
                  ? "border-foreground bg-inverse-bg text-inverse-fg"
                  : "border-transparent text-muted hover:border-border-soft hover:text-foreground",
              ].join(" ")}
            >
              <span>{key}</span>
              <span className="text-xs tabular-nums">{data[key].length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={HELP}>
            {menuTreeLevelKeys
              ? "이름·경로·비고를 클릭해서 바로 수정하고, +로 가지를 늘리거나 ×로 삭제하세요. 변경 사항은 자동 저장됩니다."
              : "셀을 클릭해서 바로 수정하세요. 변경 사항은 자동 저장됩니다."}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={copySheetAsText} className={btnClass("secondary", "sm")}>
              {copyState === "copied" ? "복사됨 ✓" : copyState === "error" ? "복사 실패" : "표 복사"}
            </button>
            <p className={HELP}>
              {state === "saving" && "저장 중…"}
              {state === "saved" && `저장됨 · ${savedAt[activeSheet] ?? ""}`}
              {state === "error" && <span className="text-danger">저장 실패 — 다시 시도해 주세요</span>}
            </p>
          </div>
        </div>

        {menuTreeLevelKeys && (
          <div className="mt-3">
            <p className={`${HELP} font-bold`}>메뉴 구조도</p>
            <MenuTreeDiagram rows={rows} levelKeys={menuTreeLevelKeys} onChange={updateTreeRows} />
          </div>
        )}

        {!menuTreeLevelKeys && (
        <>
        <div ref={tableRef} className={`mt-2 border border-border-soft ${TABLE_SCROLL}`}>
          <table className={`${TABLE} min-w-[720px]`}>
            <thead>
              <tr className={THEAD_ROW}>
                {/* 행 조작 열 — 가로 스크롤해도 좌측에 고정된다 */}
                <th className="sticky left-0 z-10 w-1 border-r border-border-soft bg-background px-2 py-2.5" />
                {headers.map((h) => (
                  <th key={h} className={`${TH} whitespace-nowrap ${columnWidthClass(h)}`}>
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
                  onDragOver={(e) => {
                    if (draggedRowIdx === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverRowIdx !== rowIdx) setDragOverRowIdx(rowIdx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedRowIdx !== null) moveRowTo(activeSheet, draggedRowIdx, rowIdx);
                    setDraggedRowIdx(null);
                    setDragOverRowIdx(null);
                  }}
                  className={[
                    TR_HOVER,
                    "align-top",
                    // 선택 표시는 옐로 면이 아니라 아주 옅은 중성 틴트로만 (선택 신호는 좌측 마커의 검정 채움)
                    selectedRowIdx === rowIdx ? "bg-foreground/[0.05]" : "",
                    // 드롭 위치는 구분선으로만 표시한다 (옐로는 구분선 용도로 허용)
                    dragOverRowIdx === rowIdx && draggedRowIdx !== rowIdx ? "border-t-2 border-t-accent" : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "sticky left-0 z-10 whitespace-nowrap border-r border-border-soft px-1.5 py-2.5 text-center align-middle",
                      selectedRowIdx === rowIdx ? "bg-foreground/[0.05]" : "bg-background",
                    ].join(" ")}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        title="이 행을 선택 — 다음 '행 추가'가 이 행 바로 뒤에 들어감"
                        onClick={() => setSelectedRowIdx((prev) => (prev === rowIdx ? null : rowIdx))}
                        className={[
                          "h-3.5 w-3.5 border transition-colors",
                          selectedRowIdx === rowIdx
                            ? "border-foreground bg-inverse-bg"
                            : "border-border-soft hover:border-foreground",
                        ].join(" ")}
                      />
                      <div
                        draggable
                        title="마우스로 잡아서 순서 변경"
                        onDragStart={(e) => {
                          setDraggedRowIdx(rowIdx);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(rowIdx));
                        }}
                        onDragEnd={() => {
                          setDraggedRowIdx(null);
                          setDragOverRowIdx(null);
                        }}
                        className="flex h-3.5 w-6 cursor-grab items-center justify-center text-xs leading-none text-muted transition-colors hover:text-foreground active:cursor-grabbing"
                      >
                        ⠿
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          title="아래에 행 추가"
                          onClick={() => addRow(activeSheet, rowIdx)}
                          className="border border-border-soft px-1.5 py-0.5 text-xs leading-tight text-muted transition-colors hover:border-foreground hover:text-foreground"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          title="이 행 삭제"
                          onClick={() => deleteRow(activeSheet, rowIdx)}
                          className="border border-border-soft px-1.5 py-0.5 text-xs leading-tight text-muted transition-colors hover:border-danger hover:text-danger"
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
                          className="block w-full resize-none whitespace-pre-wrap break-words border-0 bg-transparent px-3 py-2.5 text-s leading-5 focus:bg-foreground/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                        />
                      </td>
                    );
                  })}
                  {/* 행 조작 버튼(+ · ×)은 좌측 고정 열로 옮겼다 */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => addRow(activeSheet, selectedRowIdx)}
          className={`${ADD_BTN_LG} mt-3 w-full justify-center`}
        >
          {selectedRowIdx !== null ? "+ 선택한 행 다음에 추가" : "+ 행 추가"}
        </button>
        </>
        )}
      </div>
    </div>
  );
}
