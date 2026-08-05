"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-muted">제목</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-muted">문의 내용</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <button
        type="button"
        disabled={busy || !title.trim() || !content.trim()}
        onClick={submit}
        className="rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "등록 중..." : "문의 등록"}
      </button>
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
