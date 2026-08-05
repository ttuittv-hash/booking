"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import type { InvoicePurpose, InvoiceStatus, TaxInvoice, UserRole } from "@/lib/pricing/types";

const STATUS_LABEL: Record<InvoiceStatus, { label: string; className: string }> = {
  PENDING: { label: "발행 대기", className: "bg-panel-strong text-muted" },
  ISSUED: { label: "발행됨 (입금 대기)", className: "bg-warn-soft text-warn" },
  REPORTED: { label: "입금신청됨", className: "bg-accent-soft text-accent" },
  PAID: { label: "입금 확인됨", className: "bg-good-soft text-good" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`rounded-sm px-2.5 py-1 text-[11px] font-medium ${s.className}`}>{s.label}</span>
  );
}

export function TaxInvoicePanel({
  quoteId,
  purpose,
  title,
  invoice,
  viewerRole,
}: {
  quoteId: string;
  purpose: InvoicePurpose;
  title: string;
  invoice: TaxInvoice | null;
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const [payerName, setPayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "issue" | "report" | "confirm") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, action, payerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "처리에 실패했습니다.");
        return;
      }
      setPayerName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <div className="rounded border border-border bg-panel/60 p-6">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-2 text-[13px] text-muted">해당 단계 확정 후 세금계산서 안내가 제공됩니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="mt-3 text-[13px] text-muted">
        금액 <span className="font-semibold text-foreground">{won(invoice.amount)}</span>
      </div>

      {invoice.status === "PENDING" && viewerRole === "ADMIN" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act("issue")}
          className="mt-4 rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          세금계산서 발행
        </button>
      )}
      {invoice.status === "PENDING" && viewerRole !== "ADMIN" && (
        <p className="mt-3 text-[12.5px] text-muted">운영자의 세금계산서 발행을 기다리고 있습니다.</p>
      )}

      {invoice.status === "ISSUED" && (
        <>
          <p className="mt-3 text-[12.5px] text-muted">
            발행일 {invoice.issuedAt && new Date(invoice.issuedAt).toLocaleDateString("ko-KR")}
          </p>
          {viewerRole !== "ADMIN" ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="입금자명"
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={busy || !payerName.trim()}
                onClick={() => act("report")}
                className="shrink-0 whitespace-nowrap rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                입금 신청
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] text-muted">신청자의 입금신청을 기다리고 있습니다.</p>
          )}
        </>
      )}

      {invoice.status === "REPORTED" && (
        <>
          <p className="mt-3 text-[12.5px] text-muted">
            입금자명 <span className="font-medium text-foreground">{invoice.payerName}</span> ·{" "}
            {invoice.reportedAt && new Date(invoice.reportedAt).toLocaleString("ko-KR")}
          </p>
          {viewerRole === "ADMIN" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("confirm")}
              className="mt-3 rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              입금 확인
            </button>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted">운영자의 입금 확인을 기다리고 있습니다.</p>
          )}
        </>
      )}

      {invoice.status === "PAID" && (
        <p className="mt-3 text-[12.5px] text-good">
          입금 확인됨 · {invoice.paidAt && new Date(invoice.paidAt).toLocaleString("ko-KR")}
        </p>
      )}

      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
