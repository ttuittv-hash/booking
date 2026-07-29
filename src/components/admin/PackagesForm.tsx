"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADDON_CATEGORY_LABEL, MEDIA_TIER_LABEL, type MediaTier, type RateTable } from "@/lib/pricing/types";

type EditablePackage = RateTable["packages"][number];

const MEDIA_OPTIONS: { value: MediaTier; label: string }[] = [
  { value: null, label: "미포함" },
  { value: "BASIC", label: MEDIA_TIER_LABEL.BASIC },
  { value: "EXTENDED", label: MEDIA_TIER_LABEL.EXTENDED },
  { value: "FULL", label: MEDIA_TIER_LABEL.FULL },
];

export function PackagesForm({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
  const [packages, setPackages] = useState<EditablePackage[]>(rateTable.packages);
  const [activeId, setActiveId] = useState(rateTable.packages[0]?.id ?? 1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active = packages.find((p) => p.id === activeId)!;
  const grouped = new Map<string, typeof rateTable.addons>();
  for (const addon of rateTable.addons) {
    if (addon.pricingType === "METERED") continue;
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  function update(patch: Partial<EditablePackage>) {
    setPackages((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
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

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages }),
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
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-[14px] font-semibold">기본 정보</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <h2 className="text-[14px] font-semibold">기본 포함 항목</h2>
          <p className="mt-1 text-[12px] text-muted">
            체크한 항목은 아래 입력한 수량만큼 이 패키지에 기본 포함되며, 초과분만 4단계에서 추가 과금됩니다.
          </p>
          <div className="mt-4 space-y-5">
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
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
                        </label>
                        {checked && (
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) => setIncludedQty(addon.id, Math.max(1, Number(e.target.value) || 1))}
                            className="w-28 rounded-sm border border-border bg-panel px-3 py-1.5 text-right text-[13px] outline-none focus:border-accent"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
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
          {saving ? "저장 중..." : "패키지 구성 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-[13px] text-muted">{message}</span>}
      </div>
    </div>
  );
}
