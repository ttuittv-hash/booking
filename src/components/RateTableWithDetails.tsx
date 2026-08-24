"use client";

import { useState, type ReactNode } from "react";
import { ComparisonTable, type CompareColumn } from "@/components/ui/kit";
import type { RateColumn } from "@/lib/content/pageContent";

/**
 * RATE 표 + "Details" 토글 — 예전에는 표 두 개(RATE 본문 + Details 안의 상세 내역)를
 * 따로 그려서, 같은 열 제목(Rate A~D 등)이 헤더 행으로 두 번 찍혀 보였다
 * ("컬럼값이 두번 반복되는게 이상해", 2026-08-23). 표 하나에 Details를 누르면
 * 상세 행만 덧붙이는 방식으로 바꿔 헤더는 한 번만 나오게 한다.
 *
 * detailColumns는 columns와 별도로 관리되는 배열이라 순서가 어긋날 수 있어,
 * 열 제목(cols)의 key로 detailColumns를 찾아 셀 값을 맞춘다.
 */
export function RateTableWithDetails({
  cols,
  rowLabels,
  columns,
  detailLabels,
  detailColumns,
  footer,
  labelWidth,
}: {
  cols: CompareColumn[];
  rowLabels: string[];
  columns: RateColumn[];
  detailLabels: string[];
  detailColumns: RateColumn[];
  footer?: ReactNode;
  labelWidth?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const baseRows = rowLabels.map((label, i) => ({
    label,
    cells: columns.map((col) => col.values[i] ?? ""),
  }));
  const detailRows = detailLabels.map((label, i) => ({
    label,
    cells: cols.map((col) => detailColumns.find((dc) => dc.key === col.key)?.values[i] ?? ""),
  }));

  return (
    <div className="mt-10">
      <ComparisonTable
        rowLabel="구분"
        labelWidth={labelWidth}
        columns={cols}
        rows={detailsOpen ? [...baseRows, ...detailRows] : baseRows}
        footer={footer}
      />
      {detailRows.length > 0 && (
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center text-s font-bold sm:min-h-0"
        >
          {detailsOpen ? "Details ▲" : "Details ▼"}
        </button>
      )}
    </div>
  );
}
