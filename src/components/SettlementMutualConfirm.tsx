"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settlement, UserRole } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { formatDateTime } from "@/lib/format";

export function SettlementMutualConfirm({
  quoteId,
  settlement,
  viewerRole,
}: {
  quoteId: string;
  settlement: Settlement;
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/settlement/mutual-confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "확인 처리에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (settlement.mutualConfirmedAt) {
    return (
      <p className="mt-4 text-s text-good">
        상호 확인 완료 · {formatDateTime(settlement.mutualConfirmedAt)}
      </p>
    );
  }

  if (viewerRole === "ADMIN") {
    return <p className="mt-4 text-s text-muted">신청자의 정산 내역 확인을 기다리고 있습니다.</p>;
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={busy}
        onClick={confirm}
        className={btnClass("primary", "md")}
      >
        정산 내역 확인
      </button>
      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
