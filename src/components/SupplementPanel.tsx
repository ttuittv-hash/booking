"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { formatDateTime } from "@/lib/format";

/**
 * [신규 2026-09-18] 보완 제출 — 보류(보완 요청)를 받은 신청자가 자료를 올린 뒤 그 절차를
 * 닫는 버튼(nora: "업로드 하고 자료를 '보완제출' 할 수 있는 버튼으로 해당 프로세스를
 * 종료하는 기능").
 *
 * 첨부 패널 바로 아래에 둔다 — 올리고 나서 누르는 순서라 그 자리가 맞다.
 * 헤딩 규격은 AttachmentsPanel·TicketOpenPanel 과 같게 맞춘다(2px 상단 보더 + type-kr-heading).
 */
export function SupplementPanel({
  quoteId,
  submittedAt,
  attachmentCount,
}: {
  quoteId: string;
  /** 이미 제출했으면 그 시각. 아직이면 null */
  submittedAt: string | null;
  /** 한 건도 없이 제출하는 걸 막기 위해 받는다 */
  attachmentCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!window.confirm("보완 자료 제출을 마치시겠습니까?\n제출하면 추가 업로드가 닫히고 운영자에게 전달됩니다.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/supplement`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "보완 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-12">
      <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
        보완 자료 제출
      </h3>

      {submittedAt ? (
        <p className="mt-6 border-l-2 border-foreground px-3 py-2 text-s">
          <b>보완 제출 완료</b>
          <span className="ml-2 text-muted tabular-nums">{formatDateTime(submittedAt)}</span>
          <span className="mt-1 block text-xs text-muted">
            운영자에게 전달되었습니다. 추가 자료가 필요하면 운영자에게 문의해 주세요.
          </span>
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted">
            위 첨부서류에 보완 자료를 모두 올린 뒤 제출해 주세요. 제출하면 추가 업로드가 닫히고
            운영자에게 전달됩니다.
          </p>
          <div className="mt-6">
            <button
              type="button"
              disabled={busy || attachmentCount === 0}
              onClick={() => void submit()}
              className={btnClass("primary")}
            >
              {busy ? "제출 중..." : "보완 제출"}
            </button>
            {attachmentCount === 0 && (
              <span className="ml-3 text-xs text-muted">
                올린 자료가 없습니다 — 먼저 첨부서류를 추가해 주세요.
              </span>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
