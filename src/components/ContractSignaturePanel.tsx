"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractSignature, UserRole } from "@/lib/pricing/types";
import { Badge, SpecTable, btnClass } from "@/components/ui/kit";

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
      <div>
        {/* AttachmentsPanel 과 헤딩 규격을 맞춘다 (2px 룰 + type-kr-heading) */}
        <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
          전자 날인
        </h3>
        <p className="mt-3 text-s text-muted">계약 확정 후 날인을 진행할 수 있습니다.</p>
      </div>
    );
  }

  const rows: [string, string][] = [
    [
      "공연장(운영자)",
      signature.venueSignedAt
        ? `날인 완료 · ${new Date(signature.venueSignedAt).toLocaleDateString("ko-KR")}`
        : "날인 대기",
    ],
    [
      "대관사(신청자)",
      signature.applicantSignedAt
        ? `날인 완료 · ${new Date(signature.applicantSignedAt).toLocaleDateString("ko-KR")}`
        : "날인 대기",
    ],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">전자 날인</h3>
        {bothSigned && <Badge tone="good">양측 날인 완료</Badge>}
      </div>

      <SpecTable rows={rows} className="mt-5" />

      {!mySigned && (
        <button
          type="button"
          disabled={busy}
          onClick={sign}
          className={`${btnClass("primary", "md")} mt-5`}
        >
          {busy ? "처리 중..." : "날인하기"}
        </button>
      )}
      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
