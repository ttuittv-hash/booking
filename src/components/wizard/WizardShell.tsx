"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { findAddon, findPackage, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import type { AppUser, DateBlock, QuoteSelection, RateTable, WeekDemand } from "@/lib/pricing/types";
import { DEFAULT_VENUE_ID, VENUES } from "@/lib/pricing/types";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { ArrowRight, btnClass } from "@/components/ui/kit";
import { StepNav } from "./StepNav";
import { SummaryPanel } from "./SummaryPanel";
import { StepVenue } from "./StepVenue";
import { Step1Calendar } from "./Step1Calendar";
import { Step1Package } from "./Step1Package";
import { Step3Included } from "./Step3Included";
import { Step4Addons } from "./Step4Addons";
import { Step5Estimate } from "./Step5Estimate";
import { StepPerformanceInfo } from "./StepPerformanceInfo";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 8;

// 오늘 기준 다음 달을 기본값으로 — 과거 임의의 연도로 고정돼 있으면 신청자가 매번
// 달력을 여러 달 넘겨야 하고, 자신이 신청한 주차의 경합 현황도 바로 보이지 않는다.
function defaultWeek(): QuoteSelection["week"] {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1, weekOfMonth: 1 };
}

const INITIAL_PERFORMANCE_INFO: QuoteSelection["performanceInfo"] = {
  eventName: "",
  artist: "",
  organizer: "",
  eventScale: "",
  eventTypes: [],
  stageTypes: [],
  seatingTypes: [],
  retractableSeatUse: null,
};

const INITIAL_SELECTION: QuoteSelection = {
  venueId: null,
  packageId: null,
  week: defaultWeek(),
  excludedDays: [],
  extraDays: 0,
  dayTags: {},
  expectedAudience: 8000,
  expectedRevenue: 0,
  addons: [],
  performanceInfo: INITIAL_PERFORMANCE_INFO,
};

function pruneUnavailableAddons(
  rateTable: RateTable,
  selection: QuoteSelection,
  packageId: number | null,
): QuoteSelection["addons"] {
  const pkg = findPackage(rateTable, packageId);
  if (!pkg) return [];
  return selection.addons.filter((selected) => {
    const addon = findAddon(rateTable, selected.addonId);
    return addon ? isAddonAvailable(addon, pkg) : false;
  });
}

export function WizardShell({
  rateTable,
  currentUser,
  weekDemand,
  dateBlocks,
  editingQuoteId,
  initialSelection,
  startFresh,
}: {
  rateTable: RateTable;
  currentUser: AppUser | null;
  weekDemand: WeekDemand[];
  dateBlocks: DateBlock[];
  editingQuoteId?: string;
  initialSelection?: QuoteSelection;
  startFresh?: boolean;
}) {
  const isEditing = !!editingQuoteId;
  const [step, setStep] = useState(1);
  // File은 JSON 직렬화가 안 되므로 selection과 분리해 별도 상태로 두고
  // localStorage 임시저장 대상에서도 제외한다 (새로고침 시 다시 선택 필요).
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selection, setSelection] = useState<QuoteSelection>(
    initialSelection
      ? {
          ...INITIAL_SELECTION,
          ...initialSelection,
          venueId: initialSelection.venueId ?? DEFAULT_VENUE_ID,
          performanceInfo: initialSelection.performanceInfo ?? INITIAL_PERFORMANCE_INFO,
        }
      : INITIAL_SELECTION,
  );
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // 위저드 진행 중(입력에 시간이 걸리는 동안) 세션이 만료될 수 있으므로,
  // 최초 렌더의 currentUser 값과 별개로 제출 시점에 401을 감지해 로그인 안내로 전환한다.
  const [sessionExpired, setSessionExpired] = useState(false);

  // 로그인 리다이렉트 등으로 페이지를 이탈했다가 돌아와도 입력값을 복원한다.
  // (기존 신청서 수정 중에는 새 신청서용 임시저장 내용을 불러오지 않는다.
  //  "대관 신청 시작하기"처럼 새 신청을 명시적으로 시작하는 진입점에서는
  //  이전에 남아있던 임시저장 내용을 무시하고 공간 선택부터 새로 시작한다.)
  useEffect(() => {
    if (isEditing) return;
    if (startFresh) {
      clearWizardDraft();
      return;
    }
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회만 복원한다.
    const draft = loadWizardDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection({
        ...INITIAL_SELECTION,
        ...draft.selection,
        dayTags: draft.selection.dayTags ?? {},
        venueId: draft.selection.venueId ?? null,
        performanceInfo: draft.selection.performanceInfo ?? INITIAL_PERFORMANCE_INFO,
      });
      setStep(draft.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing || submittedId) return;
    saveWizardDraft({ step, selection });
  }, [step, selection, submittedId, isEditing]);

  const quote = useMemo(() => calculateQuote(selection, rateTable), [selection, rateTable]);
  const maxUnlockedStep = !selection.venueId ? 1 : selection.packageId ? TOTAL_STEPS : 3;
  // 패키지 선택 전에도 기본 공연일수를 보여줘야 하므로, 모든 패키지가 공유하는 기본값(2일)을 임시로 사용한다.
  const defaultPerformanceDays = findPackage(rateTable, selection.packageId)?.defaultPerformanceDays ?? 2;

  function goTo(target: number) {
    if (target < 1 || target > TOTAL_STEPS) return;
    if (target > maxUnlockedStep) return;
    setStep(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectVenue(id: string) {
    setSelection((prev) =>
      prev.venueId === id
        ? prev
        : { ...prev, venueId: id, packageId: null, addons: [] },
    );
    setSubmittedId(null);
  }

  function selectPackage(id: number) {
    setSelection((prev) => ({
      ...prev,
      packageId: id,
      addons: pruneUnavailableAddons(rateTable, prev, id),
    }));
    setSubmittedId(null);
  }

  function setAddonQuantity(addonId: string, quantity: number) {
    setSelection((prev) => {
      const rest = prev.addons.filter((a) => a.addonId !== addonId);
      return {
        ...prev,
        addons: quantity > 0 ? [...rest, { addonId, requestedQuantity: quantity }] : rest,
      };
    });
    setSubmittedId(null);
  }

  async function uploadPendingFiles(quoteId: string) {
    if (pendingFiles.length === 0) return;
    const failed: string[] = [];
    for (const file of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) failed.push(file.name);
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length > 0) {
      setAttachmentError(
        `다음 파일은 업로드에 실패했습니다: ${failed.join(", ")}. 신청 내역 상세에서 다시 첨부해주세요.`,
      );
    } else {
      setPendingFiles([]);
    }
  }

  async function submit() {
    if (!currentUser) return;
    setSubmitting(true);
    setSubmitError(null);
    setAttachmentError(null);
    try {
      const res = await fetch(isEditing ? `/api/quotes/${editingQuoteId}` : "/api/quotes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setSessionExpired(true);
          return;
        }
        setSubmitError(data.error || (isEditing ? "신청서 수정에 실패했습니다." : "신청서 제출에 실패했습니다."));
        return;
      }
      setSubmittedId(data.quote.id);
      await uploadPendingFiles(data.quote.id);
      if (!isEditing) clearWizardDraft();
    } catch {
      setSubmitError("네트워크 오류로 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const addonQuantities = Object.fromEntries(
    selection.addons.map((a) => [a.addonId, a.requestedQuantity]),
  );

  return (
    // 좌: 스텝 콘텐츠 / 우: sticky 요약 패널.
    // container-site 는 width:100% 를 명시하므로 5cfc178 의 w-full 요건을 만족한다.
    // (그래도 의도를 남기기 위해 w-full 을 유지한다) 콘텐츠 트랙은 반드시
    // minmax(0,1fr) + min-w-0 로 묶어 스텝 전환 시 폭이 변하지 않게 한다. (310e689)
    // 디자인 가이드 §7.4 — 본문 4컬럼 + 사이드바 2컬럼, 거터 하나만큼 벌린다.
    // 콘텐츠 트랙은 minmax(0,1fr) + min-w-0 로 묶어 스텝 전환 시 폭이 변하지 않게 한다. (310e689)
    <div className="container-site grid-site w-full py-12">
      <div className="min-w-0 lg:col-span-4">
        <StepNav
          step={step}
          maxUnlockedStep={maxUnlockedStep}
          onJump={goTo}
          trackName={VENUES.find((v) => v.id === selection.venueId)?.name}
        />

        {step === 1 && (
          <StepVenue rateTable={rateTable} venueId={selection.venueId} onSelectVenue={selectVenue} />
        )}
        {step === 2 && (
          <Step1Calendar
            week={selection.week}
            excludedDays={selection.excludedDays}
            extraDays={selection.extraDays}
            dayTags={selection.dayTags}
            defaultPerformanceDays={defaultPerformanceDays}
            weekDemand={weekDemand}
            dateBlocks={dateBlocks}
            onChangeWeek={(week) => setSelection((prev) => ({ ...prev, week }))}
            onChangeExcludedDays={(excludedDays) =>
              setSelection((prev) => ({ ...prev, excludedDays }))
            }
            onChangeExtraDays={(extraDays) =>
              setSelection((prev) => ({ ...prev, extraDays }))
            }
            onChangeDayTags={(dayTags) => setSelection((prev) => ({ ...prev, dayTags }))}
          />
        )}
        {step === 3 && (
          <Step1Package
            rateTable={rateTable}
            venueId={selection.venueId ?? DEFAULT_VENUE_ID}
            packageId={selection.packageId}
            expectedAudience={selection.expectedAudience}
            onSelectPackage={selectPackage}
            onChangeAudience={(value) =>
              setSelection((prev) => ({ ...prev, expectedAudience: value }))
            }
          />
        )}
        {step === 4 && <Step3Included rateTable={rateTable} packageId={selection.packageId} />}
        {step === 5 && (
          <Step4Addons
            rateTable={rateTable}
            packageId={selection.packageId}
            addonQuantities={addonQuantities}
            expectedRevenue={selection.expectedRevenue ?? 0}
            onChangeQuantity={setAddonQuantity}
            onChangeRevenue={(value) =>
              setSelection((prev) => ({ ...prev, expectedRevenue: value }))
            }
          />
        )}
        {step === 6 && <Step5Estimate rateTable={rateTable} quote={quote} selection={selection} />}
        {step === 7 && (
          <StepPerformanceInfo
            info={selection.performanceInfo}
            onChange={(performanceInfo) => setSelection((prev) => ({ ...prev, performanceInfo }))}
            files={pendingFiles}
            onFilesChange={setPendingFiles}
          />
        )}
        {step === 8 && (
          <Step6Submit
            rateTable={rateTable}
            quote={quote}
            selection={selection}
            isLoggedIn={!!currentUser && !sessionExpired}
            isEditing={isEditing}
            submitting={submitting}
            submittedId={submittedId}
            error={submitError}
            attachmentError={attachmentError}
            fileCount={pendingFiles.length}
            onSubmit={submit}
          />
        )}

        {/*
          Figma Multi Form / 5 — 폼 하단 버튼은 좌우로 벌리지 않고 **우측에 나란히** 둔다.
          이전(아웃라인) + 다음(검정 채움), 높이 48.
        */}
        <div className="mt-10 flex flex-wrap justify-end gap-3 border-t border-border/25 pt-6">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => goTo(step - 1)}
            className={btnClass("secondary", "lg")}
          >
            <ArrowRight className="rotate-180" />
            이전
          </button>
          {step < TOTAL_STEPS && (
            <button
              type="button"
              disabled={(step === 1 && !selection.venueId) || (step >= 3 && !selection.packageId)}
              onClick={() => goTo(step + 1)}
              className={btnClass("primary", "lg")}
            >
              다음
              <ArrowRight />
            </button>
          )}
        </div>
      </div>

      <SummaryPanel quote={quote} />
    </div>
  );
}
