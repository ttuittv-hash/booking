"use client";

import { useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { getAddon, getPackage, isAddonAvailable, RATE_TABLE } from "@/lib/pricing/seed";
import type { QuoteSelection } from "@/lib/pricing/types";
import { saveQuoteSnapshot } from "@/lib/quotesStore";
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
  selection: QuoteSelection,
  packageId: number | null,
): QuoteSelection["addons"] {
  const pkg = getPackage(packageId ?? undefined);
  if (!pkg) return [];
  return selection.addons.filter((selected) => {
    const addon = getAddon(selected.addonId);
    return addon ? isAddonAvailable(addon, pkg) : false;
  });
}

export function WizardShell() {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<QuoteSelection>(INITIAL_SELECTION);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const quote = useMemo(() => calculateQuote(selection, RATE_TABLE), [selection]);

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
      addons: pruneUnavailableAddons(prev, id),
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

  function submit() {
    const saved = saveQuoteSnapshot({
      selection: quote.selection,
      rateTableVersion: quote.rateTableVersion,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      vat: quote.vat,
      total: quote.total,
      meteredNotice: quote.meteredNotice,
      status: "ESTIMATE",
    });
    setSubmittedId(saved.id);
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
        {step === 3 && <Step3Included packageId={selection.packageId} />}
        {step === 4 && (
          <Step4Addons
            packageId={selection.packageId}
            addonQuantities={addonQuantities}
            expectedRevenue={selection.expectedRevenue ?? 0}
            onChangeQuantity={setAddonQuantity}
            onChangeRevenue={(value) =>
              setSelection((prev) => ({ ...prev, expectedRevenue: value }))
            }
          />
        )}
        {step === 5 && <Step5Estimate quote={quote} selection={selection} />}
        {step === 6 && (
          <Step6Submit
            quote={quote}
            selection={selection}
            submittedId={submittedId}
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
