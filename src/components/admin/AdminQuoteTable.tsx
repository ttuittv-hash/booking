"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus } from "@/lib/pricing/types";
import { ArrowRight, Badge, btnClass } from "@/components/ui/kit";
import {
  ROW_LINK,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_ACTIONS,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TD_EMPTY,
  TD_ID,
  TD_LINK,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  TR_HOVER,
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
    <div className={TABLE_CARD}>
      {/* Table / 1 헤더 행 — 좌: 제목 + 한 줄 설명 / 우: secondary + primary */}
      <div className={TABLE_HEAD}>
        <div>
          <p className={TABLE_HEAD_TITLE}>신청 목록 ({rows.length})</p>
          <p className={TABLE_HEAD_DESC}>
            {selected.size > 0
              ? `${selected.size}건 선택됨 — 같은 주차를 두고 경합 중인 신청서를 나란히 비교하세요.`
              : "행을 선택하면 신청서를 나란히 비교할 수 있습니다."}
          </p>
        </div>
        <div className={TABLE_HEAD_ACTIONS}>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
            className={btnClass("secondary", "sm")}
          >
            선택 해제
          </button>
          <button
            type="button"
            disabled={selected.size < 2}
            onClick={compare}
            className={btnClass("primary", "sm")}
          >
            선택 항목 비교 ({selected.size})
          </button>
        </div>
      </div>

      <div className={TABLE_SCROLL}>
        <table className={`${TABLE} min-w-[960px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={`${TH} w-10`} />
              <th className={TH}>신청번호</th>
              <th className={TH_NUM}>신청일시</th>
              <th className={TH}>신청자</th>
              <th className={TH}>회사</th>
              <th className={TH}>주차</th>
              <th className={TH_NUM}>관객 (명)</th>
              <th className={TH_NUM}>신청 예상금액 (₩)</th>
              <th className={TH}>상태</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className={TD_EMPTY}>
                  아직 접수된 신청서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={isSelected ? `${TR} bg-accent/15` : TR_HOVER}
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
                    <td className={`${TD_ID} tabular-nums`}>{row.id}</td>
                    <td className={`${TD_NUM} text-muted`}>{row.createdAtLabel}</td>
                    <td className={TD}>{row.applicantName}</td>
                    <td className={TD_MUTED}>{row.companyName}</td>
                    <td className={`${TD} tabular-nums`}>{row.weekLabel}</td>
                    <td className={TD_NUM}>{row.audienceLabel}</td>
                    <td className={`${TD_NUM} font-bold`}>{row.totalLabel}</td>
                    <td className={TD}>
                      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </td>
                    <td className={TD_LINK}>
                      <Link href={`/admin/${row.id}`} className={ROW_LINK}>
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
