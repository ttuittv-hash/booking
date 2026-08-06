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
import { useRef, useState } from "react";
import { FIELD_SM } from "./adminUi";

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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FontSize,
      Color,
      ResizableImage.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] border border-t-0 border-border-soft bg-surface px-3 py-2.5 text-s leading-6 focus:border-foreground focus:outline-2 focus:outline-accent [&_img]:mt-2 [&_img]:max-w-full [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border-soft [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border-soft [&_th]:bg-background [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left",
      },
    },
  });

  const isImageActive = useEditorState({
    editor,
    selector: ({ editor }) => !!editor?.isActive("image"),
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
      </div>

      {isImageActive && (
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

      <EditorContent editor={editor} />
    </div>
  );
}
