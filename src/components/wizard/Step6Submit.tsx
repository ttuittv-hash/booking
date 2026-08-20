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
import { SpecTable, btnClass } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

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

  if (!pkg) {
    return (
      <section>
        <StepHeading
        title={<>신청서 제출</>}
        lead={<>먼저 3단계에서 패키지를 선택하세요.</>}
      />
      </section>
    );
  }

  const canSubmit = confirmed && pledged;
  const infoRows: [string, string][] = [
    ["공연(행사)명", info.eventName || "-"],
    ["아티스트", info.artist || "-"],
    ["주최·주관·기획", info.organizer || "-"],
    ["행사규모", info.eventScale || "-"],
    [
      "행사유형",
      info.eventTypes.length ? info.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ") : "-",
    ],
    [
      "무대형태",
      info.stageTypes.length ? info.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ") : "-",
    ],
    [
      "객석형태",
      info.seatingTypes.length
        ? info.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ")
        : "-",
    ],
    [
      "수납식 객석 사용여부",
      info.retractableSeatUse ? RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatUse] : "-",
    ],
  ];

  return (
    <section>
      <StepHeading
        title={<>{isEditing ? "신청서 수정" : "신청서 제출"}</>}
        lead={<>{isEditing
          ? "아래 산출내역으로 신청서 내용이 수정됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."
          : "아래 산출내역으로 대관 신청서가 생성됩니다. 신청금액은 예상금액이며, 이후 심사·계약에서 확정됩니다."}</>}
      />

      {/* 신청 요약 — 카드 박스 대신 상단 2px 룰 + 헤어라인 */}
      <div className="mt-7 flex flex-col gap-5 border-t-2 border-foreground pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="type-kr-heading text-h6-m sm:text-h6">
            {venueName} · {pkg.name} · {pkg.audienceTier.label}
          </p>
          <p className="mt-2 text-s text-muted">
            {selection.week.year}년 {selection.week.month}월 {selection.week.weekOfMonth}주차 · 총{" "}
            {totalRentalDays(selection)}일 · 관객 {selection.expectedAudience.toLocaleString()}명
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-bold text-muted">신청 예상금액 · VAT 포함</p>
          <p className="type-display mt-2 text-h4-m tabular-nums sm:text-h3">{won(quote.total)}</p>
        </div>
      </div>

      {/* 공연 정보 — 카드 박스 대신 헤어라인 제원표 */}
      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="type-kr-heading text-h6-m sm:text-h6">공연 정보</h3>
          {fileCount > 0 && (
            <p className="text-s text-muted">첨부파일 {fileCount}개가 함께 제출됩니다</p>
          )}
        </div>
        <SpecTable rows={infoRows} className="mt-5" />
      </div>

      {submittedId ? (
        <div className="mt-7 bg-accent px-6 py-5 text-s text-on-accent">
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
          {attachmentError && (
            <p className="mt-4 border-t border-on-accent/25 pt-3 text-s text-on-accent">
              {attachmentError}
            </p>
          )}
        </div>
      ) : !isLoggedIn ? (
        <div className="mt-7 border-t border-border/25 pt-4 text-s leading-6 text-muted">
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
          <div className="mt-7 space-y-3 border-t border-border/25 pt-5">
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              위에 표시된 공연기간/일정 및 공연정보 입력 내용을 확인하였으며, 이대로 신청서를
              제출합니다.
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={pledged}
                onChange={(e) => setPledged(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              입력한 내용이 사실과 틀림없으며, 이를 이행할 것을 서약합니다.
            </label>
          </div>
          <button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={onSubmit}
            className={`${btnClass("primary", "lg")} mt-6`}
          >
            {submitting ? "저장 중..." : isEditing ? "수정 내용 저장" : "신청서 생성"}
          </button>
          {error && (
            <p className="mt-3 border-l-2 border-danger pl-4 text-s text-danger">
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
            <span className="text-xs font-bold text-muted">{s.no}</span>
            <span className="text-s font-bold">{s.title}</span>
            <p className="text-s text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
