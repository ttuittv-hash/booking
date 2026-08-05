"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnswerInquiryForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "답변 등록에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        placeholder="답변 내용을 입력하세요."
        className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      <button
        type="button"
        disabled={busy || !answer.trim()}
        onClick={submit}
        className="mt-3 rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "등록 중..." : "답변 등록"}
      </button>
      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
