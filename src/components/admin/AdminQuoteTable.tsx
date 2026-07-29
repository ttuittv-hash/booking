"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus } from "@/lib/pricing/types";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

const STATUS_STYLE: Record<QuoteStatus, string> = {
  ESTIMATE: "bg-warn-soft text-warn",
  CONTRACTED: "bg-accent-soft text-accent",
  SETTLED: "bg-good-soft text-good",
};

export interface AdminQuoteRow {
  id: string;
  createdAtLabel: string;
  applicantName: string;
  companyName: string;
  weekLabel: string;
  audienceLabel: string;
  totalLabel: string;
  status: QuoteStatus;
}

export function AdminQuoteTable({ rows }: { rows: AdminQuoteRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function compare() {
    router.push(`/admin/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-sm border border-accent/30 bg-accent-soft px-4 py-2.5 text-[13px] text-accent">
          <span>{selected.size}건 선택됨</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selected.size < 2}
              onClick={compare}
              className="rounded-sm bg-accent px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              선택 항목 비교 ({selected.size})
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="hover:underline">
              선택 해제
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[960px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">신청번호</th>
              <th className="px-4 py-3">신청일시</th>
              <th className="px-4 py-3">신청자</th>
              <th className="px-4 py-3">회사</th>
              <th className="px-4 py-3">주차</th>
              <th className="px-4 py-3">관객</th>
              <th className="px-4 py-3 text-right">신청 예상금액</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  아직 접수된 신청서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`${row.id} 비교 선택`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{row.id}</td>
                  <td className="px-4 py-3 text-muted">{row.createdAtLabel}</td>
                  <td className="px-4 py-3">{row.applicantName}</td>
                  <td className="px-4 py-3 text-muted">{row.companyName}</td>
                  <td className="px-4 py-3">{row.weekLabel}</td>
                  <td className="px-4 py-3">{row.audienceLabel}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.totalLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2.5 py-1 text-[11.5px] font-medium ${STATUS_STYLE[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/${row.id}`} className="font-medium text-accent hover:underline">
                      상세 →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
