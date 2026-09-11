"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { won } from "@/lib/format";
import { defaultDayTags, effectiveDayTag, findAddon, findPackage } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { useToast } from "@/components/ui/Toast";
import { btnClass } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";
import { venueShowCounts } from "./StepAudience";
import { useWizardText } from "@/lib/content/wizardText";
import type { WizardStepTexts } from "@/lib/content/pageContent";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  VENUES,
  type Attachment,
  type EstimatedQuote,
  type QuoteSelection,
  type RateTable,
} from "@/lib/pricing/types";

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** "YYYY-MM-DD" → "MM. DD." */
function fmtMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}. ${d}.`;
}

/** "YYYY-MM-DD" → "YYYY. MM. DD." */
function fmtYMD(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}. ${m}. ${d}.`;
}

function periodLabel(dates: string[]): string {
  if (dates.length === 0) return "—";
  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last ? fmtYMD(first) : `${fmtYMD(first)} – ${fmtMD(last)}`;
}

function rangeLabel(dates: string[]): string {
  if (dates.length === 0) return "";
  const sorted = [...dates].sort();
  return sorted.length > 1 ? `${fmtMD(sorted[0])} – ${fmtMD(sorted[sorted.length - 1])}` : fmtMD(sorted[0]);
}

function setupTeardownLabel(prep: string[], loadOut: string[]): string {
  const parts: string[] = [];
  if (prep.length > 0) parts.push(`설치 ${rangeLabel(prep)}`);
  if (loadOut.length > 0) parts.push(`철거 ${rangeLabel(loadOut)}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

interface TaggedDates {
  prep: string[];
  performance: string[];
  loadOut: string[];
}

function arenaTaggedDates(selection: QuoteSelection, defaultPerformanceDays: number): TaggedDates {
  const dates = resolveSelectedDates(selection);
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  const acc: TaggedDates = { prep: [], performance: [], loadOut: [] };
  for (const d of dates) {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    if (tag === "PREP") acc.prep.push(d);
    else if (tag === "PERFORMANCE") acc.performance.push(d);
    else if (tag === "LOAD_OUT") acc.loadOut.push(d);
  }
  return acc;
}

function midHallTaggedDates(selection: QuoteSelection): TaggedDates {
  const acc: TaggedDates = { prep: [], performance: [], loadOut: [] };
  for (const d of Object.keys(selection.midHallDays).sort()) {
    const role = selection.midHallDays[d].role;
    if (role === "SETUP") acc.prep.push(d);
    else if (role === "PERFORMANCE") acc.performance.push(d);
    else if (role === "LOAD_OUT") acc.loadOut.push(d);
  }
  return acc;
}

/** 표시용 필드 한 칸 — "1. 공연 정보"류 요약 카드 전체가 이 패턴의 반복이다. */
function ReviewField({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-s font-bold break-keep">{value}</div>
    </div>
  );
}

/** 번호 붙은 섹션 — 제목 옆에 "수정" 버튼(다른 STEP으로 점프), 섹션끼리는 헤어라인으로 구분. */
function ReviewSection({
  no,
  title,
  onEdit,
  editLabel,
  last,
  children,
}: {
  no: number;
  title: ReactNode;
  onEdit?: () => void;
  editLabel: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`p-6 ${last ? "" : "border-b border-border/25"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">
          {no}. {title}
        </h3>
        {onEdit && (
          <button type="button" onClick={onEdit} className={btnClass("secondary", "sm")}>
            {editLabel}
          </button>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

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
  files = [],
  existingAttachments = [],
  quoteId = null,
  altScheduleConsent,
  onChangeAltScheduleConsent,
  onSubmit,
  onRequestEdit,
  onJumpToStep,
  stepText,
  headingOverride,
  disabledFields,
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
  /** 아직 서버에 올라가지 않은 첨부(STEP7에서 고른 것) — 제출 시 함께 업로드된다. */
  files?: File[];
  /** 수정 화면에서 이미 서버에 올라간 첨부. */
  existingAttachments?: Attachment[];
  /** existingAttachments 다운로드 링크에 쓰는 신청서 id(수정 중이거나 방금 제출된 경우). */
  quoteId?: string | null;
  /** 대체 일정 제안 수신 동의 — 신청 일정으로 대관이 어려울 때 다른 일정을 제안받을지(필수). */
  altScheduleConsent?: "AGREE" | "DISAGREE" | null;
  onChangeAltScheduleConsent?: (value: "AGREE" | "DISAGREE") => void;
  onSubmit: () => void;
  /** 제출 완료 배너 옆의 "수정하기" 버튼 — 누르면 1단계로 돌아가 다시 수정할 수 있다. */
  onRequestEdit?: () => void;
  /** 각 섹션의 "수정" 버튼 — 해당 내용을 입력하는 STEP으로 바로 이동한다. */
  onJumpToStep?: (step: number) => void;
  stepText: WizardStepTexts;
  /** 관리자 문구 미리보기 전용 — 제목·리드를 편집 가능한 입력으로 바꿔치기한다. */
  headingOverride?: { title: ReactNode; lead?: ReactNode };
  /** [신규 2026-09-07] "그 영역을 잡고 없애줘" — 리드 한 줄을 다른 슬롯과 같은 노출
   * On/off 패턴("wizardShell.submitLead")으로 끌 수 있다. */
  disabledFields?: string[];
}) {
  const { t, tStr } = useWizardText();
  const toast = useToast();
  const pkg = findPackage(rateTable, selection.packageId);
  const [confirmed, setConfirmed] = useState(false);
  const [pledged, setPledged] = useState(false);
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const needsPackage = !isSimultaneous ? selection.venueId !== "medium-hall" : true;
  const needsMidHall = isSimultaneous || selection.venueId === "medium-hall";
  const showsArena = needsPackage && !!pkg;
  const showsMidHall = needsMidHall && hasMidHall;

  // 아직 서버에 올리지 않은 첨부(File)는 로컬 blob URL로만 미리보기/내려받기를 낼 수 있다 —
  // 신청서 제출 시점에야 실제로 업로드된다(StepAttachments 안내문과 같은 전제).
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // 로컬 File을 blob URL로 바꾸는 건 외부 브라우저 API 호출이라 DOM 조작과 같은
    // 부류의 effect다 — WizardShell.tsx의 임시저장본 복원과 같은 이유로 이 훅만 예외.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFileUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const venueName = isSimultaneous
    ? t("submit.simultaneousVenueName", "아레나 + 중형공연장 (동시 대관)")
    : (VENUES.find((v) => v.id === (selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-");
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

  const { arenaShows, midHallShows } = venueShowCounts(selection);
  const arenaTagged = showsArena ? arenaTaggedDates(selection, pkg?.defaultPerformanceDays ?? 2) : null;
  const midHallTagged = showsMidHall ? midHallTaggedDates(selection) : null;

  const eventTypeLabel =
    selection.performanceInfo.eventTypes.length > 0
      ? selection.performanceInfo.eventTypes.map((v) => EVENT_TYPE_LABEL[v] ?? v).join(" · ")
      : "—";

  const showCountLabel = isSimultaneous
    ? `${t("submit.arenaSchedulePrefix", "아레나")} ${arenaShows}${t("submit.showsUnit", "회")} · ${t(
        "submit.midHallSchedulePrefix",
        "중형공연장",
      )} ${midHallShows}${t("submit.showsUnit", "회")}`
    : showsArena
      ? `${t("submit.totalPrefix", "총")} ${arenaShows}${t("submit.showsUnit", "회")}`
      : `${t("submit.totalPrefix", "총")} ${midHallShows}${t("submit.showsUnit", "회")}`;

  const audienceLabel = isSimultaneous
    ? `${t("submit.arenaSchedulePrefix", "아레나")} ${t("submit.perShowPrefix", "회당")} ${selection.expectedAudience.toLocaleString()}${t("submit.peopleUnit", "명")} · ${t(
        "submit.midHallSchedulePrefix",
        "중형공연장",
      )} ${t("submit.perShowPrefix", "회당")} ${selection.secondaryAudience.toLocaleString()}${t("submit.peopleUnit", "명")}`
    : `${t("submit.perShowPrefix", "회당")} ${(showsArena ? selection.expectedAudience : selection.secondaryAudience).toLocaleString()}${t("submit.peopleUnit", "명")}`;

  const selectedAddonNames = selection.addons
    .filter((a) => a.requestedQuantity > 0)
    .map((a) => findAddon(rateTable, a.addonId)?.name)
    .filter((n): n is string => !!n);

  /**
   * 제출을 막는 이유. 없으면 null.
   * 버튼을 잠가 두면 눌러도 반응이 없어 고장으로 보인다 — 이유를 알려 주고 되돌린다.
   */
  function blockedReason(): string | null {
    if (blockingIssues.length > 0) return blockingIssues[0];
    if (!altScheduleConsent) return tStr("submit.altScheduleRequiredToast", "대체 일정 제안 수신 여부를 선택해 주세요.");
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

  const fileCount = files.length + existingAttachments.length;

  return (
    <section>
      <StepHeading
        title={headingOverride?.title ?? (isEditing ? stepText.submitEditingTitle : stepText.submitNewTitle)}
        lead={
          disabledFields?.includes("wizardShell.submitLead")
            ? undefined
            : (headingOverride?.lead ?? (isEditing ? stepText.submitEditingLead : stepText.submitNewLead))
        }
      />

      <div className="mt-8 border border-border-soft">
        <ReviewSection
          no={1}
          title={t("submit.section1Heading", "공연 정보")}
          onEdit={onJumpToStep ? () => onJumpToStep(3) : undefined}
          editLabel={tStr("submit.editButton", "수정")}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ReviewField label={t("submit.eventNameLabel", "공연명")} value={selection.performanceInfo.eventName || "—"} />
            <ReviewField label={t("submit.eventTypeLabel", "공연 유형")} value={eventTypeLabel} />
            <ReviewField
              label={t("submit.organizerLabel", "주최·주관사")}
              value={selection.performanceInfo.organizer || "—"}
            />
            <ReviewField label={t("submit.showCountLabel", "공연 횟수")} value={showCountLabel} />
            <ReviewField label={t("submit.audiencePrefix", "예상 관객 수")} value={audienceLabel} />
          </div>
        </ReviewSection>

        <ReviewSection
          no={2}
          title={t("submit.section2Heading", "대관 공간 및 일정")}
          onEdit={onJumpToStep ? () => onJumpToStep(1) : undefined}
          editLabel={tStr("submit.editButton", "수정")}
        >
          <div className={isSimultaneous ? "grid grid-cols-1 gap-8 sm:grid-cols-2" : undefined}>
            {showsArena && arenaTagged && (
              <div>
                {isSimultaneous && (
                  <p className="mb-3 text-xs font-bold text-muted">{t("submit.arenaSchedulePrefix", "아레나")}</p>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <ReviewField
                    label={t("submit.venueLabel", "신청 공간")}
                    value={isSimultaneous ? t("submit.arenaSchedulePrefix", "아레나") : venueName}
                  />
                  <ReviewField label={t("submit.periodLabel", "대관 기간")} value={periodLabel(resolveSelectedDates(selection))} />
                  <ReviewField
                    label={t("submit.performanceDatesLabel", "공연일")}
                    value={arenaTagged.performance.length > 0 ? arenaTagged.performance.map(fmtMD).join(" · ") : "—"}
                  />
                  <ReviewField
                    label={t("submit.setupTeardownLabel", "설치·철거 (예상) 일정")}
                    value={setupTeardownLabel(arenaTagged.prep, arenaTagged.loadOut)}
                  />
                </div>
              </div>
            )}
            {showsMidHall && midHallTagged && (
              <div className={isSimultaneous ? "" : undefined}>
                {isSimultaneous && (
                  <p className="mb-3 text-xs font-bold text-muted">{t("submit.midHallSchedulePrefix", "중형공연장")}</p>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <ReviewField
                    label={t("submit.venueLabel", "신청 공간")}
                    value={isSimultaneous ? t("submit.midHallSchedulePrefix", "중형공연장") : venueName}
                  />
                  <ReviewField
                    label={t("submit.periodLabel", "대관 기간")}
                    value={periodLabel(Object.keys(selection.midHallDays))}
                  />
                  <ReviewField
                    label={t("submit.performanceDatesLabel", "공연일")}
                    value={midHallTagged.performance.length > 0 ? midHallTagged.performance.map(fmtMD).join(" · ") : "—"}
                  />
                  <ReviewField
                    label={t("submit.setupTeardownLabel", "설치·철거 (예상) 일정")}
                    value={setupTeardownLabel(midHallTagged.prep, midHallTagged.loadOut)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* [신규 2026-09-11] "대체 일정 제안 수신 여부" — 신청 일정으로 대관이 어려울 때
              심의 결과에 따라 다른 일정을 제안받을지 묻는다. 필수 — 제출 검증(blockedReason)이
              값이 없으면 막는다. */}
          <div className="mt-6 border border-border/25 p-5">
            <div className="flex items-center gap-2">
              <span className="text-s font-bold">{t("submit.altScheduleHeading", "대체 일정 제안 수신 여부")}</span>
              <span className="border border-danger/40 bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger">
                {t("submit.requiredBadge", "필수")}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {t(
                "submit.altScheduleHint",
                "신청 일정으로 대관이 어려운 경우, 심의 결과에 따라 대관 가능한 다른 일정을 제안할 수 있습니다.",
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-s">
                <input
                  type="radio"
                  name="altScheduleConsent"
                  checked={altScheduleConsent === "AGREE"}
                  onChange={() => onChangeAltScheduleConsent?.("AGREE")}
                />
                <span className="font-bold">{t("submit.altScheduleAgree", "동의")}</span>
                <span className="text-muted">{t("submit.altScheduleAgreeDesc", "— 다른 일정에 대한 조건부 승인 제안을 받겠습니다.")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-s">
                <input
                  type="radio"
                  name="altScheduleConsent"
                  checked={altScheduleConsent === "DISAGREE"}
                  onChange={() => onChangeAltScheduleConsent?.("DISAGREE")}
                />
                <span className="font-bold">{t("submit.altScheduleDisagree", "미동의")}</span>
                <span className="text-muted">{t("submit.altScheduleDisagreeDesc", "— 최초 신청 일정에 대해서만 심의를 진행해 주세요.")}</span>
              </label>
            </div>
            <p className="mt-3 border-t border-border/25 pt-3 text-xs text-muted">
              {t(
                "submit.altScheduleFootnote",
                "※ 동의하더라도 일정이 자동으로 변경되거나 대관이 확정되는 것은 아닙니다. 제안 일정은 별도 협의를 거쳐 확정됩니다.",
              )}
            </p>
          </div>
        </ReviewSection>

        <ReviewSection
          no={3}
          title={t("submit.section3Heading", "대관료 및 옵션")}
          onEdit={onJumpToStep ? () => onJumpToStep(2) : undefined}
          editLabel={tStr("submit.editButton", "수정")}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ReviewField
              label={t("submit.expectedAmountLabel", "신청 예상금액 (VAT 포함)")}
              value={won(quote.total)}
            />
            <ReviewField
              label={t("submit.selectedOptionsLabel", "추가 선택 옵션")}
              value={selectedAddonNames.length > 0 ? selectedAddonNames.join(" · ") : t("submit.noOptionsSelected", "선택 없음")}
            />
          </div>
        </ReviewSection>

        <ReviewSection
          no={4}
          title={t("submit.section4Heading", "첨부 서류")}
          onEdit={onJumpToStep ? () => onJumpToStep(7) : undefined}
          editLabel={tStr("submit.editButton", "수정")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              {t("submit.attachedFilesPrefix", "첨부파일")} {fileCount}
              {t("submit.attachedFilesSuffix", "개가 함께 제출됩니다")}
            </span>
          </div>
          {fileCount > 0 ? (
            <ul className="mt-4 border-t border-border/25">
              {existingAttachments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 border-b border-border/25 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="min-w-0 truncate text-s font-bold">{a.originalName}</span>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted tabular-nums">
                    <span>{formatSize(a.size)}</span>
                    {quoteId && (
                      <>
                        <a
                          href={`/api/quotes/${quoteId}/attachments/${a.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={btnClass("secondary", "sm")}
                        >
                          {t("submit.previewButton", "미리보기")}
                        </a>
                        <a
                          href={`/api/quotes/${quoteId}/attachments/${a.id}`}
                          download={a.originalName}
                          className={btnClass("secondary", "sm")}
                        >
                          {t("submit.downloadButton", "내려받기")}
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex flex-col gap-2 border-b border-border/25 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="min-w-0 truncate text-s font-bold">{f.name}</span>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted tabular-nums">
                    <span>{formatSize(f.size)}</span>
                    {fileUrls[i] && (
                      <>
                        <a href={fileUrls[i]} target="_blank" rel="noopener noreferrer" className={btnClass("secondary", "sm")}>
                          {t("submit.previewButton", "미리보기")}
                        </a>
                        <a href={fileUrls[i]} download={f.name} className={btnClass("secondary", "sm")}>
                          {t("submit.downloadButton", "내려받기")}
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-s text-muted">{t("submit.noAttachments", "첨부된 파일이 없습니다.")}</p>
          )}
        </ReviewSection>

        <ReviewSection no={5} title={t("submit.section5Heading", "최종 확인")} editLabel="" last>
          {showConfirmation ? (
            <div className="text-s text-foreground">
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
            <div className="text-s text-foreground">
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
                <div className="mb-5 text-s text-foreground">
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
              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-start gap-2.5 text-s">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5"
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
                    className="mt-0.5"
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
        </ReviewSection>
      </div>

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
