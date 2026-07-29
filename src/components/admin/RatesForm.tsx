"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADDON_CATEGORY_LABEL, type AddonCategory, type RateTable } from "@/lib/pricing/types";

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (base || "item") + "_" + Math.random().toString(36).slice(2, 6);
}

export function RatesForm({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
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
  const [dayExclusionDiscountRatio, setDayExclusionDiscountRatio] = useState(
    rateTable.dayExclusionDiscountRatio,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newItemCategory, setNewItemCategory] = useState<AddonCategory | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnitLabel, setNewItemUnitLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);

  const grouped = new Map<string, typeof addons>();
  for (const addon of addons) {
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  function openNewItemForm(category: AddonCategory) {
    setNewItemCategory(category);
    setNewItemName("");
    setNewItemUnitLabel("원/일");
    setNewItemPrice(0);
  }

  function confirmNewItem() {
    if (!newItemCategory || !newItemName.trim()) return;
    const id = slugify(newItemName);
    setAddons((prev) => [
      ...prev,
      {
        id,
        name: newItemName.trim(),
        category: newItemCategory,
        unitLabel: newItemUnitLabel.trim() || "원",
        unitPrice: Math.max(0, newItemPrice || 0),
        editable: true,
      },
    ]);
    setNewItemCategory(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const originalIds = new Set(rateTable.addons.map((a) => a.id));
      const newAddons = addons
        .filter((a) => !originalIds.has(a.id))
        .map((a) => ({ id: a.id, name: a.name, category: a.category, unitLabel: a.unitLabel, unitPrice: a.unitPrice }));
      const res = await fetch("/api/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraWeekRatio,
          dayExclusionDiscountRatio,
          addons: addons.map((a) => ({ id: a.id, unitPrice: a.unitPrice })),
          newAddons,
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
      <section className="rounded border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">공통 요율</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          패키지별 기본 대관료는 &ldquo;패키지 관리&rdquo;에서 함께 편집합니다. 여기서는 모든
          패키지에 공통 적용되는 비율과 부대시설 단가만 관리합니다.
        </p>

        <div className="mt-5 grid grid-cols-1 items-center gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_200px] sm:gap-3">
          <div>
            <div className="text-[13.5px] font-medium">추가 일수 단가 비율</div>
            <div className="text-[11.5px] text-muted">
              기본 대관료 × 이 비율 ÷ 6일 = 일요일 이후 하루 추가 단가 (미확정 임시 규칙)
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.05}
            value={extraWeekRatio}
            onChange={(e) => setExtraWeekRatio(Number(e.target.value) || 0)}
            className="rounded border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 items-center gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_200px] sm:gap-3">
          <div>
            <div className="text-[13.5px] font-medium">제외 요일 할인 비율</div>
            <div className="text-[11.5px] text-muted">
              기본 대관료 × 이 비율 = 화~일 중 제외한 요일 1일당 할인액 (미확정 임시 규칙)
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.01}
            value={dayExclusionDiscountRatio}
            onChange={(e) => setDayExclusionDiscountRatio(Number(e.target.value) || 0)}
            className="rounded border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="rounded border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">부대시설 단가</h2>
        <div className="mt-4 space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">
                  {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
                </span>
                <button
                  type="button"
                  onClick={() => openNewItemForm(category as AddonCategory)}
                  className="rounded-sm px-2 py-1 text-[11.5px] font-medium text-accent hover:underline"
                >
                  + 항목 추가
                </button>
              </div>
              <div className="divide-y divide-border/50">
                {items.map((addon) => {
                  const globalIndex = addons.findIndex((a) => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[1fr_160px] sm:gap-3"
                    >
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
                          className="rounded border border-border bg-panel px-3 py-2 text-right text-[13px] outline-none focus:border-accent"
                        />
                      ) : (
                        <span className="text-right text-[12.5px] text-muted">실사용 정산 (편집 불가)</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {newItemCategory === category && (
                <div className="mt-2 flex flex-col gap-2 rounded-sm border border-dashed border-accent/40 bg-accent-soft/40 p-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    autoFocus
                    placeholder="항목 이름"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 rounded-sm border border-border bg-background px-3 py-1.5 text-[13px] outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder="단위 (예: 원/일)"
                    value={newItemUnitLabel}
                    onChange={(e) => setNewItemUnitLabel(e.target.value)}
                    className="w-32 rounded-sm border border-border bg-background px-3 py-1.5 text-[13px] outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="단가"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 rounded-sm border border-border bg-background px-3 py-1.5 text-right text-[13px] outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmNewItem}
                      disabled={!newItemName.trim()}
                      className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItemCategory(null)}
                      className="rounded-sm border border-border px-3 py-1.5 text-[12.5px] text-muted"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-sm bg-accent px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "저장 중..." : "요금표 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-[13px] text-muted">{message}</span>}
      </div>
    </div>
  );
}
