"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";

interface AdjustmentRow {
  label: string;
  amount: number;
  reason: string;
}

export function ContractForm({ quoteId, baseTotal }: { quoteId: string; baseTotal: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [depositRate, setDepositRate] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractTotal = baseTotal + rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const requiredDeposit = Math.round((contractTotal * depositRate) / 100);

  function addRow() {
    setRows((prev) => [...prev, { label: "", amount: 0, reason: "" }]);
  }
  function updateRow(index: number, patch: Partial<AdjustmentRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustments: rows.filter((r) => r.label), depositRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "계약 확정에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-panel/60 p-6">
      <h3 className="text-[15px] font-semibold">② 심사·계약 — 조정 항목 입력</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        특약·할인 등 조정 항목을 추가하세요. 할인은 음수 금액으로 입력합니다.
      </p>

      <div className="mt-4 space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
            <input
              placeholder="조정 항목명 (예: 장기 계약 할인)"
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <input
              type="number"
              placeholder="금액 (할인은 음수)"
              value={row.amount || ""}
              onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
            />
            <input
              placeholder="사유"
              value={row.reason}
              onChange={(e) => updateRow(i, { reason: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="rounded-lg border border-border px-2.5 py-2 text-[12px] text-muted hover:text-red-600"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-border px-3 py-2 text-[12.5px] text-muted hover:border-accent hover:text-accent"
        >
          + 조정 항목 추가
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_140px]">
        <div>
          <div className="text-[13px] font-medium">보증금 비율</div>
          <div className="text-[11.5px] text-muted">계약금액 대비 보증금 비율 (계좌이체 확인 방식)</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={depositRate}
            onChange={(e) => setDepositRate(Number(e.target.value) || 0)}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
          />
          <span className="text-[13px] text-muted">%</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] text-muted">계약금액 (신청 예상금액 {won(baseTotal)} ± 조정)</div>
          <div className="text-[20px] font-semibold tabular-nums">{won(contractTotal)}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">
            보증금 요청액: <span className="font-medium text-foreground">{won(requiredDeposit)}</span>
          </div>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="rounded-md bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? "처리 중..." : "계약금액 확정"}
        </button>
      </div>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
