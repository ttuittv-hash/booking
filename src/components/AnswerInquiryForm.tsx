"use client";

import { useContentTransport } from "@/components/admin/ContentTransport";
import { useRouter } from "next/navigation";
import { useState } from "react";
import editor from "@/components/admin/AdminEditor.module.css";
import { ERROR_NOTE, FIELD, PANEL } from "@/components/admin/adminUi";

export function AnswerInquiryForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const { request, isPreview } = useContentTransport();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await request(`/api/inquiries/${inquiryId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "답변 등록에 실패했습니다.");
        return;
      }
      if (!isPreview) {
        window.dispatchEvent(new Event("admin-inquiry-answered"));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${editor.workspace} ${PANEL}`}>
      <h2 className={editor.title}>답변 등록</h2>
      <p className={editor.description}>등록한 답변은 신청자의 1:1 문의 화면에 즉시 표시됩니다.</p>

      <textarea
        aria-label="답변 내용"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        placeholder="답변 내용을 입력하세요."
        className={`mt-4 ${FIELD} leading-7`}
      />

      {error && <p className={`mt-3 ${ERROR_NOTE}`}>{error}</p>}

      <div className={editor.saveBar}>
      <button
        type="button"
        disabled={busy || !answer.trim()}
        onClick={submit}
        className={editor.saveButton}
      >
        {busy ? "등록 중..." : "답변 등록"}
      </button>
      </div>
    </div>
  );
}
