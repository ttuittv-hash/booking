"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus } from "@/lib/pricing/types";
import { ArrowRight, Badge, btnClass } from "@/components/ui/kit";
import { useDialog } from "@/components/ui/Dialog";
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
  REMOVE_BTN,
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

export function AdminQuoteTable({
  rows,
  canDelete = false,
}: {
  rows: AdminQuoteRow[];
  /** 삭제는 되돌릴 수 없어 PRO 등급 이상에게만 보인다(서버도 같은 선에서 막는다) */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * 신청서 삭제 (2026-09-02).
   *
   * 심사·계약금·계약·정산·첨부·이력이 함께 사라지고 되돌릴 수 없다. 회원 삭제와 같은
   * 방식으로 두 번 확인한다 — 두 번째는 신청번호를 그대로 받아친다(표에서 옆 행을
   * 잘못 누르는 사고가 실제로 계정 삭제에서 있었다).
   */
  async function remove(row: AdminQuoteRow) {
    const ok = await dialog.confirm(
      `신청서 ${row.id} (${row.companyName} · ${row.applicantName})를 삭제합니다.\n\n` +
        "심사 결과 · 계약금 · 계약 · 정산 · 첨부 · 처리 이력이 함께 지워지고 되돌릴 수 없습니다.\n" +
        "달력의 신청 현황에서도 빠집니다.\n\n계속할까요?",
      { title: "신청서 삭제", okLabel: "삭제" },
    );
    if (!ok) return;
    const typed = await dialog.prompt("정말 지우려면 신청번호를 그대로 입력하세요.", {
      title: "삭제 확인",
      okLabel: "삭제",
      placeholder: row.id,
    });
    if (typed !== row.id) return;

    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/quotes/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await dialog.alert(`신청서 ${row.id} 를 삭제했습니다.`);
        router.refresh();
      } else {
        await dialog.alert(data?.error ?? "삭제하지 못했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  }

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
                      <span className="flex items-center justify-end gap-3">
                        <Link href={`/admin/${row.id}`} className={ROW_LINK}>
                          상세
                          <ArrowRight />
                        </Link>
                        {canDelete && (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void remove(row)}
                          className={REMOVE_BTN}
                        >
                          {busyId === row.id ? "삭제 중..." : "삭제"}
                        </button>
                        )}
                      </span>
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
