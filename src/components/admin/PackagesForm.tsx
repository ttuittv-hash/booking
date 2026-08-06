"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { won } from "@/lib/format";
import { Label, btnClass } from "@/components/ui/kit";
import {
  FIELD,
  FIELD_BASE,
  FIELD_LABEL,
  HELP,
  SUB_TITLE,
  TABLE,
  TABLE_WRAP,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  TAB_BAR,
  tabCls,
} from "./adminUi";
import {
  ADDON_CATEGORY_LABEL,
  DEFAULT_VENUE_ID,
  MEDIA_TIER_LABEL,
  VENUES,
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
    venueId: DEFAULT_VENUE_ID,
    name: `패키지 ${id}`,
    tagline: "",
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
      <div className={TAB_BAR}>
        {packages.map((p) => (
          <button key={p.id} type="button" onClick={() => setActiveId(p.id)} className={tabCls(p.id === activeId)}>
            {p.name}
            <span className="ml-1.5 font-normal text-muted">
              {VENUES.find((v) => v.id === (p.venueId ?? DEFAULT_VENUE_ID))?.name}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={addPackage}
          className="ml-1 shrink-0 whitespace-nowrap px-3 py-3 text-xs font-bold underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong"
        >
          + 새 패키지
        </button>
      </div>

      <div className={`mt-6 ${TABLE_WRAP}`}>
        <table className={`${TABLE} min-w-[560px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>패키지</th>
              <th className={TH_NUM}>기본 대관료</th>
              <th className={TH_NUM}>총 패키지 가격</th>
              <th className={TH_NUM}>할인 적용가</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => {
              const t = computeTotals(p);
              return (
                <tr
                  key={p.id}
                  className={`${TR} cursor-pointer transition-colors ${
                    p.id === activeId ? "bg-accent/15" : "hover:bg-foreground/[0.03]"
                  }`}
                  onClick={() => setActiveId(p.id)}
                >
                  <td className={`${TD} font-bold`}>{p.name}</td>
                  <td className={TD_NUM}>{won(p.baseFeePerWeek)}</td>
                  <td className={TD_NUM}>{won(t.total)}</td>
                  <td className={TD_NUM}>
                    {p.discountRatio > 0 ? (
                      <span className="font-bold">{won(t.discountedTotal)}</span>
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
          <h2 className={SUB_TITLE}>기본 정보</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={FIELD_LABEL}>공간</span>
              <select
                value={active.venueId ?? DEFAULT_VENUE_ID}
                onChange={(e) => update({ venueId: e.target.value })}
                className={FIELD}
              >
                {VENUES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>패키지 이름</span>
              <input
                type="text"
                value={active.name}
                onChange={(e) => update({ name: e.target.value })}
                className={FIELD}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={FIELD_LABEL}>
                패키지 한 줄 소개 (예: &quot;OOO을 위한 OOO&quot; — 패키지별 핵심 특징 요약, 패키지 선택 화면과 안내 페이지에 표시됩니다)
              </span>
              <input
                type="text"
                value={active.tagline}
                onChange={(e) => update({ tagline: e.target.value })}
                placeholder="예: 합리적인 규모의 콘서트를 위한 스탠더드 패키지"
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>기본 대관료 (원/주, 화~일)</span>
              <input
                type="number"
                min={0}
                value={active.baseFeePerWeek}
                onChange={(e) => update({ baseFeePerWeek: Number(e.target.value) || 0 })}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>할인율 적용 (%, 기본 대관료 기준)</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-accent"
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
                  className={FIELD}
                />
              </div>
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>객석 규모 최소</span>
              <input
                type="number"
                min={0}
                value={active.audienceTier.min}
                onChange={(e) =>
                  update({ audienceTier: { ...active.audienceTier, min: Number(e.target.value) || 0 } })
                }
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>객석 규모 최대</span>
              <input
                type="number"
                min={0}
                value={active.audienceTier.max}
                onChange={(e) =>
                  update({ audienceTier: { ...active.audienceTier, max: Number(e.target.value) || 0 } })
                }
                className={FIELD}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={FIELD_LABEL}>규모 표시 라벨 (예: ~12,000석 규모)</span>
              <input
                type="text"
                value={active.audienceTier.label}
                onChange={(e) => update({ audienceTier: { ...active.audienceTier, label: e.target.value } })}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>홍보 매체 등급</span>
              <select
                value={active.mediaTier ?? ""}
                onChange={(e) => update({ mediaTier: (e.target.value || null) as MediaTier })}
                className={FIELD}
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
                className="accent-accent"
                checked={active.outdoorPlazaIncluded}
                onChange={(e) => update({ outdoorPlazaIncluded: e.target.checked })}
              />
              <span className="text-s">야외광장 · 티켓박스 포함</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent bg-surface px-4 py-3">
            <div>
              <div className={HELP}>총 패키지 가격 (기본 대관료 + 기본 포함 항목 단가 합계)</div>
              <div className="type-display mt-1 text-h6-m tabular-nums">
                {won(packageTotalValue)}
                {active.discountRatio > 0 && (
                  <span className="ml-3 text-s font-bold text-muted-strong">
                    할인 적용 시 {won(discountedTotalValue)}
                  </span>
                )}
              </div>
            </div>
            {active.discountRatio > 0 && (
              <div className={`${HELP} tabular-nums`}>
                할인 {Math.round(active.discountRatio * 100)}% (−{won(discountAmount)})
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className={SUB_TITLE}>패키지 안내 문구 (대관시스템 노출)</h2>
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
                <span className={FIELD_LABEL}>{label}</span>
                <input
                  type="text"
                  value={active[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className={FIELD}
                />
              </label>
            ))}
            <label className="block">
              <span className={FIELD_LABEL}>기본 공연일수 (세부 구성의 숫자값 — 준비일/공연일 조정 과금 기준)</span>
              <input
                type="number"
                min={0}
                value={active.defaultPerformanceDays}
                onChange={(e) => update({ defaultPerformanceDays: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                className={FIELD}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className={SUB_TITLE}>내부 참고 정보 (대관시스템 미노출)</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["seatingType", "객석 운영 형태"],
                ["stageType", "무대형태"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className={FIELD_LABEL}>{label}</span>
                <input
                  type="text"
                  value={active[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className={FIELD}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className={SUB_TITLE}>기본 포함 항목 · 요금</h2>
          <p className={`mt-2 ${HELP}`}>
            체크한 항목은 아래 입력한 수량만큼 이 패키지에 기본 포함되며, 초과분만 4단계에서 추가 과금됩니다.
            항목별 단가는 요금표 관리와 동일한 값이며, 여기서 수정하면 요금표에도 함께 반영됩니다.
          </p>
          <div className="mt-4 space-y-5">
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category}>
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/25 pb-1.5">
                  <Label className="text-muted">
                    {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
                  </Label>
                  <button
                    type="button"
                    onClick={() => openNewItemForm(category as AddonCategory)}
                    className="text-xs font-bold underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong"
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
                        className="flex flex-col gap-2 border-b border-border-soft py-1.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <label className="flex items-center gap-2 text-s">
                          <input
                            type="checkbox"
                            className="accent-accent"
                            checked={checked}
                            onChange={(e) => setIncludedQty(addon.id, e.target.checked ? 1 : 0)}
                          />
                          {addon.name}
                          <span className="text-xs text-muted">({addon.unitLabel})</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">기본 수량</span>
                            <input
                              type="number"
                              min={1}
                              disabled={!checked}
                              value={checked ? qty : ""}
                              placeholder="-"
                              onChange={(e) => setIncludedQty(addon.id, Math.max(1, Number(e.target.value) || 1))}
                              className={`w-16 ${FIELD_BASE} text-right tabular-nums`}
                            />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">단가</span>
                            <input
                              type="number"
                              min={0}
                              value={addon.unitPrice}
                              onChange={(e) => updateAddonPrice(addon.id, Math.max(0, Number(e.target.value) || 0))}
                              className={`w-32 ${FIELD_BASE} text-right tabular-nums`}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {newItemCategory === category && (
                  <div className="mt-3 flex flex-col gap-2 border-l-2 border-accent bg-background p-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      autoFocus
                      placeholder="항목 이름"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className={`flex-1 ${FIELD_BASE}`}
                    />
                    <input
                      type="text"
                      placeholder="단위 (예: 원/일)"
                      value={newItemUnitLabel}
                      onChange={(e) => setNewItemUnitLabel(e.target.value)}
                      className={`w-32 ${FIELD_BASE}`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="단가"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Math.max(0, Number(e.target.value) || 0))}
                      className={`w-28 ${FIELD_BASE} text-right tabular-nums`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={confirmNewItem}
                        disabled={!newItemName.trim()}
                        className={btnClass("primary", "sm")}
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewItemCategory(null)}
                        className={btnClass("ghost", "sm")}
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

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border/20 pt-6">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={btnClass("primary", "lg")}
        >
          {saving ? "저장 중..." : "패키지 구성 · 가격 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-s text-muted">{message}</span>}
      </div>
    </div>
  );
}
