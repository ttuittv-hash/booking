"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import type { LegalContent } from "@/lib/content/types";
import { NoticeEditor } from "./NoticeEditor";

const RICH_TEXT_PREVIEW_CLS =
  "[&_h2]:mt-6 [&_h2]:text-h6-m [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-panel-strong [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left";

export function LegalContentForm({
  kind,
  label,
  content: initial,
  publicHref,
}: {
  kind: "terms" | "privacy";
  label: string;
  content: LegalContent;
  publicHref: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState<LegalContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/legal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setContent(data.content);
      setMessage(`저장되었습니다. '${label}' 페이지에 바로 반영됩니다.`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-10 -mx-6 flex items-center justify-between border-b border-border bg-background px-6 py-3 sm:top-16">
        <span className="text-xs text-muted">수정 중인 내용은 저장 전까지 실제 페이지에 반영되지 않습니다.</span>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          className={`shrink-0 ${btnClass("secondary", "sm")}`}
        >
          {previewOpen ? "미리보기 닫기" : "미리보기"}
        </button>
      </div>

      {previewOpen && (
        <div className="border border-border">
          <div className="border-b border-border bg-panel px-4 py-2 text-xs font-bold text-muted">
            미리보기 — 현재 입력값 기준 (저장되지 않음)
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-background px-5 py-4">
            <p className="text-xs text-muted">시행일: {content.effectiveDate}</p>
            <div
              className={`mt-4 text-s leading-7 text-muted ${RICH_TEXT_PREVIEW_CLS}`}
              dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
            />
          </div>
        </div>
      )}

      <a href={publicHref} target="_blank" className="inline-block text-xs text-accent hover:underline">
        현재 공개된 페이지 보기 →
      </a>

      <section>
        <h3 className="text-s font-bold">시행일</h3>
        <input
          type="text"
          value={content.effectiveDate}
          onChange={(e) => setContent((prev) => ({ ...prev, effectiveDate: e.target.value }))}
          placeholder="예: 2026년 8월 1일"
          className="mt-2 w-full max-w-xs border border-border bg-background px-3 py-2 text-s outline-none focus:border-accent"
        />
      </section>

      <section>
        <h3 className="text-s font-bold">본문</h3>
        <div className="mt-2">
          <NoticeEditor
            value={content.bodyHtml}
            onChange={(bodyHtml) => setContent((prev) => ({ ...prev, bodyHtml }))}
          />
        </div>
      </section>

      {message && <p className="text-s text-good">{message}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className={btnClass("primary", "md")}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
