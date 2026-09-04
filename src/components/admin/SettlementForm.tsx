"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import type { AddonItem, LineItem } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import {
  ADD_BTN,
  ERROR_NOTE,
  FIELD,
  FIELD_NUM,
  FIELD_SM,
  HELP,
  PANEL,
  REMOVE_BTN,
  SECTION_TITLE,
  SUB_TITLE,
} from "./adminUi";

interface Row {
  label: string;
  amount: number;
  /** 요금표 항목 또는 이 신청서의 산출내역에서 끌어온 경우의 출처 id — 직접 입력한 항목은 없음 */
  addonId?: string;
}

interface PickerOption {
  id: string;
  label: string;
  amount: number;
}

/**
 * "요금표/산출내역에서 선택" 드롭다운 — 자유 입력 대신 이미 있는 항목을 찾아서 끌어올 수
 * 있게 한다(2026-08-22 요청). 검색어로 걸러진 목록에서 고르면 항목명·금액이 채워진 새
 * 줄이 추가된다.
 */
function ItemPicker({ label, options, onPick }: { label: string; options: PickerOption[]; onPick: (opt: PickerOption) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  if (options.length === 0) return null;

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div
      className="relative inline-block"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className={btnClass("secondary", "sm")}>
        {label}
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-72 rounded-surface border border-border bg-panel shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="항목 검색"
            className={`${FIELD_SM} w-full border-x-0 border-t-0`}
          />
          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-muted">검색 결과가 없습니다.</li>}
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(o);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-background"
                >
                  <span className="truncate">{o.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">{won(o.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RowEditor({
  title,
  hint,
  rows,
  onChange,
  pickerLabel,
  pickerOptions,
}: {
  title: string;
  hint: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  pickerLabel: string;
  pickerOptions: PickerOption[];
}) {
  function addRow() {
    onChange([...rows, { label: "", amount: 0 }]);
  }
  function addRowFromPicker(opt: PickerOption) {
    onChange([...rows, { label: opt.label, amount: opt.amount, addonId: opt.id }]);
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
              onChange={(e) => updateRow(i, { label: e.target.value, addonId: undefined })}
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addRow} className={ADD_BTN}>
            + 항목 추가
          </button>
          <ItemPicker label={pickerLabel} options={pickerOptions} onPick={addRowFromPicker} />
        </div>
      </div>
    </div>
  );
}

export function SettlementForm({
  quoteId,
  contractTotal,
  addons,
  lineItems,
}: {
  quoteId: string;
  contractTotal: number;
  /** 요금표 전체 항목 — 현장 추가·유틸리티 실사용을 여기서 찾아 끌어올 수 있다 */
  addons: AddonItem[];
  /** 이 신청서가 실제로 계약한 내역 — 미사용 차감은 계약에 없던 항목을 끌어올 이유가 없어 여기서만 고른다 */
  lineItems: LineItem[];
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

  const rateTableOptions: PickerOption[] = addons.map((a) => ({ id: a.id, label: a.name, amount: a.unitPrice }));
  const meteredOptions = rateTableOptions.filter((_, i) => addons[i].billingPhase === "SETTLEMENT");
  // 기본 대관료(BASE_FEE)는 "계약했으나 안 쓴 항목"으로 차감할 대상이 아니라 제외한다.
  const contractedOptions: PickerOption[] = lineItems
    .filter((li) => li.addonId !== "BASE_FEE")
    .map((li) => ({ id: li.addonId, label: li.label, amount: li.amount }));

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
          pickerLabel="요금표에서 선택"
          pickerOptions={rateTableOptions}
        />
        <RowEditor
          title="미사용 차감"
          hint="계약했으나 실제 사용하지 않은 항목"
          rows={unusedDeductions}
          onChange={setUnusedDeductions}
          pickerLabel="계약 내역에서 선택"
          pickerOptions={contractedOptions}
        />
        <RowEditor
          title="유틸리티 실사용 (전기·상하수도·냉난방)"
          hint="실사용량 기준 확정 금액"
          rows={meteredActuals}
          onChange={setMeteredActuals}
          pickerLabel="요금표에서 선택"
          pickerOptions={meteredOptions}
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-border/25 pt-5 sm:flex-row sm:items-end sm:justify-between">
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
