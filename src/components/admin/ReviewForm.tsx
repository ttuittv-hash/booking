"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Review, ReviewDecision } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import {
  ERROR_NOTE,
  FIELD,
  FIELD_BASE,
  FIELD_LABEL,
  HELP,
  PANEL,
  SECTION_TITLE,
} from "./adminUi";

const DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "승인",
  HOLD: "보류",
  REJECTED: "거절",
};

/**
 * 파괴적 결정(거절) 버튼 — kit 의 btnClass 와 같은 형태(1px 보더·샤프 코너·투명 배경)를
 * 유지하고 색만 danger 로 바꾼다. btnClass 결과에 border/text 유틸을 덧붙이면
 * 어느 쪽이 이길지 CSS 순서에 좌우되므로 클래스를 직접 조립한다.
 */
const DANGER_BTN = [
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap border px-6 text-s font-bold",
  "border-danger text-danger transition-colors duration-150 hover:bg-danger hover:text-inverse-fg",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

/** 상태 색은 kit 의 Badge tone 만 쓴다 (임의 색 금지) */
const DECISION_TONE: Record<ReviewDecision, "good" | "warn" | "danger"> = {
  APPROVED: "good",
  HOLD: "warn",
  REJECTED: "danger",
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
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={SECTION_TITLE}>심사</h3>
        {review && <Badge tone={DECISION_TONE[review.decision]}>{DECISION_LABEL[review.decision]}</Badge>}
      </div>
      <p className={`mt-2 ${HELP}`}>
        공연 내용·시설 적합성 등을 검토하고 점수/근거를 기록한 뒤 승인·보류·거절을 결정하세요.
        승인해야 계약 단계로 진행할 수 있습니다.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className={FIELD_LABEL}>심사 점수 (0~100, 선택)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={`w-24 ${FIELD_BASE} text-right tabular-nums`}
          />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>심사 근거 / 코멘트</span>
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="예: 공연 내용 및 시설 적합성 양호, 대관 일정 문제 없음"
            className={FIELD}
          />
        </label>
      </div>

      {review && (
        <p className="mt-3 text-xs tabular-nums text-muted">
          최종 결정: {new Date(review.decidedAt).toLocaleString("ko-KR")}
        </p>
      )}

      {conflict && review?.decision !== "APPROVED" && (
        <p className={`mt-4 ${ERROR_NOTE}`}>
          같은 주차에 이미 승인된 다른 업체(
          {conflict.companyName ?? "알 수 없음"})가 있어 승인할 수 없습니다. 먼저 기존 승인 건을 보류/거절로 변경해주세요.
        </p>
      )}

      {error && <p className={`mt-4 ${ERROR_NOTE}`}>{error}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!submitting || (!!conflict && review?.decision !== "APPROVED")}
          onClick={() => decide("APPROVED")}
          className={btnClass("primary", "md")}
        >
          {submitting === "APPROVED" ? "처리 중..." : "승인"}
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => decide("HOLD")}
          className={btnClass("outline", "md")}
        >
          {submitting === "HOLD" ? "처리 중..." : "보류"}
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => decide("REJECTED")}
          className={DANGER_BTN}
        >
          {submitting === "REJECTED" ? "처리 중..." : "거절"}
        </button>
      </div>
    </div>
  );
}
