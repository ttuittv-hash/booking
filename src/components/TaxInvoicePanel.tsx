"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won, formatDate, formatDateTime } from "@/lib/format";
import type { InvoicePurpose, InvoiceStatus, TaxInvoice, UserRole } from "@/lib/pricing/types";
import { Badge, SpecTable, btnClass } from "@/components/ui/kit";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/components/ui/Toast";

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
  // 잔금(CONTRACT_BALANCE)처럼 계약 확정 시점에 자동으로 만들어지지 않는 청구서는,
  // 운영자가 금액을 정해 직접 만든다(2026-08-22 대관료 정산프로세스 반영) — 계약금처럼
  // 자동 생성되는 목적(CONTRACT/SETTLEMENT)에는 이 프롭을 넘기지 않는다.
  allowCreate = false,
}: {
  quoteId: string;
  purpose: InvoicePurpose;
  title: string;
  invoice: TaxInvoice | null;
  viewerRole: UserRole;
  allowCreate?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [payerName, setPayerName] = useState("");
  const [createAmount, setCreateAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "issue" | "report" | "confirm" | "create", amount?: number) {
    if (action === "report" && !payerName.trim()) {
      toast.error("입금자명을 입력해 주세요.");
      return;
    }
    if (action === "create" && (!amount || amount <= 0)) {
      toast.error("청구 금액을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, action, payerName, amount }),
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
        {allowCreate && viewerRole === "ADMIN" ? (
          <>
            <p className="mt-3 text-s text-muted">청구할 금액을 정해 청구서를 만드세요.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <MoneyInput
                value={createAmount}
                onChange={setCreateAmount}
                aria-label={`${title} 금액`}
                className="field-base"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => act("create", createAmount)}
                className={`${btnClass("primary", "md")} shrink-0`}
              >
                청구서 만들기
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-s text-muted">해당 단계 확정 후 세금계산서 안내가 제공됩니다.</p>
        )}
        {error && (
          <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const rows: [string, string][] = [["금액", won(invoice.amount)]];
  if (invoice.status === "ISSUED" && invoice.issuedAt) {
    rows.push(["발행일", formatDate(invoice.issuedAt)]);
  }
  if (invoice.status === "REPORTED") {
    rows.push([
      "입금자명",
      [invoice.payerName, invoice.reportedAt && formatDateTime(invoice.reportedAt)]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (invoice.status === "PAID" && invoice.paidAt) {
    rows.push(["입금 확인", formatDateTime(invoice.paidAt)]);
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
              className="field-base"
            />
            <button
              type="button"
              disabled={busy}
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
