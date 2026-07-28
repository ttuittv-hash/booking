"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { findAddon, findPackage, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import type { AppUser, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { StepNav } from "./StepNav";
import { SummaryPanel } from "./SummaryPanel";
import { Step1Package } from "./Step1Package";
import { Step2Week } from "./Step2Week";
import { Step3Included } from "./Step3Included";
import { Step4Addons } from "./Step4Addons";
import { Step5Estimate } from "./Step5Estimate";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 6;

const INITIAL_SELECTION: QuoteSelection = {
  packageId: null,
  week: { year: 2027, month: 8, weekOfMonth: 1 },
  extraWeeks: 0,
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
}: {
  rateTable: RateTable;
  currentUser: AppUser | null;
}) {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<QuoteSelection>(INITIAL_SELECTION);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 로그인 리다이렉트 등으로 페이지를 이탈했다가 돌아와도 입력값을 복원한다.
  useEffect(() => {
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회만 복원한다.
    const draft = loadWizardDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(draft.selection);
      setStep(draft.step);
    }
  }, []);

  useEffect(() => {
    if (submittedId) return;
    saveWizardDraft({ step, selection });
  }, [step, selection, submittedId]);

  const quote = useMemo(() => calculateQuote(selection, rateTable), [selection, rateTable]);

  function goTo(target: number) {
    if (target < 1 || target > TOTAL_STEPS) return;
    if (target > 1 && !selection.packageId) return;
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
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "신청서 제출에 실패했습니다.");
        return;
      }
      setSubmittedId(data.quote.id);
      clearWizardDraft();
    } catch {
      setSubmitError("네트워크 오류로 제출에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const addonQuantities = Object.fromEntries(
    selection.addons.map((a) => [a.addonId, a.requestedQuantity]),
  );

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <StepNav step={step} canJump={!!selection.packageId} onJump={goTo} />

        {step === 1 && (
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
        {step === 2 && (
          <Step2Week
            week={selection.week}
            extraWeeks={selection.extraWeeks}
            onChangeWeek={(week) => setSelection((prev) => ({ ...prev, week }))}
            onChangeExtraWeeks={(extraWeeks) =>
              setSelection((prev) => ({ ...prev, extraWeeks }))
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
            isLoggedIn={!!currentUser}
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
            className="rounded-full border border-border px-5 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 이전
          </button>
          {step < TOTAL_STEPS && (
            <button
              type="button"
              disabled={!selection.packageId}
              onClick={() => goTo(step + 1)}
              className="rounded-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
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
