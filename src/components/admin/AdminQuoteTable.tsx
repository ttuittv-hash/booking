"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus } from "@/lib/pricing/types";
import { ArrowRight, Badge, btnClass } from "@/components/ui/kit";
import {
  TABLE,
  TABLE_WRAP,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "./adminUi";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

/** 상태 색은 kit 의 Badge tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<QuoteStatus, "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
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
        /* 옐로 면 + 검정 텍스트 (대비 약 14:1) */
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-foreground bg-accent px-4 py-2.5 text-s text-on-accent">
          <span className="font-bold tabular-nums">{selected.size}건 선택됨</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={selected.size < 2}
              onClick={compare}
              className={btnClass("outline", "sm")}
            >
              선택 항목 비교 ({selected.size})
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-bold hover:underline"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      <div className={TABLE_WRAP}>
        <table className={`${TABLE} min-w-[960px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={`${TH} w-10`} />
              <th className={TH}>신청번호</th>
              <th className={TH}>신청일시</th>
              <th className={TH}>신청자</th>
              <th className={TH}>회사</th>
              <th className={TH}>주차</th>
              <th className={TH_NUM}>관객</th>
              <th className={TH_NUM}>신청 예상금액</th>
              <th className={TH}>상태</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-s text-muted">
                  아직 접수된 신청서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`${TR} transition-colors ${
                      isSelected ? "bg-accent/15" : "hover:bg-foreground/[0.03]"
                    }`}
                  >
                    <td className={TD}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(row.id)}
                        aria-label={`${row.id} 비교 선택`}
                        className="accent-accent"
                      />
                    </td>
                    <td className={`${TD} font-bold tabular-nums`}>{row.id}</td>
                    <td className={`${TD} tabular-nums text-muted`}>{row.createdAtLabel}</td>
                    <td className={TD}>{row.applicantName}</td>
                    <td className={`${TD} text-muted`}>{row.companyName}</td>
                    <td className={`${TD} tabular-nums`}>{row.weekLabel}</td>
                    <td className={TD_NUM}>{row.audienceLabel}</td>
                    <td className={`${TD_NUM} font-bold`}>{row.totalLabel}</td>
                    <td className={TD}>
                      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </td>
                    <td className={`${TD} text-right`}>
                      <Link
                        href={`/admin/${row.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-muted-strong"
                      >
                        상세
                        <ArrowRight />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
