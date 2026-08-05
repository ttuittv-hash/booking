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
  SUB_TITLE,
} from "./adminUi";

interface Row {
  label: string;
  amount: number;
}

function RowEditor({
  title,
  hint,
  rows,
  onChange,
}: {
  title: string;
  hint: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  function addRow() {
    onChange([...rows, { label: "", amount: 0 }]);
  }
  function updateRow(i: number, patch: Partial<Row>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className={SUB_TITLE}>{title}</div>
      <p className={`mt-1 ${HELP}`}>{hint}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input
              placeholder="항목명"
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
              className={FIELD}
            />
            <input
              type="number"
              min={0}
              placeholder="금액"
              value={row.amount || ""}
              onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
              className={FIELD_NUM}
            />
            <button type="button" onClick={() => removeRow(i)} className={REMOVE_BTN}>
              삭제
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className={ADD_BTN}>
          + 항목 추가
        </button>
      </div>
    </div>
  );
}

export function SettlementForm({
  quoteId,
  contractTotal,
}: {
  quoteId: string;
  contractTotal: number;
}) {
  const router = useRouter();
  const [onSiteAdditions, setOnSiteAdditions] = useState<Row[]>([]);
  const [unusedDeductions, setUnusedDeductions] = useState<Row[]>([]);
  const [meteredActuals, setMeteredActuals] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sum = (rows: Row[]) => rows.reduce((s, r) => s + (r.amount || 0), 0);
  const finalTotal =
    contractTotal + sum(onSiteAdditions) - sum(unusedDeductions) + sum(meteredActuals);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onSiteAdditions: onSiteAdditions.filter((r) => r.label),
          unusedDeductions: unusedDeductions.filter((r) => r.label),
          meteredActuals: meteredActuals.filter((r) => r.label),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "정산 확정에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={PANEL}>
      <h3 className={SECTION_TITLE}>③ 정산 — 현장 반영</h3>
      <p className={`mt-2 ${HELP}`}>
        행사 후 현장 추가·미사용분과 유틸리티 실사용을 반영해 최종 정산금액을 확정합니다.
      </p>

      <div className="mt-5 space-y-6">
        <RowEditor
          title="현장 추가"
          hint="계약 이후 현장에서 추가된 항목"
          rows={onSiteAdditions}
          onChange={setOnSiteAdditions}
        />
        <RowEditor
          title="미사용 차감"
          hint="계약했으나 실제 사용하지 않은 항목"
          rows={unusedDeductions}
          onChange={setUnusedDeductions}
        />
        <RowEditor
          title="유틸리티 실사용 (전기·상하수도·냉난방)"
          hint="실사용량 기준 확정 금액"
          rows={meteredActuals}
          onChange={setMeteredActuals}
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-border/15 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={HELP}>
            최종 정산금액 (계약 {won(contractTotal)} + 현장추가 − 미사용 + 유틸리티)
          </div>
          <div className="type-display mt-1 text-h5-m tabular-nums sm:text-h5">{won(finalTotal)}</div>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className={btnClass("primary", "md")}
        >
          {submitting ? "처리 중..." : "최종 정산금액 확정"}
        </button>
      </div>
      {error && <p className={`mt-4 ${ERROR_NOTE}`}>{error}</p>}
    </div>
  );
}
