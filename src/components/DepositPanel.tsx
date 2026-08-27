"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won, formatDateTime } from "@/lib/format";
import type { Deposit } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

const PLACEHOLDER_BANK_INFO = "예시은행 000-0000-0000-00 (예금주: 서울아레나) — 실제 확정 계좌로 교체 필요";

export function DepositPanel({
  quoteId,
  deposit,
  viewerRole,
}: {
  quoteId: string;
  deposit: Deposit | null;
  viewerRole: "ADMIN" | "APPLICANT";
}) {
  const router = useRouter();
  const toast = useToast();
  const [depositorName, setDepositorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deposit) {
    return (
      <div>
        {/* 같은 행의 AttachmentsPanel 과 헤딩 규격을 맞춘다 (2px 룰 + type-kr-heading) */}
        <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
          계약금
        </h3>
        <p className="mt-3 text-s text-muted">계약 확정 후 계약금 안내가 제공됩니다.</p>
      </div>
    );
  }

  async function report() {
    if (!depositorName.trim()) {
      toast.error("입금자명을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", depositorName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "입금신청에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "입금확인에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">계약금</h3>
        <StatusBadge status={deposit.status} />
      </div>
      <p className="mt-3 text-s text-muted">
        계약금액의 {deposit.depositRate}% · 요청금액{" "}
        <b className="tabular-nums text-foreground">{won(deposit.requiredAmount)}</b>
      </p>

      {deposit.status === "PENDING" && viewerRole === "APPLICANT" && (
        <div className="mt-5 space-y-3">
          <p className="border-l-2 border-accent bg-warn-soft px-4 py-2.5 text-xs leading-5 text-muted-strong">
            {PLACEHOLDER_BANK_INFO}
          </p>
          <div className="flex gap-2">
            <input
              placeholder="입금자명"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              aria-label="입금자명"
              className="field-base"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={report}
              className={`${btnClass("primary", "md")} shrink-0`}
            >
              {submitting ? "처리 중..." : "입금 신청"}
            </button>
          </div>
        </div>
      )}

      {deposit.status === "PENDING" && viewerRole === "ADMIN" && (
        <p className="mt-5 text-s text-muted">신청자의 입금신청을 기다리고 있습니다.</p>
      )}

      {deposit.status === "REPORTED" && (
        <div className="mt-5 space-y-3">
          <p className="text-s text-muted">
            입금자명 <b className="text-foreground">{deposit.depositorName}</b> ·{" "}
            {deposit.reportedAt && formatDateTime(deposit.reportedAt)} 입금신청됨
          </p>
          {viewerRole === "ADMIN" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={confirm}
              className={btnClass("primary", "md")}
            >
              {submitting ? "처리 중..." : "입금 확인"}
            </button>
          ) : (
            <p className="text-s text-muted">운영자 입금 확인을 기다리고 있습니다.</p>
          )}
        </div>
      )}

      {deposit.status === "CONFIRMED" && (
        <p className="mt-5 text-s text-good">
          {deposit.confirmedAt && formatDateTime(deposit.confirmedAt)} 입금 확인 완료
        </p>
      )}

      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Deposit["status"] }) {
  const label = { PENDING: "입금 대기", REPORTED: "입금신청됨", CONFIRMED: "입금 확인됨" }[status];
  const tone = { PENDING: "warn", REPORTED: "accent", CONFIRMED: "good" }[status] as
    | "warn"
    | "accent"
    | "good";
  return <Badge tone={tone}>{label}</Badge>;
}
