"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryTab } from "@/components/admin/useQueryTab";
import { num, won } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  FIELD,
  FIELD_LABEL,
  FIELD_NUM,
  FIELD_SM,
  HELP,
  LINK_BTN,
  NONE,
  SUB_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_ACTIONS,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD_ID,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  TR_HOVER,
  TAB_BAR,
  tabCls,
  REMOVE_BTN,
} from "./adminUi";
import {
  ADDON_CATEGORY_LABEL,
  DEFAULT_VENUE_ID,
  MEDIA_TIER_LABEL,
  VENUES,
  type AddonCategory,
  type AddonItem,
  type LineItemVisibility,
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

const ADDON_CATEGORIES = Object.keys(ADDON_CATEGORY_LABEL) as AddonCategory[];

const MEDIA_OPTIONS: { value: MediaTier; label: string }[] = [
  { value: null, label: "미포함" },
  { value: "BASIC", label: MEDIA_TIER_LABEL.BASIC },
  { value: "EXTENDED", label: MEDIA_TIER_LABEL.EXTENDED },
  { value: "FULL", label: MEDIA_TIER_LABEL.FULL },
];

function blankPackage(id: number, venueId: string): EditablePackage {
  return {
    id,
    venueId,
    name: `패키지 ${id}`,
    tagline: "",
    audienceTier: { min: 0, max: 0, label: "" },
    baseFeePerWeek: 0,
    bowlFee: 0,
    includedWeeks: 1,
    includedItems: [],
    mediaTier: null,
    discountRatio: 0,
    setupExtraDayFee: 0,
    performanceExtraDayFee: 0,
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

// URL 은 공개 화면과 같은 이름(?venue=arena|live-hall)을 쓰고, 내부 venueId 와 매핑한다.
const VENUE_URL_VALUES = ["arena", "live-hall"] as const;
const URL_TO_VENUE: Record<string, "arena" | "medium-hall"> = { arena: "arena", "live-hall": "medium-hall" };
const VENUE_TO_URL: Record<"arena" | "medium-hall", "arena" | "live-hall"> = { arena: "arena", "medium-hall": "live-hall" };

export function PackagesForm({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
  const [packages, setPackages] = useState<EditablePackage[]>(rateTable.packages);
  const [activeId, setActiveId] = useState(rateTable.packages[0]?.id ?? 1);
  const [venueUrl, setVenueUrl] = useQueryTab("venue", VENUE_URL_VALUES, "arena");
  const venueTab = URL_TO_VENUE[venueUrl];
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [addons, setAddons] = useState<AddonItem[]>(rateTable.addons);
  const [newItemCategory, setNewItemCategory] = useState<AddonCategory | null>(null);
  const [newItemVisibility, setNewItemVisibility] = useState<LineItemVisibility>("VISIBLE");
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnitLabel, setNewItemUnitLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [pickerCategory, setPickerCategory] = useState<AddonCategory>(ADDON_CATEGORIES[0]);

  const active = packages.find((p) => p.id === activeId)!;
  const venuePackages = packages.filter((p) => (p.venueId ?? DEFAULT_VENUE_ID) === venueTab);

  function selectVenueTab(v: "arena" | "medium-hall") {
    setVenueUrl(VENUE_TO_URL[v]);
    const first = packages.find((p) => (p.venueId ?? DEFAULT_VENUE_ID) === v);
    if (first) setActiveId(first.id);
  }

  // [화면 뼈대 2026-08-19] 패키지 구성을 신청자 노출 등급 기준 3분류로 나눠 보여준다 —
  // ① 기본 내역(ITEM_ONLY, 항목명만 노출) ② Bowl 사용료 + 유틸리티(HIDDEN, 완전 비노출)
  // ③ 선택 가능 옵션(VISIBLE, 항목·금액 모두 노출). 같은 addon 목록을 그룹핑 방식만 바꿔서
  // 재사용한다 — 요금 계산 로직에는 영향 없음(표시 전용 재구성).
  function groupByCategory(items: AddonItem[]): Map<string, AddonItem[]> {
    const map = new Map<string, AddonItem[]>();
    for (const addon of items) {
      const list = map.get(addon.category) ?? [];
      list.push(addon);
      map.set(addon.category, list);
    }
    return map;
  }
  const billableAddons = addons.filter((a) => a.pricingType !== "METERED");
  const baseDetailAddons = groupByCategory(billableAddons.filter((a) => a.visibility === "ITEM_ONLY"));
  const hiddenAddons = groupByCategory(billableAddons.filter((a) => a.visibility === "HIDDEN"));
  const optionAddons = groupByCategory(billableAddons.filter((a) => a.visibility === "VISIBLE"));

  function update(patch: Partial<EditablePackage>) {
    setPackages((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }

  function addPackage() {
    const nextId = Math.max(0, ...packages.map((p) => p.id)) + 1;
    setPackages((prev) => [...prev, blankPackage(nextId, venueTab)]);
    setActiveId(nextId);
  }

  /** 패키지 삭제 — 공간별 마지막 하나는 남긴다(고를 것이 없으면 신청이 막힌다) */
  function removePackage(id: number) {
    const target = packages.find((p) => p.id === id);
    if (!target) return;
    if (packages.filter((p) => p.venueId === target.venueId).length <= 1) {
      alert("이 공간의 마지막 패키지는 삭제할 수 없습니다. 새 패키지를 먼저 추가하세요.");
      return;
    }
    if (!confirm(`「${target.name}」 패키지를 삭제할까요?`)) return;
    const rest = packages.filter((p) => p.id !== id);
    setPackages(rest);
    if (activeId === id) setActiveId(rest[0]?.id ?? 0);
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

  function updateAddonVisibility(addonId: string, visibility: LineItemVisibility) {
    setAddons((prev) => prev.map((a) => (a.id === addonId ? { ...a, visibility } : a)));
  }

  /**
   * ③ 선택 가능 옵션 전용 — "이 패키지에서 노출되는가"(2026-08-23, "체크한것만 노출되는걸로
   * 바꿔라" · "제공이 아닌 노출로 변경"). availability.mode가 ALWAYS/IF_PACKAGE_IN인 항목만
   * 대상이다(IF_NOT_INCLUDED는 "이미 포함돼 있지 않을 때만"이라는 별도 자동 규칙이라 이
   * 토글 대상이 아니다).
   *
   * 무상 포함 수량(includedItems)과는 완전히 별개 값이다 — 노출만 켜고 무상 수량은 0으로
   * 둘 수 있어야, 무상 제공 없이 "유상으로 살 수 있게만" 하는 패키지를 만들 수 있다.
   */
  function isExposedForActive(addon: AddonItem): boolean {
    if (addon.availability.mode === "IF_PACKAGE_IN") {
      return !!addon.availability.packages?.includes(active.id);
    }
    return true; // ALWAYS · IF_NOT_INCLUDED — 토글 없이 항상 노출로 취급
  }

  function setExposedForActive(addon: AddonItem, exposed: boolean) {
    setAddons((prev) =>
      prev.map((a) => {
        if (a.id !== addon.id) return a;
        // ALWAYS였다면 지금까지 전 패키지에 노출되던 상태다 — 그 노출을 그대로 유지한 채
        // (전 패키지 id를 명시적으로 채워서) 이 패키지만 빼거나 넣는다. 그래야 이 패키지에서
        // 한 번 껐다고 다른 패키지에서까지 갑자기 안 보이는 회귀가 안 생긴다.
        const base = a.availability.mode === "IF_PACKAGE_IN" ? (a.availability.packages ?? []) : packages.map((p) => p.id);
        const next = exposed ? Array.from(new Set([...base, active.id])) : base.filter((id) => id !== active.id);
        return { ...a, availability: { mode: "IF_PACKAGE_IN", packages: next } };
      }),
    );
  }

  /**
   * 항목 삭제 — 목록에서 빼고, 모든 패키지의 기본 포함 수량에서도 함께 지운다.
   * 한쪽만 지우면 화면에는 안 보이는데 견적에는 남는 유령 항목이 된다.
   */
  function removeAddon(addonId: string) {
    const addon = addons.find((a) => a.id === addonId);
    if (!confirm(`「${addon?.name ?? addonId}」 항목을 삭제할까요?\n모든 패키지의 기본 포함 설정에서도 함께 지워집니다.`)) return;
    setAddons((prev) => prev.filter((a) => a.id !== addonId));
    setPackages((prev) =>
      prev.map((pkg) => ({
        ...pkg,
        includedItems: pkg.includedItems.filter((it) => it.addonId !== addonId),
      })),
    );
  }

  function openNewItemForm(category: AddonCategory, visibility: LineItemVisibility) {
    setNewItemCategory(category);
    setNewItemVisibility(visibility);
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
      // 선택 옵션으로 새로 만드는 항목은 지금 편집 중인 이 패키지에만 우선 노출한다 —
      // 다른 패키지에서도 팔려면 그 패키지 편집 화면에서 "노출" 체크를 따로 켜야 한다.
      availability:
        newItemVisibility === "VISIBLE" ? { mode: "IF_PACKAGE_IN", packages: [activeId] } : { mode: "ALWAYS" },
      billingPhase: "ESTIMATE",
      visibility: newItemVisibility,
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
      {/* 1뎁스: 공간 — 패키지가 늘어 한 줄에 다 못 들어간다(그쪽 개편). */}
      <div className="flex gap-1 border-b border-border/20">
        {(["arena", "medium-hall"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => selectVenueTab(v)}
            className={tabCls(venueTab === v)}
          >
            {VENUES.find((venue) => venue.id === v)?.name ?? v}
          </button>
        ))}
      </div>

      {/* 2뎁스: 그 공간의 패키지 */}
      <div className={TAB_BAR}>
        {venuePackages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={tabCls(p.id === activeId)}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={addPackage}
          className={`ml-1 shrink-0 whitespace-nowrap px-3 py-3 ${LINK_BTN}`}
        >
          + 새 패키지
        </button>
      </div>

      <div className={`mt-6 ${TABLE_CARD}`}>
        <div className={TABLE_HEAD}>
          <div>
            <p className={TABLE_HEAD_TITLE}>패키지 요약 ({packages.length})</p>
            <p className={TABLE_HEAD_DESC}>
              행을 누르면 아래에서 해당 패키지를 편집합니다.
            </p>
          </div>
          <div className={TABLE_HEAD_ACTIONS}>
            <button type="button" onClick={addPackage} className={btnClass("secondary", "sm")}>
              새 패키지
            </button>
          </div>
        </div>
        <div className={TABLE_SCROLL}>
          <table className={`${TABLE} min-w-[560px]`}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>패키지</th>
                <th className={TH_NUM}>기본 대관료 (₩)</th>
                <th className={TH_NUM}>총 패키지 가격 (₩)</th>
                <th className={TH_NUM}>할인 적용가 (₩)</th>
                <th className={TH}>
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => {
                const t = computeTotals(p);
                return (
                  <tr
                    key={p.id}
                    className={`cursor-pointer ${p.id === activeId ? `${TR} bg-accent/15` : TR_HOVER}`}
                    onClick={() => setActiveId(p.id)}
                  >
                    <td className={TD_ID}>{p.name}</td>
                    <td className={TD_NUM}>{num(p.baseFeePerWeek)}</td>
                    <td className={TD_NUM}>{num(t.total)}</td>
                    <td className={TD_NUM}>
                      {p.discountRatio > 0 ? (
                        <span className="font-bold">{num(t.discountedTotal)}</span>
                      ) : (
                        <span className="text-muted">{NONE}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePackage(p.id);
                        }}
                        className={REMOVE_BTN}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              <span className="mb-1 block text-xs text-muted">기본 대관료 (원/주, 화~일) — 신청자 노출 총액</span>
              <MoneyInput value={active.baseFeePerWeek} onChange={(value) => update({ baseFeePerWeek: value })} className={FIELD} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Bowl 사용료 (원/주) — 신청자 비노출, 위 기본 대관료에 이미 포함된 참고값
              </span>
              <MoneyInput value={active.bowlFee} onChange={(value) => update({ bowlFee: value })} className={`w-full ${FIELD}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">셋업(준비일) 추가/차감 단가 (원/일)</span>
              <MoneyInput
                value={active.setupExtraDayFee}
                onChange={(value) => update({ setupExtraDayFee: value })}
                className={`w-full ${FIELD}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">공연일 추가/차감 단가 (원/일)</span>
              <MoneyInput
                value={active.performanceExtraDayFee}
                onChange={(value) => update({ performanceExtraDayFee: value })}
                className={`w-full ${FIELD}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">할인율 적용 (%, 기본 대관료 기준)</span>
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
              <MoneyInput
                value={active.audienceTier.min}
                onChange={(value) => update({ audienceTier: { ...active.audienceTier, min: value } })}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>객석 규모 최대</span>
              <MoneyInput
                value={active.audienceTier.max}
                onChange={(value) => update({ audienceTier: { ...active.audienceTier, max: value } })}
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

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent bg-panel px-4 py-3">
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

        {venueTab === "medium-hall" && (
          <p className="border-l-2 border-accent bg-accent-soft/40 px-4 py-3 text-xs leading-5 text-foreground">
            중형공연장은 이 목록(추가 옵션)을 쓰지 않습니다 — 가격은 &ldquo;요금표 관리&rdquo;의
            &ldquo;중형공연장 요금&rdquo; 섹션에서 따로 관리합니다. 여기서는 STEP 2(구성·옵션)에
            표시되는 기본 구성 안내 문구만 편집합니다.
          </p>
        )}

        {venueTab === "arena" && (
        <>
        {(
          [
            {
              visibility: "ITEM_ONLY" as const,
              grouped: baseDetailAddons,
              title: "① 기본 내역",
              badge: "기본 포함",
              badgeClass: "bg-good text-white",
              slotClass: "border-good/60 bg-good/5",
              desc: "신청자 화면에는 항목명·수량만 노출되고 단가·금액은 감춘다(예: 야외광장, 대기실, 트러스 등). 체크한 항목만 이 패키지에 기본 포함으로 노출된다.",
            },
            {
              visibility: "HIDDEN" as const,
              grouped: hiddenAddons,
              title: "② Bowl 사용료 + 유틸리티",
              badge: "신청자 비노출",
              badgeClass: "bg-panel-strong text-muted",
              slotClass: "border-border-soft bg-panel-strong/30",
              desc: "위 Bowl 사용료 필드와 이 목록(유틸리티 등)은 신청자 화면 어디에도 항목·금액이 노출되지 않는다 — 견적 합계에는 자동으로 포함된다.",
            },
            {
              visibility: "VISIBLE" as const,
              grouped: optionAddons,
              title: "③ 선택 가능 옵션",
              badge: "항목 · 금액 노출",
              badgeClass: "bg-accent text-on-accent",
              slotClass: "border-accent/60 bg-accent-soft/15",
              desc: "신청자가 STEP 2(구성·옵션)에서 직접 수량을 정해 선택하는 항목 — 항목명·단가·금액이 모두 노출된다. 항목마다 있는 \"노출\" 체크를 켠 패키지의 신청자에게만 노출된다(껐다고 다른 패키지에서도 사라지지는 않는다) — 무상 포함 수량과는 별개다.",
            },
          ]
        ).map(({ visibility, grouped: groupedByVisibility, title, badge, badgeClass, slotClass, desc }) => (
          <section key={visibility} className={`border-l-4 p-4 ${slotClass}`}>
            <div className="flex items-center gap-2">
              <h2 className={SUB_TITLE}>{title}</h2>
              <span className={`px-2 py-0.5 text-xs font-bold ${badgeClass}`}>{badge}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{desc}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-dashed border-border-soft pb-3">
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value as AddonCategory)}
                className={FIELD_SM}
              >
                {ADDON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {ADDON_CATEGORY_LABEL[cat]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openNewItemForm(pickerCategory, visibility)}
                className="px-2 py-1 text-xs font-bold text-foreground hover:underline"
              >
                + 새 카테고리로 항목 추가
              </button>
            </div>

            {newItemCategory && newItemVisibility === visibility && !groupedByVisibility.has(newItemCategory) && (
              <div className="mt-3 flex flex-col gap-2 border border-dashed border-accent/40 bg-accent-soft/40 p-3 sm:flex-row sm:items-center">
                <span className="shrink-0 text-xs font-bold text-foreground">
                  {ADDON_CATEGORY_LABEL[newItemCategory]} (신규)
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder="항목 이름"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={`flex-1 ${FIELD}`}
                />
                <input
                  type="text"
                  placeholder="단위 (예: 원/일)"
                  value={newItemUnitLabel}
                  onChange={(e) => setNewItemUnitLabel(e.target.value)}
                  className={`w-32 ${FIELD}`}
                />
                <MoneyInput
                  value={newItemPrice}
                  onChange={(value) => setNewItemPrice(Math.max(0, value))}
                  className={`w-28 ${FIELD_NUM}`}
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
                    className={btnClass("secondary", "sm")}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-5">
              {[...groupedByVisibility.entries()].map(([category, items]) => (
                <div key={category}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewItemForm(category as AddonCategory, visibility)}
                      className="px-2 py-1 text-xs font-bold text-foreground hover:underline"
                    >
                      + 항목 추가
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((addon) => {
                      const qty = includedQty(addon.id);
                      const checked = qty > 0;
                      const isVisibleOption = visibility === "VISIBLE";
                      const autoExposed = addon.availability.mode === "IF_NOT_INCLUDED";
                      const exposed = isExposedForActive(addon);
                      return (
                        <div
                          key={addon.id}
                          className="flex flex-col gap-2 border-b border-border/50 pb-1.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-s">
                            {isVisibleOption &&
                              (autoExposed ? (
                                <span
                                  className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-muted"
                                  title="이 패키지에 무상 포함되어 있지 않을 때만 자동으로 노출됩니다"
                                >
                                  자동
                                </span>
                              ) : (
                                <label className="flex shrink-0 items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={exposed}
                                    onChange={(e) => setExposedForActive(addon, e.target.checked)}
                                  />
                                  <span className="text-xs font-bold text-foreground">노출</span>
                                </label>
                              ))}
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setIncludedQty(addon.id, e.target.checked ? 1 : 0)}
                              />
                              {addon.name}
                              <span className="text-xs text-muted">({addon.unitLabel})</span>
                            </label>
                          </div>
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
                                className={`w-16 disabled:opacity-40 ${FIELD_NUM}`}
                              />
                            </label>
                            <label className="flex items-center gap-1.5">
                              <span className="text-xs text-muted">단가</span>
                              <MoneyInput
                                value={addon.unitPrice}
                                onChange={(value) => updateAddonPrice(addon.id, Math.max(0, value))}
                                className={`w-32 ${FIELD_NUM}`}
                              />
                            </label>
                            <select
                              value={addon.visibility}
                              onChange={(e) => updateAddonVisibility(addon.id, e.target.value as LineItemVisibility)}
                              className={FIELD}
                            >
                              <option value="ITEM_ONLY">기본 내역</option>
                              <option value="HIDDEN">비노출</option>
                              <option value="VISIBLE">선택 옵션</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeAddon(addon.id)}
                              className={REMOVE_BTN}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {newItemCategory === category && newItemVisibility === visibility && (
                    <div className="mt-3 flex flex-col gap-2 border border-dashed border-accent/40 bg-accent-soft/40 p-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        autoFocus
                        placeholder="항목 이름"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className={`flex-1 ${FIELD}`}
                      />
                      <input
                        type="text"
                        placeholder="단위 (예: 원/일)"
                        value={newItemUnitLabel}
                        onChange={(e) => setNewItemUnitLabel(e.target.value)}
                        className={`w-32 ${FIELD}`}
                      />
                      <MoneyInput
                        value={newItemPrice}
                        onChange={(value) => setNewItemPrice(Math.max(0, value))}
                        className={`w-28 ${FIELD_NUM}`}
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
                          className={btnClass("secondary", "sm")}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {groupedByVisibility.size === 0 && (
                <p className="text-xs text-muted">
                  아직 항목이 없습니다 — 위에서 카테고리를 고르고 &ldquo;+ 새 카테고리로 항목 추가&rdquo;를 눌러 등록하세요.
                </p>
              )}
            </div>
          </section>
        ))}
        </>
        )}
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
