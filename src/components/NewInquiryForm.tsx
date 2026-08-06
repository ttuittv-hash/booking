"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";

export function NewInquiryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
        return;
      }
      router.push(`/mypage/inquiries/${data.inquiry.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border/25 pt-6">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs text-muted">제목</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-base"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs text-muted">문의 내용</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="field-base leading-7"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || !title.trim() || !content.trim()}
        onClick={submit}
        className={`${btnClass("primary")} mt-6`}
      >
        {busy ? "등록 중..." : "문의 등록"}
      </button>
    </div>
  );
}
