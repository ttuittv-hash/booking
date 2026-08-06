"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import {
  ADD_BTN,
  ERROR_NOTE,
  FIELD,
  FIELD_NUM,
  HELP,
  PANEL,
  REMOVE_BTN,
  SECTION_TITLE,
} from "./adminUi";

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
    <div className={PANEL}>
      <h3 className={SECTION_TITLE}>② 심사·계약 — 조정 항목 입력</h3>
      <p className={`mt-2 ${HELP}`}>
        특약·할인 등 조정 항목을 추가하세요. 할인은 음수 금액으로 입력합니다.
      </p>

      <div className="mt-5 space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
            <input
              placeholder="조정 항목명 (예: 장기 계약 할인)"
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
              className={FIELD}
            />
            <input
              type="number"
              placeholder="금액 (할인은 음수)"
              value={row.amount || ""}
              onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
              className={FIELD_NUM}
            />
            <input
              placeholder="사유"
              value={row.reason}
              onChange={(e) => updateRow(i, { reason: e.target.value })}
              className={FIELD}
            />
            <button type="button" onClick={() => removeRow(i)} className={REMOVE_BTN}>
              삭제
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className={ADD_BTN}>
          + 조정 항목 추가
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 items-center gap-3 border-t border-border/15 pt-5 sm:grid-cols-[1fr_140px]">
        <div>
          <div className="text-s font-bold">보증금 비율</div>
          <div className={HELP}>계약금액 대비 보증금 비율 (계좌이체 확인 방식)</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={depositRate}
            onChange={(e) => setDepositRate(Number(e.target.value) || 0)}
            className={`w-20 ${FIELD} text-right tabular-nums`}
          />
          <span className="text-s text-muted">%</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-border/15 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={HELP}>계약금액 (신청 예상금액 {won(baseTotal)} ± 조정)</div>
          <div className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">{won(contractTotal)}</div>
          <div className={`mt-1.5 ${HELP}`}>
            보증금 요청액: <span className="font-bold tabular-nums text-foreground">{won(requiredDeposit)}</span>
          </div>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className={btnClass("primary", "md")}
        >
          {submitting ? "처리 중..." : "계약금액 확정"}
        </button>
      </div>
      {error && <p className={`mt-4 ${ERROR_NOTE}`}>{error}</p>}
    </div>
  );
}
