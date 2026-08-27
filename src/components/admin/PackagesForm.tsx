"use client";

import Link from "next/link";
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
import type { ChargeBlock, Pair, RatesContent } from "@/lib/content/pageContent";

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

const VISIBILITY_LABEL: Record<LineItemVisibility, string> = {
  ITEM_ONLY: "기본 내역",
  HIDDEN: "비노출",
  VISIBLE: "선택 옵션",
};

/**
 * "+ 새 카테고리로 항목 추가"는 항상 새 항목을 처음부터 입력해야 했다 — 요금표에
 * 이미 있는 항목(다른 슬롯에 속해 있거나 다른 패키지에서만 쓰던 항목)을 그대로
 * 재사용할 방법이 없었다(2026-08-23, "옵션 항목은 요금표에 넣으면 들어가던데
 * 기본항목은 아니더라고" — VISIBLE은 전 패키지에 자동 노출돼 그렇게 보였을 뿐,
 * ITEM_ONLY/HIDDEN은 애초에 그런 자동 노출이 없다). 검색해서 고르면 그 항목을 이
 * 슬롯 소속으로 재배정한다.
 */
function ExistingItemPicker({
  targetVisibility,
  addons,
  onPick,
}: {
  targetVisibility: LineItemVisibility;
  addons: AddonItem[];
  onPick: (addon: AddonItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = addons.filter((a) => a.visibility !== targetVisibility && a.pricingType !== "METERED");
  if (options.length === 0) return null;

  const filtered = query.trim()
    ? options.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div
      className="relative inline-block"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center px-2 py-1 text-xs font-bold text-foreground hover:underline sm:min-h-0"
      >
        + 기존 항목에서 선택
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-80 border border-border bg-panel shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="항목 검색"
            className={`${FIELD_SM} w-full border-x-0 border-t-0`}
          />
          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-muted">검색 결과가 없습니다.</li>}
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(a);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-background"
                >
                  <span className="truncate">{a.name}</span>
                  <span className="shrink-0 text-muted">
                    {ADDON_CATEGORY_LABEL[a.category]} · 현재 {VISIBILITY_LABEL[a.visibility]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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

export function PackagesForm({ rateTable, ratesContent }: { rateTable: RateTable; ratesContent: RatesContent }) {
  const router = useRouter();
  const [packages, setPackages] = useState<EditablePackage[]>(rateTable.packages);
  const [activeId, setActiveId] = useState(rateTable.packages[0]?.id ?? 1);
  const [venueUrl, setVenueUrl] = useQueryTab("venue", VENUE_URL_VALUES, "arena");
  const venueTab = URL_TO_VENUE[venueUrl];
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 삭제는 화면에서 빼는 것만으로는 저장되지 않는다 — 저장 API가 항목을 id로 찾아
  // 덮어쓰기만 하고 "요청에 없으면 지운다"는 판단을 하지 않아서, 로컬에서 지운
  // 항목도 서버가 그대로 되살렸다(2026-08-24, "선택옵션들이 삭제해도 rate card에
  // 그대로 남아있는 오류"). 그래서 삭제한 id를 따로 모아 요청에 실어 보낸다 —
  // "요청에 없는 건 삭제"로 판단하면, 다른 화면(요금표 관리)에서 방금 추가한
  // 항목이 이 화면의 오래된 스냅샷 때문에 함께 지워지는 사고가 날 수 있어서다.
  const [removedAddonIds, setRemovedAddonIds] = useState<string[]>([]);
  const [removedPackageIds, setRemovedPackageIds] = useState<number[]>([]);

  const [addons, setAddons] = useState<AddonItem[]>(rateTable.addons);
  const [newItemCategory, setNewItemCategory] = useState<AddonCategory | null>(null);
  const [newItemVisibility, setNewItemVisibility] = useState<LineItemVisibility>("VISIBLE");
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnitLabel, setNewItemUnitLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [pickerCategory, setPickerCategory] = useState<AddonCategory>(ADDON_CATEGORIES[0]);

  // 중형공연장 "기본 항목"/"옵션" 슬롯 — 대관 신청 위저드 STEP2(구성·옵션)의
  // MidHallRateCard가 그대로 읽는 정본(RatesContent.liveHall.includes/charges)을
  // 여기서 직접 편집한다(2026-08-23, "어드민서 중형공연장 패키지도 기본 항목 추가,
  // 옵션 항목 추가하는 슬롯설정으로 만들어달라" · "프론트 노출 기준으로 어드민도
  // 세팅"). 아레나 슬롯과 저장 대상만 다를 뿐 같은 화면(패키지 관리)에 같은 모양의
  // "추가" 버튼을 둔다. 저장은 패키지·addons와 별도 API(rates 콘텐츠)라 버튼도 분리한다.
  const [midHallIncludes, setMidHallIncludes] = useState<Pair[]>(ratesContent.liveHall.includes);
  const [midHallCharges, setMidHallCharges] = useState<ChargeBlock[]>(ratesContent.liveHall.charges);
  const [midHallSaving, setMidHallSaving] = useState(false);
  const [midHallMessage, setMidHallMessage] = useState<string | null>(null);

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

  /**
   * 패키지 복제 — 같은 구성을 요금·규모만 다르게 여러 타입으로 만들어야 하는
   * 경우가 있다(2026-08-24, "지금은 동일한 패키지를 여러타입으로 만들어야되는
   * 경우가 있으므로"). 기본 내역(includedItems)까지 통째로 복사해 새 패키지로
   * 추가하고, 이름 끝에 "사본"을 붙여 원본과 구분한다 — 그 자리에서 바로
   * 이름·금액만 고치면 된다.
   */
  function duplicatePackage(id: number) {
    const source = packages.find((p) => p.id === id);
    if (!source) return;
    const nextId = Math.max(0, ...packages.map((p) => p.id)) + 1;
    const copy: EditablePackage = {
      ...source,
      id: nextId,
      name: `${source.name} 사본`,
      audienceTier: { ...source.audienceTier },
      includedItems: source.includedItems.map((item) => ({ ...item })),
    };
    setPackages((prev) => [...prev, copy]);
    setActiveId(nextId);
  }

  /**
   * 패키지 순서 변경 — 신청자 화면(패키지 선택 카드)·이 표 모두 packages 배열
   * 순서 그대로 보여준다(2026-08-24, "어드민> 패키지 순서 변경 가능하도록").
   * 같은 공간(venueTab) 안에서만 이동한다 — 다른 공간 패키지와 뒤섞이지 않게
   * 그 공간이 차지한 자리(슬롯)끼리만 맞바꾼다.
   */
  function movePackage(id: number, direction: -1 | 1) {
    setPackages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const groupVenue = target.venueId ?? DEFAULT_VENUE_ID;
      const group = prev.filter((p) => (p.venueId ?? DEFAULT_VENUE_ID) === groupVenue);
      const idx = group.findIndex((p) => p.id === id);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= group.length) return prev;
      const reordered = [...group];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      let i = 0;
      return prev.map((p) => ((p.venueId ?? DEFAULT_VENUE_ID) === groupVenue ? reordered[i++] : p));
    });
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
    setRemovedPackageIds((prev) => [...prev, id]);
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

  // [신규 2026-08-26] 항목 스펙(규격·사양) 참고용 텍스트 — 과금에는 관여하지 않는다.
  function updateAddonSpec(addonId: string, spec: string) {
    setAddons((prev) => prev.map((a) => (a.id === addonId ? { ...a, spec } : a)));
  }

  // [신규 2026-08-26] "옵션 항목 선택 개수도 리미트가 필요해.. 항목별로 제한 내역을
  // 설정 가능하게" — availability.maxAddQuantity는 이미 있던 필드지만 어드민에서
  // 고칠 UI가 없었다. 빈 값 = 무제한(undefined), 숫자를 넣으면 그 값이 기본 포함
  // 수량 위에 더 얹을 수 있는 상한이 된다(StepConfigOptions AddonRow의 maxTotal 계산).
  function updateAddonMaxAddQuantity(addonId: string, raw: string) {
    const trimmed = raw.trim();
    const maxAddQuantity: number | undefined = trimmed === "" ? undefined : Math.max(0, Number(trimmed) || 0);
    setAddons((prev) =>
      prev.map((a) => (a.id === addonId ? { ...a, availability: { ...a.availability, maxAddQuantity } } : a)),
    );
  }

  /** 이 addon이 pkg에 무상 포함(기본 수량 > 0)돼 있는지 — IF_NOT_INCLUDED 판정에 쓴다. */
  function packageIncludesAddon(pkg: EditablePackage, addonId: string): boolean {
    return pkg.includedItems.some((i) => i.addonId === addonId && i.quantity > 0);
  }

  /**
   * ③ 선택 가능 옵션 전용 — "이 패키지에서 노출되는가"(2026-08-23, "체크한것만 노출되는걸로
   * 바꿔라" → "모든 항목은 노출여부를 관리자가 설정할 수 있어야 한다"). 항목 전부가 대상이다
   * — IF_NOT_INCLUDED(마더트러스 등 "패키지에 이미 무상 포함돼 있지 않을 때만 자동 노출")도
   * 더 이상 예외로 두지 않고, 지금까지의 자동 판정 결과를 그대로 보여주는 체크 상태로
   * 시작해서 수동으로 켜고 끌 수 있게 한다.
   *
   * 무상 포함 수량(includedItems)과는 완전히 별개 값이다 — 노출만 켜고 무상 수량은 0으로
   * 둘 수 있어야, 무상 제공 없이 "유상으로 살 수 있게만" 하는 패키지를 만들 수 있다.
   */
  function isExposedForActive(addon: AddonItem): boolean {
    if (addon.availability.mode === "IF_PACKAGE_IN") {
      return !!addon.availability.packages?.includes(active.id);
    }
    if (addon.availability.mode === "IF_NOT_INCLUDED") {
      return !packageIncludesAddon(active, addon.id);
    }
    return true; // ALWAYS — 토글 없이 항상 노출로 취급하던 값의 시작 상태
  }

  function setExposedForActive(addon: AddonItem, exposed: boolean) {
    setAddons((prev) =>
      prev.map((a) => {
        if (a.id !== addon.id) return a;
        // 지금까지 이 항목이 각 패키지에서 노출되던 상태를 그대로 유지한 채(다른 패키지의
        // 계산 결과를 명시적으로 packages 목록에 채워서) 이 패키지만 빼거나 넣는다 — 그래야
        // 이 패키지에서 한 번 껐다고 다른 패키지에서까지 갑자기 달라지는 회귀가 안 생긴다.
        const base =
          a.availability.mode === "IF_PACKAGE_IN"
            ? (a.availability.packages ?? [])
            : a.availability.mode === "IF_NOT_INCLUDED"
              ? packages.filter((p) => !packageIncludesAddon(p, a.id)).map((p) => p.id)
              : packages.map((p) => p.id); // ALWAYS
        const next = exposed ? Array.from(new Set([...base, active.id])) : base.filter((id) => id !== active.id);
        return { ...a, availability: { mode: "IF_PACKAGE_IN", packages: next } };
      }),
    );
  }

  /**
   * "기존 항목에서 선택" — 다른 슬롯(또는 다른 카테고리)에 있던 항목을 이 슬롯 소속으로
   * 재배정하고 이 패키지에도 바로 반영한다(2026-08-23). visibility는 전역 값이라 다른
   * 패키지의 화면에도 영향을 준다 — 그 항목이 속한 슬롯 자체가 바뀌는 것이므로 의도된
   * 동작이다.
   */
  function pickExistingItem(addon: AddonItem, targetVisibility: LineItemVisibility) {
    setAddons((prev) =>
      prev.map((a) => {
        if (a.id !== addon.id) return a;
        if (targetVisibility !== "VISIBLE") return { ...a, visibility: targetVisibility };
        // 선택 옵션으로 옮기면 지금 편집 중인 이 패키지에서는 바로 노출되게 한다 —
        // setExposedForActive와 같은 규칙으로 packages 목록을 채운다.
        const base =
          a.availability.mode === "IF_PACKAGE_IN"
            ? (a.availability.packages ?? [])
            : a.availability.mode === "IF_NOT_INCLUDED"
              ? packages.filter((p) => !packageIncludesAddon(p, a.id)).map((p) => p.id)
              : packages.map((p) => p.id);
        const next = Array.from(new Set([...base, active.id]));
        return { ...a, visibility: targetVisibility, availability: { mode: "IF_PACKAGE_IN", packages: next } };
      }),
    );
    if (targetVisibility !== "VISIBLE" && includedQty(addon.id) === 0) {
      setIncludedQty(addon.id, 1);
    }
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
    setRemovedAddonIds((prev) => [...prev, addonId]);
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
        body: JSON.stringify({ packages, addons, removedAddonIds, removedPackageIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(`저장되었습니다. 새 버전: ${data.rateTable.version}`);
      setRemovedAddonIds([]);
      setRemovedPackageIds([]);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function addMidHallInclude() {
    setMidHallIncludes((prev) => [...prev, { label: "", value: "" }]);
  }
  function updateMidHallInclude(index: number, patch: Partial<Pair>) {
    setMidHallIncludes((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeMidHallInclude(index: number) {
    setMidHallIncludes((prev) => prev.filter((_, i) => i !== index));
  }

  function addMidHallCharge() {
    setMidHallCharges((prev) => [...prev, { group: "", item: "", cost: "", note: "" }]);
  }
  function updateMidHallCharge(index: number, patch: Partial<ChargeBlock>) {
    setMidHallCharges((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeMidHallCharge(index: number) {
    setMidHallCharges((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveMidHallRates() {
    setMidHallSaving(true);
    setMidHallMessage(null);
    try {
      const content: RatesContent = {
        ...ratesContent,
        liveHall: { ...ratesContent.liveHall, includes: midHallIncludes, charges: midHallCharges },
      };
      const res = await fetch("/api/admin/content/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMidHallMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMidHallMessage("저장되었습니다. 대관 신청 위저드 STEP2에 바로 반영됩니다.");
      router.refresh();
    } finally {
      setMidHallSaving(false);
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
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => {
                const t = computeTotals(p);
                const group = packages.filter((g) => (g.venueId ?? DEFAULT_VENUE_ID) === (p.venueId ?? DEFAULT_VENUE_ID));
                const idxInGroup = group.findIndex((g) => g.id === p.id);
                const isFirst = idxInGroup <= 0;
                const isLast = idxInGroup === group.length - 1;
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
                      <span className="inline-flex items-center gap-3">
                        <span className="inline-flex flex-col leading-none">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={(e) => {
                              e.stopPropagation();
                              movePackage(p.id, -1);
                            }}
                            aria-label="위로 이동"
                            className="px-1 text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={(e) => {
                              e.stopPropagation();
                              movePackage(p.id, 1);
                            }}
                            aria-label="아래로 이동"
                            className="px-1 text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePackage(p.id);
                          }}
                          className="inline-flex min-h-11 items-center text-xs font-bold text-foreground hover:underline sm:min-h-0"
                        >
                          복제
                        </button>
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
                      </span>
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
          <section>
            <p className="mb-4 border-l-2 border-accent bg-accent-soft/40 px-4 py-3 text-xs leading-5 text-foreground">
              중형공연장은 패키지가 아니라 대관료(요금표 관리)에 딸린 <strong>기본 항목</strong> /{" "}
              <strong>옵션</strong> 두 슬롯으로 구성을 관리합니다 — 여기서 추가·수정·삭제한 내용이
              대관 신청 위저드 STEP 2(구성·옵션)의 중형공연장 화면과{" "}
              <Link href="/rates" className="underline hover:no-underline">
                대관료 안내(/rates)
              </Link>{" "}
              페이지에 그대로 노출됩니다.
            </p>

            <section className="border-l-4 border-good/60 bg-good/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="type-kr-heading text-h6-m">① 기본 항목</h2>
                <span className="bg-good px-2 py-0.5 text-xs font-bold text-white">기본 포함</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                대관료에 이미 포함된 항목 — 신청자 화면에는 항목명·내용만 노출되고 금액은 없습니다
                (예: 냉난방, 공간, 장비, 주차, 미화).
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {midHallIncludes.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5 border border-border-soft bg-panel px-3 py-2">
                    <input
                      type="text"
                      placeholder="구분 (예: 냉난방)"
                      value={item.label}
                      onChange={(e) => updateMidHallInclude(i, { label: e.target.value })}
                      className={FIELD_SM}
                    />
                    <input
                      type="text"
                      placeholder="포함 내용"
                      value={item.value}
                      onChange={(e) => updateMidHallInclude(i, { value: e.target.value })}
                      className={FIELD_SM}
                    />
                    <button
                      type="button"
                      onClick={() => removeMidHallInclude(i)}
                      className={`self-end ${REMOVE_BTN}`}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addMidHallInclude}
                className="mt-3 px-2 py-1 text-xs font-bold text-foreground hover:underline"
              >
                + 기본 항목 추가
              </button>
            </section>

            <section className="mt-6 border-l-4 border-accent/60 bg-accent-soft/15 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="type-kr-heading text-h6-m">② 옵션</h2>
                <span className="bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">항목 · 금액 노출</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                추가 비용이 발생하는 항목 — &ldquo;구분&rdquo;은 위저드 화면에서 항목을 묶는 그룹
                제목으로 쓰입니다(예: 추가대관, 공간·프로모션, 기타). &ldquo;추가대관&rdquo; 그룹은
                위저드에서 시간 단위로 직접 조정할 수 있게 이미 연동돼 있고, 그 외 그룹은 금액을
                그대로 보여주는 참고용으로 노출됩니다.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {midHallCharges.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5 border border-border-soft bg-panel px-3 py-2">
                    <input
                      type="text"
                      placeholder="구분 (그룹)"
                      value={item.group}
                      onChange={(e) => updateMidHallCharge(i, { group: e.target.value })}
                      className={FIELD_SM}
                    />
                    <input
                      type="text"
                      placeholder="항목"
                      value={item.item}
                      onChange={(e) => updateMidHallCharge(i, { item: e.target.value })}
                      className={FIELD_SM}
                    />
                    <input
                      type="text"
                      placeholder="비용"
                      value={item.cost}
                      onChange={(e) => updateMidHallCharge(i, { cost: e.target.value })}
                      className={FIELD_SM}
                    />
                    <input
                      type="text"
                      placeholder="비고"
                      value={item.note}
                      onChange={(e) => updateMidHallCharge(i, { note: e.target.value })}
                      className={FIELD_SM}
                    />
                    <button
                      type="button"
                      onClick={() => removeMidHallCharge(i)}
                      className={`self-end ${REMOVE_BTN}`}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addMidHallCharge}
                className="mt-3 px-2 py-1 text-xs font-bold text-foreground hover:underline"
              >
                + 옵션 항목 추가
              </button>
            </section>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={saveMidHallRates}
                disabled={midHallSaving}
                className={btnClass("primary", "md")}
              >
                {midHallSaving ? "저장 중..." : "기본 항목 · 옵션 저장"}
              </button>
              {midHallMessage && <p className="text-xs text-muted">{midHallMessage}</p>}
            </div>
          </section>
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
            {/* 슬롯 제목을 카테고리·항목보다 눈에 띄게 키운다 — 전에는 전부 text-xs~text-s로
                같은 레벨이라 제목/카테고리/항목이 구분 안 됐다(2026-08-23, "다 시작점이 같은
                x좌표, 너무 다 똑같은 레벨로 보임"). */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="type-kr-heading text-h6-m">{title}</h2>
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
                className="inline-flex min-h-11 items-center px-2 py-1 text-xs font-bold text-foreground hover:underline sm:min-h-0"
              >
                + 새 카테고리로 항목 추가
              </button>
              <ExistingItemPicker
                targetVisibility={visibility}
                addons={addons}
                onPick={(addon) => pickExistingItem(addon, visibility)}
              />
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
                <div key={category} className="pl-1">
                  {/* 카테고리 레이블 — 슬롯 제목보다 한 단계 작고, 왼쪽에 짧은 눈금으로
                      "슬롯 > 카테고리 > 항목" 순서임을 표시한다. */}
                  <div className="mb-2 flex items-center justify-between border-l-2 border-border pl-2.5">
                    <span className="text-s font-bold text-foreground">
                      {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openNewItemForm(category as AddonCategory, visibility)}
                        className="inline-flex min-h-11 items-center px-2 py-1 text-xs font-bold text-foreground hover:underline sm:min-h-0"
                      >
                        + 항목 추가
                      </button>
                      <ExistingItemPicker
                        targetVisibility={visibility}
                        addons={addons}
                        onPick={(addon) => pickExistingItem(addon, visibility)}
                      />
                    </div>
                  </div>
                  {/* 항목 행 — 카테고리보다 한 단계 더 들여써서 소속을 눈으로 바로 알 수 있게 한다. */}
                  <div className="ml-2.5 space-y-1.5 border-l border-border/40 pl-3.5">
                    {items.map((addon) => {
                      const qty = includedQty(addon.id);
                      const checked = qty > 0;
                      const isVisibleOption = visibility === "VISIBLE";
                      const exposed = isExposedForActive(addon);
                      return (
                        <div
                          key={addon.id}
                          className="flex flex-col gap-2 border-b border-border/50 pb-1.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-s">
                            {isVisibleOption && (
                              <label className="flex shrink-0 items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={exposed}
                                  onChange={(e) => setExposedForActive(addon, e.target.checked)}
                                />
                                <span className="text-xs font-bold text-foreground">노출</span>
                              </label>
                            )}
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setIncludedQty(addon.id, e.target.checked ? 1 : 0)}
                              />
                              {addon.name}
                              <span className="text-xs text-muted">({addon.unitLabel})</span>
                            </label>
                            {/* [신규 2026-08-26] 항목 스펙(규격·사양) — 과금과 무관한 참고용 텍스트. */}
                            <input
                              type="text"
                              value={addon.spec ?? ""}
                              placeholder="스펙 (선택)"
                              onChange={(e) => updateAddonSpec(addon.id, e.target.value)}
                              className={`w-32 ${FIELD}`}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            {isVisibleOption && (
                              <label className="flex items-center gap-1.5">
                                <span className="text-xs text-muted">선택 제한</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={
                                    addon.availability.maxAddQuantity !== undefined &&
                                    addon.availability.maxAddQuantity !== "UNLIMITED"
                                      ? addon.availability.maxAddQuantity
                                      : ""
                                  }
                                  placeholder="무제한"
                                  onChange={(e) => updateAddonMaxAddQuantity(addon.id, e.target.value)}
                                  className={`w-16 ${FIELD_NUM}`}
                                />
                              </label>
                            )}
                            <label className="flex items-center gap-1.5">
                              <span className="text-xs text-muted">기본 수량</span>
                              <input
                                type="number"
                                min={0}
                                disabled={!checked}
                                value={checked ? qty : ""}
                                placeholder="-"
                                // "수량 부분에 0이 입력이 안됨" — 0을 그대로 받는다. 빈 문자열(지움)만
                                // 0으로 보정하고, 그 외에는 입력한 숫자를 그대로 쓴다(2026-08-26).
                                onChange={(e) =>
                                  setIncludedQty(addon.id, e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))
                                }
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
