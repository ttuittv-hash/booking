"use client";

import Link from "next/link";
import { useState } from "react";
import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type EstimatedQuote,
  type QuoteSelection,
  type RateTable,
} from "@/lib/pricing/types";

const STAGES = [
  {
    no: "STEP ①",
    title: "공간 · 일정 선택",
    desc: "공연 일정과 관객 규모를 입력하면 대관료가 자동으로 산정됩니다.",
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
  attachmentError,
  fileCount = 0,
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
  attachmentError?: string | null;
  fileCount?: number;
  onSubmit: () => void;
}) {
  const pkg = findPackage(rateTable, selection.packageId);
  const [confirmed, setConfirmed] = useState(false);
  const [pledged, setPledged] = useState(false);
  const venueName =
    VENUES.find((v) => v.id === (selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-";
  const info = selection.performanceInfo;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

  // [화면 뼈대 2026-08-18] 동시 대관 · 중형 단독은 요금 엔진(중형 DAILY 계산 · 합산)이
  // 아직 연동되지 않았다 — 지금 제출을 허용하면 중형 금액이 빠진 채로 신청서가 접수돼
  // 실제 대관료를 과소 산정하게 된다. 요금 엔진 연동 전까지는 화면 흐름 확인까지만 지원한다.
  if (!pkg || isSimultaneous) {
    const isMidHall = selection.venueId === "medium-hall";
    return (
      <section className="rounded border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">
          {isSimultaneous
            ? "동시 대관 신청서 제출은 요금 엔진(중형 · 합산 계산)이 연동된 뒤 지원됩니다. 지금은 화면 흐름만 확인할 수 있습니다."
            : isMidHall
              ? "중형공연장 신청서 제출은 요금 엔진 연동 후 지원됩니다. 지금은 화면 흐름만 확인할 수 있습니다."
              : "먼저 1단계에서 패키지를 선택하세요."}
        </p>
      </section>
    );
  }

  const canSubmit = confirmed && pledged;

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">8. {isEditing ? "신청서 수정" : "신청서 제출"}</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {isEditing
          ? "아래 산출내역으로 신청서 내용이 수정됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."
          : "아래 산출내역으로 대관 신청서가 생성됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-panel/60 p-6">
        <div>
          <div className="text-[15px] font-semibold">
            {venueName} · {pkg.audienceTier.label}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {selection.week.year}년 {selection.week.month}월{" "}
            {selection.week.weekOfMonth}주차 · 총 {totalRentalDays(selection)}일 ·
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

      <div className="mt-4 rounded border border-border bg-panel/60 p-6">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">공연 정보</div>
          {fileCount > 0 && (
            <div className="text-[12px] text-muted">첨부파일 {fileCount}개가 함께 제출됩니다</div>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">공연(행사)명</dt>
            <dd className="font-medium">{info.eventName || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">아티스트</dt>
            <dd className="font-medium">{info.artist || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">주최·주관·기획</dt>
            <dd className="font-medium">{info.organizer || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">행사규모</dt>
            <dd className="font-medium">{info.eventScale || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">행사유형</dt>
            <dd className="font-medium">
              {info.eventTypes.length ? info.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">무대형태</dt>
            <dd className="font-medium">
              {info.stageTypes.length ? info.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">객석형태</dt>
            <dd className="font-medium">
              {info.seatingTypes.length ? info.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">수납식 객석 사용여부</dt>
            <dd className="font-medium">
              {info.retractableSeatUse ? RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatUse] : "-"}
            </dd>
          </div>
        </dl>
      </div>

      {submittedId ? (
        <div className="mt-5 rounded-sm border border-accent/30 bg-accent-soft px-5 py-4 text-[13.5px] text-accent">
          <p className="font-semibold">{isEditing ? "신청 내용이 수정되었습니다." : "신청이 접수되었습니다."}</p>
          <p className="mt-1.5 leading-6">
            운영자 심사 → 계약 → 정산 순으로 진행되며, 각 단계가 완료되면
            알림으로 안내해 드립니다.
          </p>
          <div className="mt-3 flex gap-4">
            <Link href={`/mypage/${submittedId}`} className="font-semibold underline">
              신청 내역 확인
            </Link>
            <Link href={`/print/${submittedId}`} target="_blank" className="font-semibold underline">
              인쇄 / PDF 저장
            </Link>
          </div>
          {attachmentError && (
            <p className="mt-3 border-t border-accent/30 pt-3 text-[12.5px] text-warn">{attachmentError}</p>
          )}
        </div>
      ) : !isLoggedIn ? (
        <div className="mt-5 rounded-sm border border-warn/30 bg-warn-soft px-4 py-3.5 text-[13.5px] text-warn">
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
          <div className="mt-5 space-y-2.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              위에 표시된 공연기간/일정 및 공연정보 입력 내용을 확인하였으며, 이대로 신청서를 제출합니다.
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={pledged}
                onChange={(e) => setPledged(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              입력한 내용이 사실과 틀림없으며, 이를 이행할 것을 서약합니다.
            </label>
          </div>
          <button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={onSubmit}
            className="mt-5 rounded-sm bg-accent px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? "저장 중..." : isEditing ? "수정 내용 저장" : "신청서 생성"}
          </button>
          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
        </>
      )}

      <h3 className="mt-10 text-[16px] font-semibold">신청 절차</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAGES.map((s) => (
          <div key={s.no} className="rounded-sm border border-border bg-panel/60 p-4">
            <div className="text-[11px] font-semibold text-accent">{s.no}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">{s.title}</div>
            <p className="mt-1.5 text-[12px] leading-5 text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
