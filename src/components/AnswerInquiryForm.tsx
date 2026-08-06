"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { ERROR_NOTE, FIELD, HELP, PANEL, SECTION_TITLE } from "@/components/admin/adminUi";

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
    <div className={PANEL}>
      <h2 className={SECTION_TITLE}>답변 등록</h2>
      <p className={`mt-2 ${HELP}`}>등록한 답변은 신청자의 1:1 문의 화면에 즉시 표시됩니다.</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        placeholder="답변 내용을 입력하세요."
        className={`mt-4 ${FIELD} leading-7`}
      />

      {error && <p className={`mt-3 ${ERROR_NOTE}`}>{error}</p>}

      <button
        type="button"
        disabled={busy || !answer.trim()}
        onClick={submit}
        className={`mt-4 ${btnClass("primary", "md")}`}
      >
        {busy ? "등록 중..." : "답변 등록"}
      </button>
    </div>
  );
}
