"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractSignature, UserRole } from "@/lib/pricing/types";
import { Badge, Note, SpecTable, btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

// 계약 확인사항 초안 — 법무 검토 전. 정식 대관계약서(대관 규약)가 확정되면 그 내용으로
// 교체해야 한다. 기능정의서 "약관" 시트 구간4(K-1~K-6)에 같은 내용이 정리되어 있다.
const CONTRACT_TERMS = [
  {
    title: "대관 목적물 및 기간",
    body: "본 계약은 위에 표시된 확정 계약금액과 신청 시 확정된 대관 일정(준비일·공연일)을 기준으로 하며, 대관 목적물은 신청서에 명시된 공간으로 한다.",
  },
  {
    title: "대관료 및 정산",
    body: "계약금액은 상기 확정 금액을 기준으로 하며, 전기·상하수도·냉난방 등 유틸리티 비용은 실사용량 기준으로 정산 단계에서 별도 정산한다. 계약금·보증금 납부 및 세금계산서 발행은 이 시스템에 안내되는 절차와 기한에 따른다.",
  },
  {
    title: "취소 및 위약금",
    body: "계약 체결(전자 날인 완료) 이후 대관사의 귀책사유로 계약을 해제·취소하는 경우, 서울아레나 대관 규약 및 개별 특약에서 정하는 위약금이 발생할 수 있다.",
  },
  {
    title: "시설 이용수칙 준수",
    body: "대관사는 서울아레나가 정한 시설 이용수칙 및 안전관리 규정을 준수해야 하며, 위반 시 대관이 제한되거나 계약이 해제될 수 있다.",
  },
  {
    title: "손해배상",
    body: "대관 기간 중 대관사(공연 관계자, 관객 포함)의 귀책사유로 시설·설비에 손해가 발생한 경우 대관사가 그 손해를 배상한다.",
  },
  {
    title: "분쟁해결",
    body: "본 확인사항 및 계약과 관련한 분쟁은 이용약관 제10조(분쟁해결)를 따른다.",
  },
];

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
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const mySigned = viewerRole === "ADMIN" ? signature?.venueSignedAt : signature?.applicantSignedAt;
  const bothSigned = !!signature?.venueSignedAt && !!signature?.applicantSignedAt;

  async function sign() {
    if (!agreed) {
      toast.error("계약 내용 확인에 동의해 주세요.");
      return;
    }
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
        <div className="mt-5">
          {/* 색면 박스 대신 헤어라인 + 작은 글씨 (Note 규격) */}
          <Note>계약 확인사항 (초안 — 정식 대관계약서 확정 전 요약)</Note>
          <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs leading-5 text-muted">
            {CONTRACT_TERMS.map((term, i) => (
              <li key={term.title}>
                <span className="font-bold text-foreground">
                  {i + 1}. {term.title}
                </span>{" "}
                {term.body}
              </li>
            ))}
          </ol>
          <label className="mt-4 flex cursor-pointer items-start gap-2 text-s">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-foreground"
            />
            위 계약 확인사항을 모두 확인하였으며 이에 동의합니다.
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={sign}
            className={`${btnClass("primary", "md")} mt-5`}
          >
            {busy ? "처리 중..." : "날인하기"}
          </button>
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
