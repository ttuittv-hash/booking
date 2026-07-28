"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADDON_CATEGORY_LABEL, type RateTable } from "@/lib/pricing/types";

export function RatesForm({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
  const [packages, setPackages] = useState(
    rateTable.packages.map((p) => ({ id: p.id, name: p.name, baseFeePerWeek: p.baseFeePerWeek })),
  );
  const [addons, setAddons] = useState(
    rateTable.addons.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      unitLabel: a.unitLabel,
      unitPrice: a.unitPrice,
      editable: a.pricingType !== "METERED",
    })),
  );
  const [extraWeekRatio, setExtraWeekRatio] = useState(rateTable.extraWeekRatio);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const grouped = new Map<string, typeof addons>();
  for (const addon of addons) {
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraWeekRatio,
          packages: packages.map((p) => ({ id: p.id, baseFeePerWeek: p.baseFeePerWeek })),
          addons: addons.map((a) => ({ id: a.id, unitPrice: a.unitPrice })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(`저장되었습니다. 새 버전: ${data.rateTable.version}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">패키지 기본 대관료 (원/주)</h2>
        <div className="mt-4 space-y-2.5">
          {packages.map((pkg, i) => (
            <div key={pkg.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_200px] sm:gap-3">
              <span className="text-[13.5px]">{pkg.name}</span>
              <input
                type="number"
                min={0}
                value={pkg.baseFeePerWeek}
                onChange={(e) =>
                  setPackages((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, baseFeePerWeek: Number(e.target.value) || 0 } : p)),
                  )
                }
                className="rounded-lg border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 items-center gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_200px] sm:gap-3">
          <div>
            <div className="text-[13.5px] font-medium">초과 주차 단가 비율</div>
            <div className="text-[11.5px] text-muted">기본 대관료 × 이 비율 = 초과 주차 단가 (미확정 임시 규칙)</div>
          </div>
          <input
            type="number"
            min={0}
            step={0.05}
            value={extraWeekRatio}
            onChange={(e) => setExtraWeekRatio(Number(e.target.value) || 0)}
            className="rounded-lg border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">부대시설 단가</h2>
        <div className="mt-4 space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-accent">
                {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
              </div>
              <div className="space-y-2">
                {items.map((addon) => {
                  const globalIndex = addons.findIndex((a) => a.id === addon.id);
                  return (
                    <div key={addon.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_160px] sm:gap-3">
                      <span className="text-[13px]">
                        {addon.name} <span className="text-[11px] text-muted">({addon.unitLabel})</span>
                      </span>
                      {addon.editable ? (
                        <input
                          type="number"
                          min={0}
                          value={addon.unitPrice}
                          onChange={(e) =>
                            setAddons((prev) =>
                              prev.map((a, idx) =>
                                idx === globalIndex ? { ...a, unitPrice: Number(e.target.value) || 0 } : a,
                              ),
                            )
                          }
                          className="rounded-lg border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
                        />
                      ) : (
                        <span className="text-right text-[12.5px] text-muted">실사용 정산 (편집 불가)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-md bg-accent px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "저장 중..." : "요금표 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-[13px] text-muted">{message}</span>}
      </div>
    </div>
  );
}
