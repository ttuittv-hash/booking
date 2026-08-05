"use client";

import Link from "next/link";
import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { Label, btnClass } from "@/components/ui/kit";

const STAGES = [
  {
    no: "STEP ①",
    title: "패키지 선택",
    desc: "공연 일정과 관객 규모에 맞는 대관 패키지를 선택합니다.",
  },
  {
    no: "STEP ②",
    title: "구성과 대관료 확인",
    desc: "포함 항목과 부대시설을 구성하고, 예상 대관료를 확인합니다.",
  },
  {
    no: "STEP ③",
    title: "신청 제출",
    desc: "입력한 내용으로 대관 신청서를 접수합니다.",
  },
  {
    no: "STEP ④",
    title: "심사",
    desc: "운영자가 일정·공연 내용·시설 적합성 등을 종합적으로 검토합니다.",
  },
  {
    no: "STEP ⑤",
    title: "심사 결과 안내",
    desc: "승인·보류·거절 결과와 사유를 알림으로 안내해 드립니다.",
  },
];

export function Step6Submit({
  rateTable,
  quote,
  selection,
  isLoggedIn,
  isEditing = false,
  submitting,
  submittedId,
  error,
  onSubmit,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
  isLoggedIn: boolean;
  isEditing?: boolean;
  submitting: boolean;
  submittedId: string | null;
  error: string | null;
  onSubmit: () => void;
}) {
  const pkg = findPackage(rateTable, selection.packageId);

  if (!pkg) {
    return (
      <section>
        <Label className="text-muted">Step 06</Label>
        <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">신청서 제출</h2>
        <p className="mt-3 text-s text-muted">먼저 2단계에서 패키지를 선택하세요.</p>
      </section>
    );
  }

  return (
    <section>
      <Label className="text-muted">Step 06</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">
        {isEditing ? "신청서 수정" : "신청서 제출"}
      </h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        {isEditing
          ? "아래 산출내역으로 신청서 내용이 수정됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."
          : "아래 산출내역으로 대관 신청서가 생성됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."}
      </p>

      {/* 신청 요약 — 카드 박스 대신 상단 2px 룰 + 헤어라인 */}
      <div className="mt-7 flex flex-col gap-5 border-t-2 border-foreground pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="type-kr-heading text-h6-m sm:text-h6">
            {pkg.name} · {pkg.audienceTier.label}
          </p>
          <p className="mt-2 text-s text-muted">
            {selection.week.year}년 {selection.week.month}월 {selection.week.weekOfMonth}주차 · 총{" "}
            {totalRentalDays(selection)}일 · 관객 {selection.expectedAudience.toLocaleString()}명
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <Label className="text-muted">신청 예상금액 · VAT 포함</Label>
          <p className="type-display mt-2 text-h4-m tabular-nums sm:text-h3">{won(quote.total)}</p>
        </div>
      </div>

      {submittedId ? (
        <div className="mt-7 border-l-2 border-foreground bg-accent px-5 py-4 text-s text-on-accent">
          <p className="font-bold">
            {isEditing ? "신청 내용이 수정되었습니다." : "신청이 접수되었습니다."}
          </p>
          <p className="mt-2 leading-6">
            운영자 심사 → 계약 → 정산 순으로 진행되며, 각 단계가 완료되면 알림으로 안내해 드립니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href={`/mypage/${submittedId}`} className="font-bold underline">
              신청 내역 확인
            </Link>
            <Link href={`/print/${submittedId}`} target="_blank" className="font-bold underline">
              인쇄 / PDF 저장
            </Link>
          </div>
        </div>
      ) : !isLoggedIn ? (
        <div className="mt-7 border-l-2 border-accent bg-warn-soft px-4 py-3.5 text-s leading-6 text-muted-strong">
          신청서를 제출하려면 로그인이 필요합니다. 지금까지 입력한 내용은 그대로 유지되니, 로그인 후
          이어서 제출할 수 있습니다.{" "}
          <Link href="/login" className="font-bold text-foreground underline">
            로그인
          </Link>{" "}
          ·{" "}
          <Link href="/register" className="font-bold text-foreground underline">
            회원가입
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className={`${btnClass("primary", "lg")} mt-7`}
          >
            {submitting ? "저장 중..." : isEditing ? "수정 내용 저장" : "신청서 생성"}
          </button>
          {error && (
            <p className="mt-3 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
              {error}
            </p>
          )}
        </>
      )}

      <h3 className="type-kr-heading mt-12 text-h6-m sm:text-h6">신청 절차</h3>
      <ol className="mt-5 border-t border-border/25">
        {STAGES.map((s) => (
          <li
            key={s.no}
            className="grid gap-2 border-b border-border/25 py-4 sm:grid-cols-[5rem_minmax(0,14rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6"
          >
            <span className="type-label text-xs text-muted">{s.no}</span>
            <span className="text-s font-bold">{s.title}</span>
            <p className="text-s text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
