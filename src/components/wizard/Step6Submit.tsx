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
  const [agreedRules, setAgreedRules] = useState(false);
  const venueName =
    VENUES.find((v) => v.id === (selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-";
  const info = selection.performanceInfo;

  if (!pkg) {
    return (
      <section>
        <StepHeading
        title={<>신청서 제출</>}
        lead={<>먼저 규모·패키지 선택 단계에서 패키지를 고르세요.</>}
      />
      </section>
    );
  }

  const canSubmit = confirmed && pledged && agreedRules;
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
            접수번호가 발급되었습니다. 진행 상황은 내 신청 내역에서 확인하실 수 있습니다.
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
              입력한 내용이 사실과 같으며, 심사에 필요한 자료를 모두 제출했음을 확인합니다.
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={pledged}
                onChange={(e) => setPledged(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              신청서에 기재한 공연 내용과 운영 계획을 그대로 이행하며, 기재 내용과 다른 공연을
              진행할 경우 승인이 취소될 수 있음에 동의합니다.
            </label>
            {/*
              규약 동의를 실제로 받는다. "숙지하고 동의한 것으로 간주됩니다" 문장만 두면
              증빙이 남지 않는다. 규약 전문은 웹에 게재하지 않고 자료실에서 내려받는다.
            */}
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={agreedRules}
                onChange={(e) => setAgreedRules(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              대관 규약을 읽고 동의합니다.
            </label>
            <p className="pl-6 text-xs text-muted">
              대관 규약 전문은{" "}
              <Link
                href="/library?doc=rules"
                target="_blank"
                className="font-bold text-foreground underline"
              >
                자료실 대관 규약 탭
              </Link>
              에서 PDF로 내려받으실 수 있습니다.
            </p>
          </div>

          <p className="mt-6 border-t border-border/25 pt-3 text-xs leading-5 text-muted">
            제출하시면 접수번호가 발급되고 심사가 시작됩니다. 심사 결과는 승인, 보류, 반려로 구분해
            내 신청 내역과 등록하신 이메일로 안내합니다. 심사 과정에서 추가 자료를 요청할 수
            있습니다. 심사 승인만으로는 일정이 확정되지 않으며, 계약을 체결하고 계약금을 납부하셔야
            대관이 확정됩니다.
          </p>
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

    </section>
  );
}
