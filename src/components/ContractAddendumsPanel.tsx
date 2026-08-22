"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won, formatDate, formatDateTime } from "@/lib/format";
import type { ContractAddendum, UserRole } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/components/ui/Toast";

// 부속합의(계약 변경 이력) — 계약 체결 후 일정/공연 횟수 변경 등으로 금액이 달라질 때
// append-only로 쌓는다(2026-08-22 대관료 정산프로세스 반영). 계약금액(contractTotal)
// 자체는 바꾸지 않고, 부속합의를 반영한 참고 금액만 함께 보여준다.
export function ContractAddendumsPanel({
  quoteId,
  contractTotal,
  addendums,
  viewerRole,
}: {
  quoteId: string;
  contractTotal: number;
  addendums: ContractAddendum[];
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const toast = useToast();
  const [description, setDescription] = useState("");
  const [amountDelta, setAmountDelta] = useState(0);
  const [agreedAt, setAgreedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustedTotal = contractTotal + addendums.reduce((sum, a) => sum + a.amountDelta, 0);

  async function submit() {
    if (!description.trim()) {
      toast.error("변경 사유를 입력해 주세요.");
      return;
    }
    if (!agreedAt) {
      toast.error("부속합의 체결일을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/addendum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amountDelta, agreedAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
        return;
      }
      setDescription("");
      setAmountDelta(0);
      setAgreedAt("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
        부속합의
      </h3>
      <p className="mt-1.5 text-xs text-muted">
        일정·공연 횟수 변경 등으로 계약 내용이 달라질 때의 변경 이력입니다.
      </p>

      {addendums.length === 0 ? (
        <p className="mt-4 text-s text-muted">등록된 부속합의가 없습니다.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2 border-t border-border/25">
            {addendums.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/25 py-3 text-s">
                <div>
                  <span className="font-bold">{a.description}</span>
                  <span className="ml-2 text-xs text-muted tabular-nums">
                    체결일 {formatDate(a.agreedAt)} · 등록 {formatDateTime(a.createdAt)}
                  </span>
                </div>
                <span className={`tabular-nums font-bold ${a.amountDelta < 0 ? "text-danger" : ""}`}>
                  {a.amountDelta >= 0 ? "+" : ""}
                  {won(a.amountDelta)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-s">
            <span className="text-muted">부속합의 반영 참고 금액</span>
            <span className="font-bold tabular-nums">{won(adjustedTotal)}</span>
          </div>
        </>
      )}

      {viewerRole === "ADMIN" && (
        <div className="mt-6 border-t border-border/25 pt-5">
          <p className="text-xs font-bold text-muted">부속합의 등록</p>
          <div className="mt-3 flex flex-col gap-3">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="변경 사유 (예: 공연 1회 추가)"
              className="field-base"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <MoneyInput
                value={amountDelta}
                onChange={setAmountDelta}
                aria-label="금액 변동"
                className="field-base sm:w-48"
              />
              <input
                type="date"
                value={agreedAt}
                onChange={(e) => setAgreedAt(e.target.value)}
                aria-label="부속합의 체결일"
                className="field-base tabular-nums sm:w-52"
              />
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className={`${btnClass("primary", "md")} shrink-0`}
              >
                등록
              </button>
            </div>
            <p className="text-xs text-muted">금액이 늘면 양수, 줄면 음수로 입력하세요.</p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
