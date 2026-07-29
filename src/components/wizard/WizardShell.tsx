"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { findAddon, findPackage, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import type { AppUser, DateBlock, QuoteSelection, RateTable, WeekDemand } from "@/lib/pricing/types";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { StepNav } from "./StepNav";
import { SummaryPanel } from "./SummaryPanel";
import { Step1Calendar } from "./Step1Calendar";
import { Step1Package } from "./Step1Package";
import { Step3Included } from "./Step3Included";
import { Step4Addons } from "./Step4Addons";
import { Step5Estimate } from "./Step5Estimate";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 6;

// 오늘 기준 다음 달을 기본값으로 — 과거 임의의 연도로 고정돼 있으면 신청자가 매번
// 달력을 여러 달 넘겨야 하고, 자신이 신청한 주차의 경합 현황도 바로 보이지 않는다.
function defaultWeek(): QuoteSelection["week"] {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1, weekOfMonth: 1 };
}

const INITIAL_SELECTION: QuoteSelection = {
  packageId: null,
  week: defaultWeek(),
  excludedDays: [],
  extraDays: 0,
  dayTags: {},
  expectedAudience: 8000,
  expectedRevenue: 0,
  addons: [],
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
}: {
  rateTable: RateTable;
  currentUser: AppUser | null;
  weekDemand: WeekDemand[];
  dateBlocks: DateBlock[];
  editingQuoteId?: string;
  initialSelection?: QuoteSelection;
}) {
  const isEditing = !!editingQuoteId;
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<QuoteSelection>(initialSelection ?? INITIAL_SELECTION);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 위저드 진행 중(입력에 시간이 걸리는 동안) 세션이 만료될 수 있으므로,
  // 최초 렌더의 currentUser 값과 별개로 제출 시점에 401을 감지해 로그인 안내로 전환한다.
  const [sessionExpired, setSessionExpired] = useState(false);

  // 로그인 리다이렉트 등으로 페이지를 이탈했다가 돌아와도 입력값을 복원한다.
  // (기존 신청서 수정 중에는 새 신청서용 임시저장 내용을 불러오지 않는다.)
  useEffect(() => {
    if (isEditing) return;
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회만 복원한다.
    const draft = loadWizardDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection({ ...INITIAL_SELECTION, ...draft.selection, dayTags: draft.selection.dayTags ?? {} });
      setStep(draft.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing || submittedId) return;
    saveWizardDraft({ step, selection });
  }, [step, selection, submittedId, isEditing]);

  const quote = useMemo(() => calculateQuote(selection, rateTable), [selection, rateTable]);
  const maxUnlockedStep = selection.packageId ? TOTAL_STEPS : 2;
  // 패키지 선택 전에도 기본 공연일수를 보여줘야 하므로, 모든 패키지가 공유하는 기본값(2일)을 임시로 사용한다.
  const defaultPerformanceDays = findPackage(rateTable, selection.packageId)?.defaultPerformanceDays ?? 2;

  function goTo(target: number) {
    if (target < 1 || target > TOTAL_STEPS) return;
    if (target > maxUnlockedStep) return;
    setStep(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function submit() {
    if (!currentUser) return;
    setSubmitting(true);
    setSubmitError(null);
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
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <StepNav step={step} maxUnlockedStep={maxUnlockedStep} onJump={goTo} />

        {step === 1 && (
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
        {step === 2 && (
          <Step1Package
            rateTable={rateTable}
            packageId={selection.packageId}
            expectedAudience={selection.expectedAudience}
            onSelectPackage={selectPackage}
            onChangeAudience={(value) =>
              setSelection((prev) => ({ ...prev, expectedAudience: value }))
            }
          />
        )}
        {step === 3 && <Step3Included rateTable={rateTable} packageId={selection.packageId} />}
        {step === 4 && (
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
        {step === 5 && <Step5Estimate rateTable={rateTable} quote={quote} selection={selection} />}
        {step === 6 && (
          <Step6Submit
            rateTable={rateTable}
            quote={quote}
            selection={selection}
            isLoggedIn={!!currentUser && !sessionExpired}
            isEditing={isEditing}
            submitting={submitting}
            submittedId={submittedId}
            error={submitError}
            onSubmit={submit}
          />
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => goTo(step - 1)}
            className="rounded-sm border border-border px-5 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 이전
          </button>
          {step < TOTAL_STEPS && (
            <button
              type="button"
              disabled={step >= 2 && !selection.packageId}
              onClick={() => goTo(step + 1)}
              className="rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 →
            </button>
          )}
        </div>
      </div>

      <SummaryPanel quote={quote} />
    </div>
  );
}
