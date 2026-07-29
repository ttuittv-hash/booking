"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import type { Deposit } from "@/lib/pricing/types";

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
  const [depositorName, setDepositorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deposit) {
    return (
      <div className="rounded-md border border-border bg-panel/60 p-6">
        <h3 className="text-[15px] font-semibold">보증금</h3>
        <p className="mt-1.5 text-[13px] text-muted">계약 확정 후 보증금 안내가 제공됩니다.</p>
      </div>
    );
  }

  async function report() {
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
    <div className="rounded-md border border-border bg-panel/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">보증금</h3>
        <StatusBadge status={deposit.status} />
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        계약금액의 {deposit.depositRate}% · 요청금액{" "}
        <span className="font-semibold text-foreground">{won(deposit.requiredAmount)}</span>
      </p>

      {deposit.status === "PENDING" && viewerRole === "APPLICANT" && (
        <div className="mt-4 space-y-3">
          <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-[12.5px] text-warn">
            {PLACEHOLDER_BANK_INFO}
          </p>
          <div className="flex gap-2">
            <input
              placeholder="입금자명"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={submitting || !depositorName.trim()}
              onClick={report}
              className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? "처리 중..." : "입금 신청"}
            </button>
          </div>
        </div>
      )}

      {deposit.status === "PENDING" && viewerRole === "ADMIN" && (
        <p className="mt-4 text-[12.5px] text-muted">신청자의 입금신청을 기다리고 있습니다.</p>
      )}

      {deposit.status === "REPORTED" && (
        <div className="mt-4 space-y-2">
          <p className="text-[12.5px] text-muted">
            입금자명 <span className="font-medium text-foreground">{deposit.depositorName}</span> ·{" "}
            {deposit.reportedAt && new Date(deposit.reportedAt).toLocaleString("ko-KR")} 입금신청됨
          </p>
          {viewerRole === "ADMIN" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={confirm}
              className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? "처리 중..." : "입금 확인"}
            </button>
          ) : (
            <p className="text-[12.5px] text-muted">운영자 입금 확인을 기다리고 있습니다.</p>
          )}
        </div>
      )}

      {deposit.status === "CONFIRMED" && (
        <p className="mt-4 text-[12.5px] text-good">
          {deposit.confirmedAt && new Date(deposit.confirmedAt).toLocaleString("ko-KR")} 입금 확인 완료
        </p>
      )}

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: Deposit["status"] }) {
  const label = { PENDING: "입금 대기", REPORTED: "입금신청됨", CONFIRMED: "입금 확인됨" }[status];
  const style = {
    PENDING: "bg-warn-soft text-warn",
    REPORTED: "bg-accent-soft text-accent",
    CONFIRMED: "bg-good-soft text-good",
  }[status];
  return (
    <span className={`rounded px-2.5 py-1 text-[11.5px] font-medium ${style}`}>{label}</span>
  );
}
