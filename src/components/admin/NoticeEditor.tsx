"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEditorState } from "@tiptap/react";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { useRef, useState } from "react";
import { NOTICE_CALENDAR_MARKER_HTML } from "@/lib/content/noticeCalendarMarker";
import { FIELD_SM } from "./adminUi";

/**
 * 공지 본문의 편집기 안 문단 간격 — 공개 화면(notices/[id]/page.tsx의 PROSE)과 똑같이
 * margin 없이 줄간격만 쓴다. `@/components/ui/kit`의 RICH_TEXT([&_p]:mt-4)를 그대로
 * 쓰면 편집기에서만 문단 사이가 눈에 띄게 벌어져 보여서(운영자가 "줄바꿈 간격이 넓다"고
 * 느낀 원인) 이 컴포넌트만 따로 정의한다. RICH_TEXT는 공지 이외의 리치텍스트(약관 등)에서
 * 계속 쓰이므로 거기엔 손대지 않는다.
 */
const NOTICE_RICH_TEXT = [
  "[&_p]:mt-0",
  // 공개 화면과 같은 절 머리 — 영문 눈썹(<span>)이 국문 제목 위로 떨어진다.
  // 편집기에서 한 줄로 붙어 보이면 운영자가 저장 전에 결과를 알 수 없다.
  "[&_h2]:mt-5 [&_h2]:text-s [&_h2]:font-bold",
  "[&_h2>span:first-child]:mb-1 [&_h2>span:first-child]:block [&_h2>span:first-child]:text-2xs [&_h2>span:first-child]:uppercase [&_h2>span:first-child]:tracking-[0.14em] [&_h2>span:first-child]:text-muted",
  "[&_h3]:mt-4 [&_h3]:text-s [&_h3]:font-bold",
  "[&_strong]:font-bold [&_em]:italic",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1",
  "[&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4",
].join(" ");

// 기본 TextStyle 확장은 font-size 속성을 지원하지 않아 별도로 추가한다.
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

// 기본 Image 확장은 크기 조정을 지원하지 않아 width 속성을 추가한다.
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute("width") || null,
        renderHTML: (attributes: { width?: string | null }) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}` };
        },
      },
    };
  },
});

/**
 * 표 칸 — 열 너비와 칸 배경색을 **HTML 에 남긴다** (2026-09-03).
 *
 * 열 경계를 끌어 폭을 바꿔도 공개 화면에서는 그대로였다("표 열간 간격 수정 반영 실패").
 * TipTap 이 폭을 담는 `colwidth` 는 편집기(ProseMirror) 안에서만 뜻이 있는 속성이라,
 * 저장된 HTML 에 남아도 브라우저는 모른다. 그래서 같은 값을 `style="width:…"` 로도
 * 함께 내보낸다 — 공개 화면은 이 값을 보고 열 폭을 잡는다.
 *
 * 배경색은 새로 붙인 속성이다. 요금표처럼 한 행·한 칸을 눈에 띄게 두고 싶다는 요청.
 */
function withCellStyles<T extends { name: string }>(base: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (base as any).extend({
    addAttributes() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent = (this as any).parent?.() ?? {};
      return {
        ...parent,
        backgroundColor: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
          renderHTML: (attrs: { backgroundColor?: string | null }) =>
            attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
        },
        // [신규 2026-09-04] 칸 글자색도 붙여넣을 때 그대로 살린다 — 워드·페이지에서
        // 검정 칸에 흰 글자로 만든 머리행을 복사해 붙이면, 배경색은 이미 옮겨 오는데
        // 글자색은(칸 태그 자체에 style="color:..."로 붙은 경우) 스키마에 없어 버려지고
        // 있었다. mergeAttributes 가 style 을 속성별로 합쳐 주므로 backgroundColor 와
        // 똑같은 모양으로 하나 더 두면 된다.
        textColor: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.color || null,
          renderHTML: (attrs: { textColor?: string | null }) =>
            attrs.textColor ? { style: `color: ${attrs.textColor}` } : {},
        },
      };
    },
    // colwidth 는 부모가 그대로 두고(편집기가 쓴다), 내보낼 때 width 스타일을 얹는다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderHTML({ HTMLAttributes, node }: any) {
      const width = node.attrs.colwidth?.[0];
      const style = [
        width ? `width: ${width}px` : "",
        HTMLAttributes.style ?? "",
      ]
        .filter(Boolean)
        .join("; ");
      return [
        base.name === "tableHeader" ? "th" : "td",
        { ...HTMLAttributes, ...(style ? { style } : {}) },
        0,
      ];
    },
  });
}

/**
 * TipTap 표는 항상 평평하게(<thead> 없이 행이 전부 <tbody> 하나) 직렬화된다 —
 * prosemirror-tables 자체가 행 그룹(머리/본문) 개념을 모른다. "머리행" 버튼으로 첫 행을
 * 전부 th 로 바꿔도 저장되는 HTML 에는 <thead> 가 없다 — 그런데 공개 화면이 렌더링 시
 * 브라우저가 <thead> 없는 표를 파싱하면 모든 행(첫 행 포함)을 암묵적 <tbody> 하나로
 * 묶어버린다. 그 결과 PROSE 의 `[&_thead_th]:bg-foreground`(검정 머리행) 규칙은 아예
 * 걸리지 않고, 머리행도 항목열과 똑같이 `[&_tbody_th]:bg-panel-strong`(회색)로 나왔다
 * (2026-09-04, "어드민에서는 검게 보이는데 공개 화면은 회색" 신고). 저장 직전에 표마다
 * 첫 행이 전부 th 면 실제 <thead> 로, 나머지는 <tbody> 로 갈라 태그를 남긴다.
 */
function splitTableHeadRows(html: string): string {
  if (!html.includes("<table")) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("table").forEach((table) => {
    if (table.querySelector(":scope > thead")) return;
    const rows = Array.from(table.rows);
    if (rows.length < 2) return;
    const [headRow, ...bodyRows] = rows;
    const isHeaderRow = Array.from(headRow.cells).every((cell) => cell.tagName === "TH");
    if (!isHeaderRow) return;
    const thead = document.createElement("thead");
    thead.appendChild(headRow);
    const tbody = document.createElement("tbody");
    bodyRows.forEach((row) => tbody.appendChild(row));
    table.querySelectorAll(":scope > tbody").forEach((tb) => tb.remove());
    table.insertBefore(thead, table.firstChild);
    table.appendChild(tbody);
  });
  return container.innerHTML;
}

const DEFAULT_FONT_SIZE = 14;

/** 표 칸 배경 — 지면과 같은 계열의 옅은 면만 둔다(글자는 검정 그대로 읽혀야 한다) */
const CELL_FILLS: { value: string | null; label: string }[] = [
  { value: null, label: "없음" },
  { value: "#f2f0ef", label: "회백" },
  { value: "#e6e3e1", label: "연회색" },
  { value: "#e8f0ea", label: "연초록" },
  { value: "#fdf3d3", label: "연노랑" },
];

const IMAGE_WIDTHS = [
  { label: "작게", value: "320px" },
  { label: "보통", value: "560px" },
  { label: "크게", value: "800px" },
  { label: "원본", value: null },
];

/**
 * 본문 글자색 팔레트.
 * 이 값들은 UI 색이 아니라 **본문 HTML 에 저장되는 콘텐츠 값**이라 시맨틱 토큰(var)을
 * 쓸 수 없다. 그래서 Figma Style Guide › Variables 의 프리미티브 값만 그대로 쓴다.
 * (옐로는 밝은 지면 위 텍스트로 쓸 수 없으므로 팔레트에 넣지 않는다)
 */
const COLORS: { value: string; label: string }[] = [
  { value: "#000000", label: "검정" },
  { value: "#444444", label: "진회색" },
  { value: "#666666", label: "회색" },
  { value: "#a8200d", label: "강조 빨강" },
  { value: "#0f5c33", label: "강조 초록" },
];

export function NoticeEditor({
  value,
  onChange,
  uploadUrl = "/api/admin/notices/upload",
}: {
  value: string;
  onChange: (html: string) => void;
  uploadUrl?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(DEFAULT_FONT_SIZE));
  /**
   * HTML 소스 모드 — 일반 에디터가 모르는 태그(`<details>` 접기/펼치기 등)를 쓸 때를 위한 탈출구.
   * 소스 모드에서 일반 모드로 되돌아가면 에디터가 이해하는 태그만 남는다(스키마 밖 태그는 풀린다) —
   * 워드프레스 "텍스트/비주얼" 전환과 같은 제약이다. `<details>` 를 쓴 상태로는 저장만 하고
   * 일반 모드로 되돌아가지 않는 편이 안전하다.
   */
  const [mode, setMode] = useState<"visual" | "html">("visual");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FontSize,
      Color,
      ResizableImage.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      // resizable: true — 열 경계를 끌어 폭을 조절한다(colwidth 로 저장되고,
      // sanitizeRichText 가 th/td 의 colwidth 와 colgroup 을 허용한다).
      Table.configure({ resizable: true }),
      TableRow,
      withCellStyles(TableHeader),
      withCellStyles(TableCell),
      // persist: true — 열림/닫힘 상태를 문서에 저장한다. 그래야 삽입 직후 강제로
      // 열어서(아래 setDetails 클릭 핸들러) 운영자가 바로 내용을 쓸 수 있다.
      // 기본값(false)이면 항상 접힌 채로 시작해 편집기 안에서도 안 보이고 못 썼다.
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(splitTableHeadRows(editor.getHTML())),
    editorProps: {
      /*
        이미지를 붙여넣거나(스크린샷 Ctrl+V) 끌어다 놓으면(드래그) TipTap 기본 동작은
        base64 data: URL 로 문서에 그대로 박아 넣는다 — 이미지 하나가 수백 KB~수 MB
        가 되어 저장 요청이 갑자기 커진다("본문이 너무 큽니다" 안내가 나오던 그 문제,
        2026-09-02). 파일이면 붙여넣기/드롭 시점에 가로채 업로드 라우트로 올리고
        실제 URL 로만 삽입한다. 워드·페이지에서 복사한 서식에 이미지가 이미
        data: URL 로 박혀 오는 경우(파일이 아니라 붙여넣은 HTML 자체에 포함)는
        업로드로 가로챌 수 없어 통째로 지운다 — [이미지 삽입] 버튼으로 다시 넣게 한다.
      */
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => uploadAndInsertImage(file));
        return true;
      },
      handleDrop(_view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => uploadAndInsertImage(file));
        return true;
      },
      transformPastedHTML(html) {
        return html.replace(/<img\b[^>]*\ssrc=["']data:[^"']*["'][^>]*>/gi, "");
      },
      attributes: {
        // 문단 간격은 공개 화면과 똑같이 margin 없이 줄간격(leading)만 쓴다 — RICH_TEXT의
        // [&_p]:mt-4 를 그대로 쓰면 편집기에서만 문단 사이가 눈에 띄게 벌어져 보인다.
        class: `${NOTICE_RICH_TEXT} min-h-[180px] rounded-b-btn border border-t-0 border-border-soft bg-surface px-3 py-2.5 text-s leading-6 focus:border-foreground focus:outline-none [&_img]:mt-2 [&_img]:max-w-full [&_table]:mt-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:relative [&_th]:relative [&_.column-resize-handle]:absolute [&_.column-resize-handle]:-right-px [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:h-full [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:cursor-col-resize [&_.column-resize-handle]:bg-accent [&_td]:border [&_td]:border-border-soft [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border-soft [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_tr:first-child_th]:bg-foreground [&_tr:first-child_th]:text-background [&_tr:not(:first-child)_th]:bg-panel-strong [&_tr:not(:first-child)_th]:text-foreground [&_[data-type=details]]:mt-3 [&_[data-type=details]]:border [&_[data-type=details]]:border-border-soft [&_[data-type=details]]:p-2.5 [&_[data-type=details]>button]:mr-2 [&_[data-type=details]>button]:inline-flex [&_[data-type=details]>button]:h-4 [&_[data-type=details]>button]:w-4 [&_[data-type=details]>button]:shrink-0 [&_[data-type=details]>button]:cursor-pointer [&_[data-type=details]>button]:border [&_[data-type=details]>button]:border-muted [&_[data-type=details]_summary]:inline [&_[data-type=details]_summary]:cursor-text [&_[data-type=details]_summary]:font-bold [&_[data-type=detailsContent]]:mt-2 [&_[data-type=detailsContent]]:min-h-[1.6em] [&_[data-type=detailsContent]]:border-t [&_[data-type=detailsContent]]:border-dashed [&_[data-type=detailsContent]]:border-border-soft [&_[data-type=detailsContent]]:pt-2`,
      },
    },
  });

  const isImageActive = useEditorState({
    editor,
    selector: ({ editor }) => !!editor?.isActive("image"),
  });

  // 커서가 표 안에 있을 때만 표 편집 줄을 띄운다 — 툴바에 항상 두면 아홉 개 버튼이
  // 놀고 있고, 정작 표를 만든 뒤에는 행·열을 못 늘려 3×3 그대로 써야 했다.
  const isTableActive = useEditorState({
    editor,
    selector: ({ editor }) => !!editor?.isActive("table"),
  });

  async function uploadAndInsertImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && editor) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  /** 툴바 버튼 — 활성 상태는 옐로 면 + 검정 텍스트 (옐로 위 텍스트는 항상 검정) */
  function toolBtn(active: boolean) {
    return [
      "rounded-btn border px-2 py-1 text-xs font-bold transition-colors",
      active
        ? "border-foreground bg-accent text-on-accent"
        : "border-transparent text-muted hover:border-border-soft hover:text-foreground",
    ].join(" ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-btn border border-border-soft bg-background px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolBtn(editor.isActive("bold"))}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolBtn(editor.isActive("italic"))}
        >
          <i>I</i>
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        <input
          type="number"
          min={8}
          max={72}
          value={fontSizeInput}
          onChange={(e) => setFontSizeInput(e.target.value)}
          onBlur={() => {
            const size = Math.round(Number(fontSizeInput));
            if (Number.isFinite(size) && size > 0) {
              editor.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run();
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const size = Math.round(Number(fontSizeInput));
            if (Number.isFinite(size) && size > 0) {
              editor.chain().focus().setMark("textStyle", { fontSize: `${size}px` }).run();
            }
          }}
          className={`w-14 ${FIELD_SM} text-right tabular-nums`}
        />
        <span className="text-xs text-muted">px</span>
        <button
          type="button"
          onClick={() => {
            editor.chain().focus().unsetMark("textStyle").run();
            setFontSizeInput(String(DEFAULT_FONT_SIZE));
          }}
          className={toolBtn(false)}
        >
          기본
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            className="h-5 w-5 rounded-btn border border-border-soft transition-colors hover:border-foreground"
            style={{ backgroundColor: c.value }}
            aria-label={`글자색 ${c.label}`}
            title={c.label}
          />
        ))}

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={toolBtn(editor.isActive({ textAlign: "left" }))}
        >
          왼쪽
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={toolBtn(editor.isActive({ textAlign: "center" }))}
        >
          가운데
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={toolBtn(editor.isActive({ textAlign: "right" }))}
        >
          오른쪽
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={toolBtn(false)}
        >
          + 표 삽입
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          onClick={() => {
            if (editor.isActive("details")) {
              editor.chain().focus().unsetDetails().run();
            } else {
              // 삽입 직후 열어 둔다 — 접힌 채면 편집기에서도 내용 영역이 안 보여
              // 클릭해서 쓸 수가 없다. 닫힌 채로 두고 싶으면 저장 전에 ▶ 를 눌러 접으면 된다.
              editor.chain().focus().setDetails().updateAttributes("details", { open: true }).run();
            }
          }}
          className={toolBtn(editor.isActive("details"))}
          title="선택한 문단을 접고 펼치는 영역으로 묶습니다(바로 펼쳐진 채로 만들어져 안의 내용을 쓸 수 있습니다). 다시 누르면 풉니다. 저장할 때 접혀 있으면 화면에도 접힌 채로, 펼쳐져 있으면 펼쳐진 채로 나갑니다."
        >
          {editor.isActive("details") ? "접기/펼치기 해제" : "+ 접기/펼치기"}
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          onClick={() => editor.chain().focus().insertContent(NOTICE_CALENDAR_MARKER_HTML).run()}
          className={toolBtn(false)}
          title="본문의 이 위치에 '대관 현황 캘린더' 보기 버튼을 넣습니다."
        >
          + 대관 캘린더
        </button>

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className={`${toolBtn(false)} disabled:opacity-50`}
        >
          {uploading ? "업로드 중..." : "+ 이미지 삽입"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAndInsertImage(file);
            e.target.value = "";
          }}
        />

        <span className="mx-1 h-4 w-px bg-border/30" />

        <button
          type="button"
          onClick={() => {
            if (mode === "html") {
              // 소스 모드에서 편집한 HTML을 에디터에 반영한다 — 스키마 밖 태그(예: <details>)는 여기서 풀린다.
              editor.commands.setContent(value);
            }
            setMode(mode === "visual" ? "html" : "visual");
          }}
          className={toolBtn(mode === "html")}
        >
          {mode === "html" ? "일반 편집" : "HTML 소스"}
        </button>
      </div>

      {isTableActive && mode === "visual" && (
        <div className="flex flex-wrap items-center gap-1 border-x border-b border-border-soft bg-background px-2 py-1.5">
          <span className="mr-1 text-xs text-muted">표</span>
          {(
            [
              ["행 ↑", () => editor.chain().focus().addRowBefore().run()],
              ["행 ↓", () => editor.chain().focus().addRowAfter().run()],
              ["행 삭제", () => editor.chain().focus().deleteRow().run()],
              ["열 ←", () => editor.chain().focus().addColumnBefore().run()],
              ["열 →", () => editor.chain().focus().addColumnAfter().run()],
              ["열 삭제", () => editor.chain().focus().deleteColumn().run()],
              ["머리행", () => editor.chain().focus().toggleHeaderRow().run()],
              ["셀 합치기", () => editor.chain().focus().mergeCells().run()],
              ["셀 나누기", () => editor.chain().focus().splitCell().run()],
              ["표 삭제", () => editor.chain().focus().deleteTable().run()],
            ] as const
          ).map(([label, run]) => (
            <button key={label} type="button" onClick={run} className={toolBtn(false)}>
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border/30" />
          {/* [신규 2026-09-03] 칸 배경색 — 커서가 있는 칸(또는 선택한 칸들)에 면을 깐다. */}
          <span className="text-xs text-muted">칸 배경</span>
          {CELL_FILLS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() =>
                editor.chain().focus().setCellAttribute("backgroundColor", f.value).run()
              }
              className={
                f.value
                  ? "h-5 w-5 rounded-btn border border-border-soft transition-colors hover:border-foreground"
                  : `${toolBtn(false)} h-5 px-1.5 py-0 leading-none`
              }
              style={f.value ? { backgroundColor: f.value } : undefined}
              aria-label={`칸 배경 ${f.label}`}
              title={f.label}
            >
              {f.value ? null : "없음"}
            </button>
          ))}
          <span className="ml-1 text-xs text-muted">열 폭은 경계선을 끌어 조절합니다</span>
        </div>
      )}

      {isImageActive && mode === "visual" && (
        <div className="flex flex-wrap items-center gap-1 border-x border-b border-border-soft bg-background px-2 py-1.5">
          <span className="mr-1 text-xs text-muted">이미지 크기</span>
          {IMAGE_WIDTHS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => editor.chain().focus().updateAttributes("image", { width: w.value }).run()}
              className={toolBtn(false)}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      {mode === "html" ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={16}
            spellCheck={false}
            className="min-h-[180px] w-full rounded-b-btn border border-t-0 border-border-soft bg-surface px-3 py-2.5 font-mono text-xs leading-6 focus:border-foreground focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-muted">
            HTML을 직접 씁니다. 접고 펼치는 문단은 툴바의 &ldquo;+ 접기/펼치기&rdquo; 버튼으로
            만드는 편이 안전합니다(일반 편집으로 되돌아가도 유지됩니다). 여기서 직접{" "}
            <code className="font-mono">{"<details>"}</code> 태그를 썼다면 구조가 정확히
            <code className="font-mono">
              {"<details><summary>제목</summary><div data-type=\"detailsContent\">내용</div></details>"}
            </code>
            를 따라야 일반 편집에서도 인식됩니다.
          </p>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
