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

const COLORS = ["#1d1d1f", "#0071e3", "#d70015", "#1a7f37", "#86868b"];

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
          "min-h-[180px] rounded-b-sm border border-t-0 border-border bg-panel px-3 py-2.5 text-[13px] leading-6 outline-none focus:border-accent [&_img]:mt-2 [&_img]:max-w-full [&_img]:rounded-sm [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-panel-strong [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left",
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

  function btnClass(active: boolean) {
    return [
      "rounded-sm px-2 py-1 text-[12px] font-medium transition-colors",
      active ? "bg-accent text-white" : "text-muted hover:bg-panel-strong hover:text-foreground",
    ].join(" ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-sm border border-border bg-panel-strong px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive("bold"))}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive("italic"))}
        >
          <i>I</i>
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

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
          className="w-14 rounded-sm border border-border bg-background px-1.5 py-1 text-[11.5px] outline-none focus:border-accent"
        />
        <span className="text-[11px] text-muted">px</span>
        <button
          type="button"
          onClick={() => {
            editor.chain().focus().unsetMark("textStyle").run();
            setFontSizeInput(String(DEFAULT_FONT_SIZE));
          }}
          className="rounded-sm px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-panel-strong hover:text-foreground"
        >
          기본
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: c }}
            aria-label={`글자색 ${c}`}
          />
        ))}

        <span className="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={btnClass(editor.isActive({ textAlign: "left" }))}
        >
          왼쪽
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={btnClass(editor.isActive({ textAlign: "center" }))}
        >
          가운데
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={btnClass(editor.isActive({ textAlign: "right" }))}
        >
          오른쪽
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="rounded-sm px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-panel-strong hover:text-foreground"
        >
          + 표 삽입
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="rounded-sm px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-panel-strong hover:text-foreground disabled:opacity-50"
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
        <div className="flex flex-wrap items-center gap-1 border-x border-b border-border bg-panel-strong/60 px-2 py-1.5">
          <span className="mr-1 text-[11px] text-muted">이미지 크기</span>
          {IMAGE_WIDTHS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => editor.chain().focus().updateAttributes("image", { width: w.value }).run()}
              className="rounded-sm px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-panel-strong hover:text-foreground"
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
