"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Review, ReviewDecision } from "@/lib/pricing/types";

const DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "승인",
  HOLD: "보류",
  REJECTED: "거절",
};

const DECISION_STYLE: Record<ReviewDecision, string> = {
  APPROVED: "bg-good-soft text-good",
  HOLD: "bg-warn-soft text-warn",
  REJECTED: "bg-red-50 text-red-600",
};

export function ReviewForm({
  quoteId,
  review,
  conflict,
}: {
  quoteId: string;
  review: Review | null;
  conflict?: { companyName: string | null } | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState(review?.score?.toString() ?? "");
  const [rationale, setRationale] = useState(review?.rationale ?? "");
  const [submitting, setSubmitting] = useState<ReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: ReviewDecision) {
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, score: score === "" ? null : Number(score), rationale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "심사 처리에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">심사</h3>
        {review && (
          <span className={`rounded-sm px-2.5 py-1 text-[11.5px] font-medium ${DECISION_STYLE[review.decision]}`}>
            {DECISION_LABEL[review.decision]}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        공연 내용·시설 적합성 등을 검토하고 점수/근거를 기록한 뒤 승인·보류·거절을 결정하세요.
        승인해야 계약 단계로 진행할 수 있습니다.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] text-muted">심사 점수 (0~100, 선택)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-24 rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-muted">심사 근거 / 코멘트</span>
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="예: 공연 내용 및 시설 적합성 양호, 대관 일정 문제 없음"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </label>
      </div>

      {review && (
        <p className="mt-2 text-[11px] text-muted">
          최종 결정: {new Date(review.decidedAt).toLocaleString("ko-KR")}
        </p>
      )}

      {conflict && review?.decision !== "APPROVED" && (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-600">
          같은 주차에 이미 승인된 다른 업체(
          {conflict.companyName ?? "알 수 없음"})가 있어 승인할 수 없습니다. 먼저 기존 승인 건을 보류/거절로 변경해주세요.
        </p>
      )}

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!submitting || (!!conflict && review?.decision !== "APPROVED")}
          onClick={() => decide("APPROVED")}
          className="rounded-sm bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting === "APPROVED" ? "처리 중..." : "승인"}
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => decide("HOLD")}
          className="rounded-sm border border-border px-5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-panel disabled:opacity-50"
        >
          {submitting === "HOLD" ? "처리 중..." : "보류"}
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => decide("REJECTED")}
          className="rounded-sm border border-border px-5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {submitting === "REJECTED" ? "처리 중..." : "거절"}
        </button>
      </div>
    </div>
  );
}
