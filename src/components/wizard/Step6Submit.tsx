"use client";

import Link from "next/link";
import { won } from "@/lib/format";
import { findPackage } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";

const STAGES = [
  {
    no: "STEP ①",
    title: "신청 예상금액",
    desc: "지금 계산된 금액. 패키지+옵션 자동 산출. \"예상\"임을 명시.",
  },
  {
    no: "STEP ②",
    title: "계약금액",
    desc: "관리자 심사·협의·특약 반영 후 확정. 조정 내역 표기.",
  },
  {
    no: "STEP ③",
    title: "최종 정산금액",
    desc: "행사 후 현장 추가·미사용·유틸리티 실사용 반영한 실청구액.",
  },
];

export function Step6Submit({
  rateTable,
  quote,
  selection,
  isLoggedIn,
  submitting,
  submittedId,
  error,
  onSubmit,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
  isLoggedIn: boolean;
  submitting: boolean;
  submittedId: string | null;
  error: string | null;
  onSubmit: () => void;
}) {
  const pkg = findPackage(rateTable, selection.packageId);

  if (!pkg) {
    return (
      <section className="rounded-2xl border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">
          먼저 1단계에서 패키지를 선택하세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">6. 신청서 제출</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        아래 산출내역으로 대관 신청서가 생성됩니다. 신청금액은 예상금액이며,
        이후 심사·계약에서 확정됩니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-panel/60 p-6">
        <div>
          <div className="text-[15px] font-semibold">
            {pkg.name} · {pkg.audienceTier.label}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {selection.week.year}년 {selection.week.month}월{" "}
            {selection.week.weekOfMonth}주차 · {1 + selection.extraWeeks}주 ·
            관객 {selection.expectedAudience.toLocaleString()}명
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">신청 예상금액 (VAT 포함)</div>
          <div className="text-[26px] font-semibold tabular-nums">
            {won(quote.total)}
          </div>
        </div>
      </div>

      {submittedId ? (
        <div className="mt-5 rounded-xl border border-good/30 bg-good-soft px-4 py-3.5 text-[13.5px] text-good">
          신청서가 생성되었습니다. 신청번호{" "}
          <b className="font-semibold">{submittedId}</b> · 상태: 예상견적
          (ESTIMATE). 관리자 심사 → 계약 → 정산 순으로 진행됩니다.
        </div>
      ) : !isLoggedIn ? (
        <div className="mt-5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3.5 text-[13.5px] text-warn">
          신청서를 제출하려면 로그인이 필요합니다. 지금까지 입력한 내용은
          그대로 유지되니, 로그인 후 이어서 제출할 수 있습니다.{" "}
          <Link href="/login" className="font-semibold underline">
            로그인
          </Link>{" "}
          ·{" "}
          <Link href="/register" className="font-semibold underline">
            회원가입
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="mt-5 rounded-full bg-accent px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? "제출 중..." : "신청서 생성"}
          </button>
          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
        </>
      )}

      <h3 className="mt-10 text-[16px] font-semibold">대관료 확정 3단계</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAGES.map((s) => (
          <div key={s.no} className="rounded-xl border border-border bg-panel/60 p-4">
            <div className="text-[11px] font-semibold text-accent">{s.no}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">{s.title}</div>
            <p className="mt-1.5 text-[12px] leading-5 text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
