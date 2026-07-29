"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import {
  ADDON_CATEGORY_LABEL,
  MEDIA_TIER_LABEL,
  type AddonCategory,
  type AddonItem,
  type MediaTier,
  type RateTable,
} from "@/lib/pricing/types";

type EditablePackage = RateTable["packages"][number];

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (base || "item") + "_" + Math.random().toString(36).slice(2, 6);
}

const MEDIA_OPTIONS: { value: MediaTier; label: string }[] = [
  { value: null, label: "미포함" },
  { value: "BASIC", label: MEDIA_TIER_LABEL.BASIC },
  { value: "EXTENDED", label: MEDIA_TIER_LABEL.EXTENDED },
  { value: "FULL", label: MEDIA_TIER_LABEL.FULL },
];

function blankPackage(id: number): EditablePackage {
  return {
    id,
    name: `패키지 ${id}`,
    audienceTier: { min: 0, max: 0, label: "" },
    baseFeePerWeek: 0,
    includedWeeks: 1,
    includedItems: [],
    mediaTier: null,
    discountRatio: 0,
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: false,
    parkingPerDay: "",
    waitingRoomNote: "",
    sideFacilities: "",
    seatingType: "",
    stageType: "",
  };
}

export function PackagesForm({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
  const [packages, setPackages] = useState<EditablePackage[]>(rateTable.packages);
  const [activeId, setActiveId] = useState(rateTable.packages[0]?.id ?? 1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [addons, setAddons] = useState<AddonItem[]>(rateTable.addons);
  const [newItemCategory, setNewItemCategory] = useState<AddonCategory | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnitLabel, setNewItemUnitLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);

  const active = packages.find((p) => p.id === activeId)!;
  const grouped = new Map<string, AddonItem[]>();
  for (const addon of addons) {
    if (addon.pricingType === "METERED") continue;
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  function update(patch: Partial<EditablePackage>) {
    setPackages((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }

  function addPackage() {
    const nextId = Math.max(0, ...packages.map((p) => p.id)) + 1;
    setPackages((prev) => [...prev, blankPackage(nextId)]);
    setActiveId(nextId);
  }

  function includedQty(addonId: string): number {
    return active.includedItems.find((i) => i.addonId === addonId)?.quantity ?? 0;
  }

  function setIncludedQty(addonId: string, quantity: number) {
    const rest = active.includedItems.filter((i) => i.addonId !== addonId);
    update({
      includedItems: quantity > 0 ? [...rest, { addonId, quantity }] : rest,
    });
  }

  function updateAddonPrice(addonId: string, unitPrice: number) {
    setAddons((prev) => prev.map((a) => (a.id === addonId ? { ...a, unitPrice } : a)));
  }

  function openNewItemForm(category: AddonCategory) {
    setNewItemCategory(category);
    setNewItemName("");
    setNewItemUnitLabel("원/일");
    setNewItemPrice(0);
  }

  function computeTotals(pkg: EditablePackage) {
    const includedValue = pkg.includedItems.reduce((sum, item) => {
      const addon = addons.find((a) => a.id === item.addonId);
      return sum + (addon ? addon.unitPrice * item.quantity : 0);
    }, 0);
    const total = pkg.baseFeePerWeek + includedValue;
    const discount = Math.round(pkg.baseFeePerWeek * pkg.discountRatio);
    return { total, discount, discountedTotal: total - discount };
  }

  const { total: packageTotalValue, discount: discountAmount, discountedTotal: discountedTotalValue } =
    computeTotals(active);

  function confirmNewItem() {
    if (!newItemCategory || !newItemName.trim()) return;
    const id = slugify(newItemName);
    const item: AddonItem = {
      id,
      category: newItemCategory,
      name: newItemName.trim(),
      pricingType: "PER_DAY",
      unitPrice: Math.max(0, newItemPrice || 0),
      unitLabel: newItemUnitLabel.trim() || "원",
      availability: { mode: "ALWAYS" },
      billingPhase: "ESTIMATE",
    };
    setAddons((prev) => [...prev, item]);
    setIncludedQty(id, 1);
    setNewItemCategory(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages, addons }),
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
    <div className="mt-8">
      <div className="sticky top-14 z-10 -mx-6 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-background px-6 sm:top-16">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium outline-none transition-colors",
              p.id === activeId
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={addPackage}
          className="ml-1 shrink-0 whitespace-nowrap px-3 py-3 text-[13px] font-medium text-accent outline-none hover:underline"
        >
          + 새 패키지
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
              <th className="px-4 py-3">패키지</th>
              <th className="px-4 py-3 text-right">기본 대관료</th>
              <th className="px-4 py-3 text-right">총 패키지 가격</th>
              <th className="px-4 py-3 text-right">할인 적용가</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => {
              const t = computeTotals(p);
              return (
                <tr
                  key={p.id}
                  className={`cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-panel/60 ${p.id === activeId ? "bg-accent-soft/40" : ""}`}
                  onClick={() => setActiveId(p.id)}
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{won(p.baseFeePerWeek)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{won(t.total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.discountRatio > 0 ? (
                      <span className="text-accent">{won(t.discountedTotal)}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-[14px] font-semibold">기본 정보</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">패키지 이름</span>
              <input
                type="text"
                value={active.name}
                onChange={(e) => update({ name: e.target.value })}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">기본 대관료 (원/주, 화~일)</span>
              <input
                type="number"
                min={0}
                value={active.baseFeePerWeek}
                onChange={(e) => update({ baseFeePerWeek: Number(e.target.value) || 0 })}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">할인율 적용 (%, 기본 대관료 기준)</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active.discountRatio > 0}
                  onChange={(e) => update({ discountRatio: e.target.checked ? 0.1 : 0 })}
                />
                <input
                  type="number"
                  min={0}
                  max={90}
                  disabled={active.discountRatio === 0}
                  value={Math.round(active.discountRatio * 100)}
                  onChange={(e) =>
                    update({ discountRatio: Math.min(90, Math.max(0, Number(e.target.value) || 0)) / 100 })
                  }
                  className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent disabled:opacity-40"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">객석 규모 최소</span>
              <input
                type="number"
                min={0}
                value={active.audienceTier.min}
                onChange={(e) =>
                  update({ audienceTier: { ...active.audienceTier, min: Number(e.target.value) || 0 } })
                }
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">객석 규모 최대</span>
              <input
                type="number"
                min={0}
                value={active.audienceTier.max}
                onChange={(e) =>
                  update({ audienceTier: { ...active.audienceTier, max: Number(e.target.value) || 0 } })
                }
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] text-muted">규모 표시 라벨 (예: ~12,000석 규모)</span>
              <input
                type="text"
                value={active.audienceTier.label}
                onChange={(e) => update({ audienceTier: { ...active.audienceTier, label: e.target.value } })}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">홍보 매체 등급</span>
              <select
                value={active.mediaTier ?? ""}
                onChange={(e) => update({ mediaTier: (e.target.value || null) as MediaTier })}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              >
                {MEDIA_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ""}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={active.outdoorPlazaIncluded}
                onChange={(e) => update({ outdoorPlazaIncluded: e.target.checked })}
              />
              <span className="text-[13px]">야외광장 · 티켓박스 포함</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-panel/60 px-4 py-3">
            <div>
              <div className="text-[12px] text-muted">
                총 패키지 가격 (기본 대관료 + 기본 포함 항목 단가 합계)
              </div>
              <div className="mt-1 text-[16px] font-semibold tabular-nums">
                {won(packageTotalValue)}
                {active.discountRatio > 0 && (
                  <span className="ml-2 text-[13px] font-medium text-accent">
                    할인 적용 시 {won(discountedTotalValue)}
                  </span>
                )}
              </div>
            </div>
            {active.discountRatio > 0 && (
              <div className="text-[12px] text-muted">
                할인 {Math.round(active.discountRatio * 100)}% (−{won(discountAmount)})
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[14px] font-semibold">패키지 안내 문구 (대관시스템 노출)</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["dayBreakdown", "세부 구성"],
                ["rentalHours", "대관시간"],
                ["parkingPerDay", "주차 기본 제공"],
                ["waitingRoomNote", "대기실 상세"],
                ["sideFacilities", "부속공간"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[12px] text-muted">{label}</span>
                <input
                  type="text"
                  value={active[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-[12px] text-muted">기본 공연일수 (세부 구성의 숫자값 — 준비일/공연일 조정 과금 기준)</span>
              <input
                type="number"
                min={0}
                value={active.defaultPerformanceDays}
                onChange={(e) => update({ defaultPerformanceDays: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-[14px] font-semibold">내부 참고 정보 (대관시스템 미노출)</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["seatingType", "객석 운영 형태"],
                ["stageType", "무대형태"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-[12px] text-muted">{label}</span>
                <input
                  type="text"
                  value={active[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[14px] font-semibold">기본 포함 항목 · 요금</h2>
          <p className="mt-1 text-[12px] text-muted">
            체크한 항목은 아래 입력한 수량만큼 이 패키지에 기본 포함되며, 초과분만 4단계에서 추가 과금됩니다.
            항목별 단가는 요금표 관리와 동일한 값이며, 여기서 수정하면 요금표에도 함께 반영됩니다.
          </p>
          <div className="mt-4 space-y-5">
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
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
                <div className="space-y-1.5">
                  {items.map((addon) => {
                    const qty = includedQty(addon.id);
                    const checked = qty > 0;
                    return (
                      <div
                        key={addon.id}
                        className="flex flex-col gap-2 border-b border-border/50 pb-1.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <label className="flex items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setIncludedQty(addon.id, e.target.checked ? 1 : 0)}
                          />
                          {addon.name}
                          <span className="text-[11px] text-muted">({addon.unitLabel})</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted">기본 수량</span>
                            <input
                              type="number"
                              min={1}
                              disabled={!checked}
                              value={checked ? qty : ""}
                              placeholder="-"
                              onChange={(e) => setIncludedQty(addon.id, Math.max(1, Number(e.target.value) || 1))}
                              className="w-16 rounded-sm border border-border bg-panel px-3 py-1.5 text-right text-[13px] outline-none focus:border-accent disabled:opacity-40"
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted">단가</span>
                            <input
                              type="number"
                              min={0}
                              value={addon.unitPrice}
                              onChange={(e) => updateAddonPrice(addon.id, Math.max(0, Number(e.target.value) || 0))}
                              className="w-32 rounded-sm border border-border bg-panel px-3 py-1.5 text-right text-[13px] outline-none focus:border-accent"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {newItemCategory === category && (
                  <div className="mt-3 flex flex-col gap-2 rounded-sm border border-dashed border-accent/40 bg-accent-soft/40 p-3 sm:flex-row sm:items-center">
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
      </div>

      <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-sm bg-accent px-7 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "저장 중..." : "패키지 구성 · 가격 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-[13px] text-muted">{message}</span>}
      </div>
    </div>
  );
}
