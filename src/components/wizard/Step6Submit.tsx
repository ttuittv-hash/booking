"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { useToast } from "@/components/ui/Toast";
import { btnClass } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";
import { useWizardText } from "@/lib/content/wizardText";
import type { WizardStepTexts } from "@/lib/content/pageContent";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_FLOOR_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type EstimatedQuote,
  type QuoteSelection,
  type RateTable,
  type RetractableSeatFloor,
} from "@/lib/pricing/types";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `총 ${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

// defaultTitle/defaultDesc는 관리자가 아직 문구를 고치지 않았을 때 쓰는 기본값이다 —
// 모듈 스코프 상수라 여기서 훅을 쓸 수 없어, 실제 렌더 시점에 useWizardText()의
// t()로 override를 먼저 찾는다.
const STAGES = [
  {
    key: "stage1",
    no: "STEP ①",
    defaultTitle: "공간 · 일정 선택",
    defaultDesc: "공연 일정과 관객 규모를 입력하면 대관료가 자동으로 산정됩니다.",
  },
  {
    key: "stage2",
    no: "STEP ②",
    defaultTitle: "구성과 대관료 확인",
    defaultDesc: "포함 항목과 부대시설을 구성하고, 예상 대관료를 확인합니다.",
  },
  {
    key: "stage3",
    no: "STEP ③",
    defaultTitle: "신청 제출",
    defaultDesc: "입력한 내용으로 대관 신청서를 접수합니다.",
  },
  {
    key: "stage4",
    no: "STEP ④",
    defaultTitle: "심사",
    defaultDesc: "운영자가 일정·공연 내용·시설 적합성 등을 종합적으로 검토합니다.",
  },
  {
    key: "stage5",
    no: "STEP ⑤",
    defaultTitle: "심사 결과 안내",
    defaultDesc: "승인·보류·거절 결과와 사유를 알림으로 안내해 드립니다.",
  },
];

export function Step6Submit({
  rateTable,
  quote,
  selection,
  isLoggedIn,
  isEditing = false,
  confirmationVisible,
  justEdited = false,
  submitting,
  submittedId,
  error,
  attachmentError,
  fileCount = 0,
  onSubmit,
  onRequestEdit,
  stepText,
  headingOverride,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
  isLoggedIn: boolean;
  /** 신청서가 이미 존재해 이번 제출이 갱신(PUT)이 될지 — 화면 문구(제목·버튼)에 쓴다. */
  isEditing?: boolean;
  /** 제출 완료 배너를 보여줄지 — "수정하기"로 잠금이 풀리면 submittedId가 있어도 다시 폼을 보여준다. */
  confirmationVisible?: boolean;
  /** 방금 완료된 제출이 최초 접수였는지 수정이었는지(배너 문구 구분용). */
  justEdited?: boolean;
  submitting: boolean;
  submittedId: string | null;
  error: string | null;
  attachmentError?: string | null;
  fileCount?: number;
  onSubmit: () => void;
  /** 제출 완료 배너 옆의 "수정하기" 버튼 — 누르면 1단계로 돌아가 다시 수정할 수 있다. */
  onRequestEdit?: () => void;
  stepText: WizardStepTexts;
  /** 관리자 문구 미리보기 전용 — 제목·리드를 편집 가능한 입력으로 바꿔치기한다. */
  headingOverride?: { title: ReactNode; lead?: ReactNode };
}) {
  const { t, tStr } = useWizardText();
  const toast = useToast();
  const pkg = findPackage(rateTable, selection.packageId);
  const [confirmed, setConfirmed] = useState(false);
  const [pledged, setPledged] = useState(false);
  const info = selection.performanceInfo;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const needsPackage = !isSimultaneous ? selection.venueId !== "medium-hall" : true;
  const needsMidHall = isSimultaneous || selection.venueId === "medium-hall";

  const venueName = isSimultaneous
    ? t("submit.simultaneousVenueName", "아레나 + 중형공연장 (동시 대관)")
    : (VENUES.find((v) => v.id === (selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-");
  const audienceTierLabel = pkg?.audienceTier.label ?? (needsMidHall ? t("submit.midHallAudienceTierFallback", "~3,000명 규모") : "");

  if ((needsPackage && !pkg) || (needsMidHall && !hasMidHall)) {
    return (
      <section>
        <p className="text-s text-muted">
          {needsPackage && !pkg
            ? t("submit.pickPackageFirst", "구성 · 옵션에서 패키지를 먼저 선택하세요.")
            : t("submit.pickMidHallScheduleFirst", "중형공연장 일정을 먼저 선택하세요.")}
        </p>
      </section>
    );
  }

  const showConfirmation = confirmationVisible ?? !!submittedId;
  const blockingIssues = quote.blockingIssues;

  /**
   * 제출을 막는 이유. 없으면 null.
   * 버튼을 잠가 두면 눌러도 반응이 없어 고장으로 보인다 — 이유를 알려 주고 되돌린다.
   */
  function blockedReason(): string | null {
    if (blockingIssues.length > 0) return blockingIssues[0];
    if (!confirmed) return tStr("submit.confirmRequiredToast", "산출내역 확인에 동의해 주세요.");
    if (!pledged) return tStr("submit.pledgeRequiredToast", "입력 내용이 사실이라는 서약에 동의해 주세요.");
    return null;
  }

  function handleSubmit() {
    const reason = blockedReason();
    if (reason) {
      toast.error(reason);
      return;
    }
    onSubmit();
  }

  return (
    <section>
      <StepHeading
        title={headingOverride?.title ?? (isEditing ? stepText.submitEditingTitle : stepText.submitNewTitle)}
        lead={headingOverride?.lead ?? (isEditing ? stepText.submitEditingLead : stepText.submitNewLead)}
      />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground pt-6">
        <div>
          <div className="type-kr-heading text-h6-m">
            {venueName} · {audienceTierLabel}
          </div>
          <div className="mt-1 text-s text-muted">
            {isSimultaneous ? (
              <>
                {t("submit.arenaSchedulePrefix", "아레나")} {selection.week.year}
                {t("submit.yearUnit", "년")} {selection.week.month}
                {t("submit.monthUnit", "월")} {selection.week.weekOfMonth}
                {t("submit.weekOfMonthUnit", "주차")} · {t("submit.totalDaysPrefix", "총")}{" "}
                {totalRentalDays(selection)}
                {t("submit.dayUnit", "일")} · {t("submit.audiencePrefix", "관객")}{" "}
                {selection.expectedAudience.toLocaleString()}
                {t("submit.peopleUnit", "명")}
                <br />
                {t("submit.midHallSchedulePrefix", "중형공연장")} {midHallSummaryLine(selection)}
              </>
            ) : pkg ? (
              <>
                {selection.week.year}
                {t("submit.yearUnit", "년")} {selection.week.month}
                {t("submit.monthUnit", "월")} {selection.week.weekOfMonth}
                {t("submit.weekOfMonthUnit", "주차")} · {t("submit.totalDaysPrefix", "총")}{" "}
                {totalRentalDays(selection)}
                {t("submit.dayUnit", "일")} · {t("submit.audiencePrefix", "관객")}{" "}
                {selection.expectedAudience.toLocaleString()}
                {t("submit.peopleUnit", "명")}
              </>
            ) : (
              midHallSummaryLine(selection)
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">{t("submit.expectedAmountLabel", "신청 예상금액 (VAT 포함)")}</div>
          <div className="text-h5-m font-bold tabular-nums sm:text-h5">
            {won(quote.total)}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border/25 pt-5">
        <div className="flex items-center justify-between">
          <div className="text-s font-bold">{t("submit.eventInfoHeading", "공연 정보")}</div>
          {fileCount > 0 && (
            <div className="text-xs text-muted">
              {t("submit.attachedFilesPrefix", "첨부파일")} {fileCount}
              {t("submit.attachedFilesSuffix", "개가 함께 제출됩니다")}
            </div>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.eventNameLabel", "공연(행사)명")}</dt>
            <dd className="font-bold">{info.eventName || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.artistLabel", "아티스트")}</dt>
            <dd className="font-bold">{info.artist || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.organizerLabel", "주최·주관·기획")}</dt>
            <dd className="font-bold">{info.organizer || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.eventScaleLabel", "행사규모")}</dt>
            <dd className="font-bold">{info.eventScale || "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.eventTypesLabel", "행사유형")}</dt>
            <dd className="font-bold">
              {info.eventTypes.length ? info.eventTypes.map((type) => EVENT_TYPE_LABEL[type]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.stageTypesLabel", "무대형태")}</dt>
            <dd className="font-bold">
              {info.stageTypes.length ? info.stageTypes.map((type) => STAGE_TYPE_LABEL[type]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.seatingTypesLabel", "객석형태")}</dt>
            <dd className="font-bold">
              {info.seatingTypes.length ? info.seatingTypes.map((type) => SEATING_TYPE_LABEL[type]).join(", ") : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:justify-start">
            <dt className="text-muted">{t("submit.retractableSeatUseLabel", "수납식 객석 사용여부")}</dt>
            <dd className="font-bold">
              {info.retractableSeatUse ? RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatUse] : "-"}
              {/* [사용]이면 층별 답까지 보여 준다 — 어느 층을 펴는지가 객석 구성을 가른다(2026-09-02) */}
              {info.retractableSeatUse === "USE" && info.retractableSeatFloorUse
                ? ` (${(Object.keys(RETRACTABLE_SEAT_FLOOR_LABEL) as RetractableSeatFloor[])
                    .filter((floor) => info.retractableSeatFloorUse?.[floor])
                    .map(
                      (floor) =>
                        `${RETRACTABLE_SEAT_FLOOR_LABEL[floor]} ${RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatFloorUse![floor]!]}`,
                    )
                    .join(" · ")})`
                : ""}
            </dd>
          </div>
        </dl>
      </div>

      {showConfirmation ? (
        <div className="mt-8 border-t-2 border-foreground pt-5 text-s text-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">
              {justEdited
                ? t("submit.editedBanner", "신청 내용이 수정되었습니다.")
                : t("submit.acceptedBanner", "신청이 접수되었습니다.")}
            </p>
            {onRequestEdit && (
              <button
                type="button"
                onClick={onRequestEdit}
                className="shrink-0 text-xs font-bold text-muted underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {t("submit.requestEditButton", "수정하기")}
              </button>
            )}
          </div>
          <p className="mt-1.5 leading-6">
            {t(
              "submit.postSubmitProcessNote",
              "운영자 심사 → 계약 → 정산 순으로 진행되며, 각 단계가 완료되면 알림으로 안내해 드립니다.",
            )}
          </p>
          <div className="mt-3 flex gap-4">
            <Link href={`/mypage/${submittedId}`} className="font-bold underline">
              {t("submit.viewApplicationLink", "신청 내역 확인")}
            </Link>
            <Link href={`/print/${submittedId}`} target="_blank" className="font-bold underline">
              {t("submit.printPdfLink", "인쇄 / PDF 저장")}
            </Link>
          </div>
          {attachmentError && (
            <p className="mt-3 border-t border-border/25 pt-3 text-xs text-muted">{attachmentError}</p>
          )}
        </div>
      ) : !isLoggedIn ? (
        <div className="mt-8 border-t-2 border-foreground pt-5 text-s text-foreground">
          {t(
            "submit.loginRequiredNote",
            "신청서를 제출하려면 로그인이 필요합니다. 지금까지 입력한 내용은 그대로 유지되니, 로그인 후 이어서 제출할 수 있습니다.",
          )}{" "}
          <Link href="/login" className="font-bold underline">
            {t("submit.loginLink", "로그인")}
          </Link>{" "}
          ·{" "}
          <Link href="/register" className="font-bold underline">
            {t("submit.registerLink", "회원가입")}
          </Link>
        </div>
      ) : (
        <>
          {blockingIssues.length > 0 && (
            <div className="mt-8 border-t-2 border-foreground pt-5 text-s text-foreground">
              <p className="font-bold">
                {t("submit.blockingIssuesHeading", "운영자 확인이 필요한 항목이 있어 아직 제출할 수 없습니다.")}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {blockingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
              <p className="mt-1.5">
                {t(
                  "submit.blockingIssuesHint",
                  "일정 선택에서 해당 일정을 2회 이하로 조정하거나, 운영자에게 문의해 주세요.",
                )}
              </p>
            </div>
          )}
          <div className="mt-5 space-y-2.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              {t(
                "submit.confirmCheckboxLabel",
                "위에 표시된 공연기간/일정 및 공연정보 입력 내용을 확인하였으며, 이대로 신청서를 제출합니다.",
              )}
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-s">
              <input
                type="checkbox"
                checked={pledged}
                onChange={(e) => setPledged(e.target.checked)}
                className="mt-0.5 accent-foreground"
              />
              {t("submit.pledgeCheckboxLabel", "입력한 내용이 사실과 틀림없으며, 이를 이행할 것을 서약합니다.")}
            </label>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className={`mt-5 ${btnClass("primary", "lg")}`}
          >
            {submitting
              ? t("submit.submittingButton", "저장 중...")
              : isEditing
                ? t("submit.submitEditButton", "수정사항 제출")
                : t("submit.submitNewButton", "신청서 생성")}
          </button>
          {error && <p className="mt-3 text-s text-danger">{error}</p>}
        </>
      )}

      <h3 className="type-kr-heading mt-12 text-h6-m sm:text-h6">{t("submit.processHeading", "신청 절차")}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAGES.map((s) => (
          <div key={s.no} className="border-t border-border/25 pt-4">
            <div className="text-xs font-bold text-foreground">{s.no}</div>
            <div className="mt-1.5 text-s font-bold">{t(`submit.${s.key}Title`, s.defaultTitle)}</div>
            <p className="mt-1.5 text-xs leading-5 text-muted">{t(`submit.${s.key}Desc`, s.defaultDesc)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
