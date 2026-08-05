"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractSignature, UserRole } from "@/lib/pricing/types";

export function ContractSignaturePanel({
  quoteId,
  signature,
  viewerRole,
}: {
  quoteId: string;
  signature: ContractSignature | null;
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mySigned = viewerRole === "ADMIN" ? signature?.venueSignedAt : signature?.applicantSignedAt;
  const bothSigned = !!signature?.venueSignedAt && !!signature?.applicantSignedAt;

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/signature`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "날인 처리에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!signature) {
    return (
      <div className="rounded border border-border bg-panel/60 p-6">
        <h3 className="text-[15px] font-semibold">전자 날인</h3>
        <p className="mt-2 text-[13px] text-muted">계약 확정 후 날인을 진행할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">전자 날인</h3>
        {bothSigned && (
          <span className="rounded-sm bg-good-soft px-2.5 py-1 text-[11px] font-medium text-good">
            양측 날인 완료
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 text-[12.5px]">
        <li className="flex items-center justify-between">
          <span className="text-muted">공연장(운영자)</span>
          <span className={signature.venueSignedAt ? "font-medium text-good" : "text-muted"}>
            {signature.venueSignedAt
              ? `날인 완료 · ${new Date(signature.venueSignedAt).toLocaleDateString("ko-KR")}`
              : "날인 대기"}
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-muted">대관사(신청자)</span>
          <span className={signature.applicantSignedAt ? "font-medium text-good" : "text-muted"}>
            {signature.applicantSignedAt
              ? `날인 완료 · ${new Date(signature.applicantSignedAt).toLocaleDateString("ko-KR")}`
              : "날인 대기"}
          </span>
        </li>
      </ul>

      {!mySigned && (
        <button
          type="button"
          disabled={busy}
          onClick={sign}
          className="mt-4 rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "처리 중..." : "날인하기"}
        </button>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
