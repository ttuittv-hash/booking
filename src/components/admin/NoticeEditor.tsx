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

const DEFAULT_FONT_SIZE = 14;

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
      TableHeader,
      TableCell,
      // persist: true — 열림/닫힘 상태를 문서에 저장한다. 그래야 삽입 직후 강제로
      // 열어서(아래 setDetails 클릭 핸들러) 운영자가 바로 내용을 쓸 수 있다.
      // 기본값(false)이면 항상 접힌 채로 시작해 편집기 안에서도 안 보이고 못 썼다.
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        // 문단 간격은 공개 화면과 똑같이 margin 없이 줄간격(leading)만 쓴다 — RICH_TEXT의
        // [&_p]:mt-4 를 그대로 쓰면 편집기에서만 문단 사이가 눈에 띄게 벌어져 보인다.
        class: `${NOTICE_RICH_TEXT} min-h-[180px] border border-t-0 border-border-soft bg-surface px-3 py-2.5 text-s leading-6 focus:border-foreground focus:outline-2 focus:outline-accent [&_img]:mt-2 [&_img]:max-w-full [&_table]:mt-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:relative [&_th]:relative [&_.column-resize-handle]:absolute [&_.column-resize-handle]:-right-px [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:h-full [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:cursor-col-resize [&_.column-resize-handle]:bg-accent [&_td]:border [&_td]:border-border-soft [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border-soft [&_th]:bg-background [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_[data-type=details]]:mt-3 [&_[data-type=details]]:border [&_[data-type=details]]:border-border-soft [&_[data-type=details]]:p-2.5 [&_[data-type=details]>button]:mr-2 [&_[data-type=details]>button]:inline-flex [&_[data-type=details]>button]:h-4 [&_[data-type=details]>button]:w-4 [&_[data-type=details]>button]:shrink-0 [&_[data-type=details]>button]:cursor-pointer [&_[data-type=details]>button]:border [&_[data-type=details]>button]:border-muted [&_[data-type=details]_summary]:inline [&_[data-type=details]_summary]:cursor-text [&_[data-type=details]_summary]:font-bold [&_[data-type=detailsContent]]:mt-2 [&_[data-type=detailsContent]]:min-h-[1.6em] [&_[data-type=detailsContent]]:border-t [&_[data-type=detailsContent]]:border-dashed [&_[data-type=detailsContent]]:border-border-soft [&_[data-type=detailsContent]]:pt-2`,
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
      "border px-2 py-1 text-xs font-bold transition-colors",
      active
        ? "border-foreground bg-accent text-on-accent"
        : "border-transparent text-muted hover:border-border-soft hover:text-foreground",
    ].join(" ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border border-border-soft bg-background px-2 py-1.5">
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
            className="h-5 w-5 border border-border-soft transition-colors hover:border-foreground"
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
            className="min-h-[180px] w-full border border-t-0 border-border-soft bg-surface px-3 py-2.5 font-mono text-xs leading-6 focus:border-foreground focus:outline-2 focus:outline-accent"
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
