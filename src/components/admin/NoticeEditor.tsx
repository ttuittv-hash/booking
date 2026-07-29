"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
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

const FONT_SIZES = [
  { label: "본문", value: "" },
  { label: "작게", value: "12px" },
  { label: "크게", value: "20px" },
  { label: "제목", value: "28px" },
];

const COLORS = ["#1d1d1f", "#0071e3", "#d70015", "#1a7f37", "#86868b"];

export function NoticeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FontSize,
      Color,
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] rounded-b-sm border border-t-0 border-border bg-panel px-3 py-2.5 text-[13px] leading-6 outline-none focus:border-accent [&_img]:mt-2 [&_img]:max-w-full [&_img]:rounded-sm",
      },
    },
  });

  async function uploadAndInsertImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
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

        <select
          onChange={(e) => {
            const size = e.target.value;
            if (size) {
              editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
            } else {
              editor.chain().focus().unsetMark("textStyle").run();
            }
          }}
          defaultValue=""
          className="rounded-sm border border-border bg-background px-1.5 py-1 text-[11.5px] outline-none"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

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

      <EditorContent editor={editor} />
    </div>
  );
}
