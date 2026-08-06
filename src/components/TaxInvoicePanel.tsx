"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import type { InvoicePurpose, InvoiceStatus, TaxInvoice, UserRole } from "@/lib/pricing/types";
import { Badge, SpecTable, btnClass } from "@/components/ui/kit";

/** 입력 필드 — ProfileForm 의 FIELD 와 동일 규격 (샤프 · border-soft · 옐로 아웃라인) */
const FIELD =
  "w-full border border-border-soft bg-surface px-3.5 py-2.5 text-s text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent";

type BadgeTone = "neutral" | "warn" | "accent" | "good";

const STATUS_META: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "발행 대기", tone: "neutral" },
  ISSUED: { label: "발행됨 (입금 대기)", tone: "warn" },
  REPORTED: { label: "입금신청됨", tone: "accent" },
  PAID: { label: "입금 확인됨", tone: "good" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_META[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
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
      <div>
        <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
          {title}
        </h3>
        <p className="mt-3 text-s text-muted">해당 단계 확정 후 세금계산서 안내가 제공됩니다.</p>
      </div>
    );
  }

  const rows: [string, string][] = [["금액", won(invoice.amount)]];
  if (invoice.status === "ISSUED" && invoice.issuedAt) {
    rows.push(["발행일", new Date(invoice.issuedAt).toLocaleDateString("ko-KR")]);
  }
  if (invoice.status === "REPORTED") {
    rows.push([
      "입금자명",
      [invoice.payerName, invoice.reportedAt && new Date(invoice.reportedAt).toLocaleString("ko-KR")]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (invoice.status === "PAID" && invoice.paidAt) {
    rows.push(["입금 확인", new Date(invoice.paidAt).toLocaleString("ko-KR")]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">{title}</h3>
        <StatusBadge status={invoice.status} />
      </div>

      <SpecTable rows={rows} className="mt-5" />

      {invoice.status === "PENDING" && viewerRole === "ADMIN" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act("issue")}
          className={`${btnClass("primary", "md")} mt-5`}
        >
          세금계산서 발행
        </button>
      )}
      {invoice.status === "PENDING" && viewerRole !== "ADMIN" && (
        <p className="mt-4 text-s text-muted">운영자의 세금계산서 발행을 기다리고 있습니다.</p>
      )}

      {invoice.status === "ISSUED" &&
        (viewerRole !== "ADMIN" ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="입금자명"
              aria-label="입금자명"
              className={FIELD}
            />
            <button
              type="button"
              disabled={busy || !payerName.trim()}
              onClick={() => act("report")}
              className={`${btnClass("primary", "md")} shrink-0`}
            >
              입금 신청
            </button>
          </div>
        ) : (
          <p className="mt-4 text-s text-muted">신청자의 입금신청을 기다리고 있습니다.</p>
        ))}

      {invoice.status === "REPORTED" &&
        (viewerRole === "ADMIN" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => act("confirm")}
            className={`${btnClass("primary", "md")} mt-5`}
          >
            입금 확인
          </button>
        ) : (
          <p className="mt-4 text-s text-muted">운영자의 입금 확인을 기다리고 있습니다.</p>
        ))}

      {invoice.status === "PAID" && <p className="mt-4 text-s text-good">입금 확인됨</p>}

      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
