"use client";

import { AdminCategoryPicker } from "./AdminCategoryPicker";
import editorStyles from "./AdminEditor.module.css";
import { useContentTransport } from "./ContentTransport";

import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/Dialog";
import { useState } from "react";
import { useQueryTab } from "@/components/admin/useQueryTab";
import { ADDON_CATEGORY_LABEL, VENUES, type AddonCategory, type RateTable } from "@/lib/pricing/types";
import { btnClass } from "@/components/admin/adminButton";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  FIELD,
  FIELD_NUM,
  HELP,
  REMOVE_BTN,
  SECTION_TITLE,
  SUB_TITLE,
  tabCls,
} from "./adminUi";

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (base || "item") + "_" + Math.random().toString(36).slice(2, 6);
}

// URL 은 공개 화면과 같은 이름(?venue=arena|live-hall)을 쓰고, 내부 venueId 와 매핑한다.
const VENUE_URL_VALUES = ["arena", "live-hall"] as const;
const URL_TO_VENUE: Record<string, "arena" | "medium-hall"> = { arena: "arena", "live-hall": "medium-hall" };
const VENUE_TO_URL: Record<"arena" | "medium-hall", "arena" | "live-hall"> = { arena: "arena", "medium-hall": "live-hall" };

export interface PublicMidHallRef {
  total: number | null;
  exclusive: number | null;
  facility: number | null;
}

export function RatesForm({
  rateTable,
  publicMidHall,
}: {
  rateTable: RateTable;
  /** 공개 대관료 페이지(/rates)에 표기된 중형 금액 — 입력칸 옆 대조용 */
  publicMidHall?: Record<"setup" | "weekday" | "weekend", PublicMidHallRef>;
}) {
  const dialog = useDialog();
  const router = useRouter();
  const { request, isPreview } = useContentTransport();
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
  // 삭제한 id를 따로 모아 저장 요청에 실어 보낸다 — 그렇지 않으면 서버가 요청에
  // 없는 항목도 현재 저장된 값에서 그대로 되살려서 삭제가 저장되지 않는다
  // (2026-08-24, "선택옵션들이 삭제해도 rate card에 그대로 남아있는 오류").
  const [removedAddonIds, setRemovedAddonIds] = useState<string[]>([]);
  const [extraWeekRatio, setExtraWeekRatio] = useState(rateTable.extraWeekRatio);
  const [dayExclusionDiscountRatio, setDayExclusionDiscountRatio] = useState(
    rateTable.dayExclusionDiscountRatio,
  );
  const [midHall, setMidHall] = useState(rateTable.midHall);
  // 전용/시설 내역 — 요금표에 저장된 값 → 없으면 공개 페이지 표기 → 그것도 없으면 총액을 전용에
  const initialBreakdown = rateTable.midHall.breakdown ?? {
    setup: {
      exclusive: publicMidHall?.setup.exclusive ?? rateTable.midHall.setupDayFee,
      facility: publicMidHall?.setup.facility ?? 0,
    },
    weekday: {
      exclusive: publicMidHall?.weekday.exclusive ?? rateTable.midHall.performanceWeekdayFee,
      facility: publicMidHall?.weekday.facility ?? 0,
    },
    weekend: {
      exclusive: publicMidHall?.weekend.exclusive ?? rateTable.midHall.performanceWeekendFee,
      facility: publicMidHall?.weekend.facility ?? 0,
    },
  };
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [venueUrl, setVenueUrl] = useQueryTab("venue", VENUE_URL_VALUES, "arena");
  const venueTab = URL_TO_VENUE[venueUrl];
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newItemCategory, setNewItemCategory] = useState<AddonCategory | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnitLabel, setNewItemUnitLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState(0);

  const [rateView, setRateView] = useState<"addons" | "ratios">("addons");
  const [extraCategories, setExtraCategories] = useState<AddonCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const filteredAddons = addons.filter((a) =>
    (categoryFilter === "all" || a.category === categoryFilter) &&
    `${a.name} ${a.unitLabel}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (priceFilter === "all" || (priceFilter === "editable" ? a.editable : !a.editable)),
  );

  const grouped = new Map<string, typeof addons>();
  for (const addon of addons) {
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  for (const category of extraCategories) { if (!grouped.has(category)) grouped.set(category, []); }

  function openNewItemForm(category: AddonCategory) {
    setNewItemCategory(category);
    setNewItemName("");
    setNewItemUnitLabel("원/일");
    setNewItemPrice(0);
  }

  /** 부대시설 항목 삭제 — 요금표에서 빼면 견적에서도 사라진다 */
  async function removeAddon(addonId: string, name: string) {
    if (!(await dialog.confirm(`「${name}」 항목을 삭제할까요?\n이 항목은 이후 견적에 나타나지 않습니다.`, { okLabel: "삭제" }))) return;
    setAddons((prev) => prev.filter((a) => a.id !== addonId));
    setRemovedAddonIds((prev) => [...prev, addonId]);
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
      const res = await request("/api/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraWeekRatio,
          dayExclusionDiscountRatio,
          addons: addons.map((a) => ({ id: a.id, name: a.name, unitPrice: a.unitPrice })),
          newAddons,
          removedAddonIds,
          midHall: { ...midHall, breakdown },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(isPreview ? `시안에 저장했습니다. 예시 버전: ${data.rateTable.version}` : `저장되었습니다. 새 버전: ${data.rateTable.version}`);
      setRemovedAddonIds([]);
      if (!isPreview) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`mt-8 space-y-8 ${editorStyles.workspace}`}>
      {/* 1뎁스: 공간 — 아레나와 중형공연장은 요율 체계가 달라 화면을 나눈다(그쪽 개편). */}
      <div className={editorStyles.venueTabs}>
        {(["arena", "medium-hall"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setVenueUrl(VENUE_TO_URL[v])} aria-pressed={venueTab === v} className={tabCls(venueTab === v)}>
            {VENUES.find((venue) => venue.id === v)?.name ?? v}
          </button>
        ))}
      </div>

      {venueTab === "arena" && <nav className={editorStyles.workTabs} aria-label="요금표 편집 영역">
        <button type="button" aria-pressed={rateView === "addons"} onClick={() => setRateView("addons")}><strong>부대시설 단가</strong><span>카테고리별 항목 이름과 공통 단가 편집</span></button>
        <button type="button" aria-pressed={rateView === "ratios"} onClick={() => setRateView("ratios")}><strong>공통 요율</strong><span>추가 일수와 제외 요일의 계산 비율</span></button>
      </nav>}
      {venueTab === "arena" && rateView === "ratios" && (
      <>
      <section className={editorStyles.optionPanel}>
        <h2 className={SECTION_TITLE}>공통 요율</h2>
        <p className={`mt-2 ${HELP}`}>
          패키지별 기본 대관료는 &ldquo;패키지 관리&rdquo;에서 함께 편집합니다. 여기서는 모든
          패키지에 공통 적용되는 비율과 부대시설 단가만 관리합니다.
        </p>

        <div className={editorStyles.settingRow}>
          <div>
            <div className="text-s font-bold">추가 일수 단가 비율</div>
            <div className={HELP}>
              기본 대관료 × 이 비율 ÷ 6일 = 일요일 이후 하루 추가 단가 (미확정 임시 규칙)
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.05}
            value={extraWeekRatio}
            onChange={(e) => setExtraWeekRatio(Number(e.target.value) || 0)}
            aria-label="추가 일수 단가 비율" className={`${FIELD} text-right tabular-nums`}
          />
        </div>

        <div className={editorStyles.settingRow}>
          <div>
            <div className="text-s font-bold">제외 요일 할인 비율</div>
            <div className={HELP}>
              기본 대관료 × 이 비율 = 화~일 중 제외한 요일 1일당 할인액 (미확정 임시 규칙)
            </div>
          </div>
          <input
            type="number"
            min={0}
            step={0.01}
            aria-label="제외 요일 할인 비율"
            value={dayExclusionDiscountRatio}
            onChange={(e) => setDayExclusionDiscountRatio(Number(e.target.value) || 0)}
            className={`${FIELD} text-right tabular-nums`}
          />
        </div>
      </section>
      </>
      )}

      {venueTab === "medium-hall" && (
      <section className={editorStyles.optionPanel}>
        <h2 className={SECTION_TITLE}>중형공연장 요금 (DAILY)</h2>
        <p className={`mt-1 ${HELP}`}>
          중형공연장 일 단위 요금의 전용 사용료와 시설 사용료를 관리합니다. 1일 3회 이상 공연은 자동 계산하지
          않고 운영자 확인이 필요한 항목으로 남습니다.
        </p>

        {(
          [
            ["setup", "셋업 Load-In (1일, 평일/주말 동일)"],
            ["weekday", "공연 Show — 평일 (1일)"],
            ["weekend", "공연 Show — 주말 (1일)"],
          ] as const
        ).map(([key, label]) => {
          const row = breakdown[key];
          const total = row.exclusive + row.facility;
          const setPart = (part: "exclusive" | "facility", raw: string) => {
            const value = Math.max(0, Number(raw) || 0);
            setBreakdown((prev) => {
              const nextRow = { ...prev[key], [part]: value };
              // 총액은 내역의 합 — 견적 엔진이 쓰는 필드를 함께 갱신한다
              const totalKey =
                key === "setup" ? "setupDayFee" : key === "weekday" ? "performanceWeekdayFee" : "performanceWeekendFee";
              setMidHall((mh) => ({ ...mh, [totalKey]: nextRow.exclusive + nextRow.facility }));
              return { ...prev, [key]: nextRow };
            });
          };
          return (
            <div key={key} className={editorStyles.rateGroup}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className={SUB_TITLE}>{label}</div>
                <div className="text-s font-bold tabular-nums">
                  합계 {total.toLocaleString("ko-KR")}원
                  <span className={`ml-2 font-normal ${HELP}`}>견적 계산·공개 페이지에 함께 적용</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <label>
                  <span className={`mb-1 block ${HELP}`}>전용 사용료 / 일당</span>
                  <MoneyInput
                    value={row.exclusive}
                    onChange={(value) => setPart("exclusive", String(value))}
                    className={FIELD_NUM}
                  />
                </label>
                <label>
                  <span className={`mb-1 block ${HELP}`}>시설 사용료 / 일당</span>
                  <MoneyInput
                    value={row.facility}
                    onChange={(value) => setPart("facility", String(value))}
                    className={FIELD_NUM}
                  />
                </label>
              </div>
            </div>
          );
        })}

        {(
          [
            ["extraHourFee", "셋업 연장 · 철수 Load-Out (시간당)"],
            ["cleaningUnitPrice", "청소비 (원/인)"],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className={editorStyles.settingRow}
          >
            <div className={SUB_TITLE}>{label}</div>
            <MoneyInput
              value={midHall[key]}
              onChange={(value) => setMidHall((prev) => ({ ...prev, [key]: Math.max(0, value) }))}
              className={FIELD_NUM}
            />
          </div>
        ))}

        <div className={editorStyles.settingRow}>
          <div>
            <div className={SUB_TITLE}>1일 2회 공연 할증 비율</div>
            <div className={HELP}>해당 일 공연 요금 × 이 비율만큼 할증 (0.5 = 50%)</div>
          </div>
          <input
            type="number"
            min={0}
            step={0.05}
            aria-label="1일 2회 공연 할증 비율"
            value={midHall.secondShowSurchargeRatio}
            onChange={(e) =>
              setMidHall((prev) => ({ ...prev, secondShowSurchargeRatio: Math.max(0, Number(e.target.value) || 0) }))
            }
            className={FIELD_NUM}
          />
        </div>
      </section>
      )}

      {venueTab === "arena" && rateView === "addons" && (
      <section className={editorStyles.optionPanel}>
        <h2 className={SECTION_TITLE}>부대시설 단가</h2>
        <p className={`mt-2 ${HELP}`}>모든 패키지에 공통으로 적용되는 항목입니다. 카테고리나 검색으로 찾은 뒤 이름과 단가를 수정하세요.</p>
        <div className={editorStyles.catalog}>
          <nav className={editorStyles.chips} aria-label="요금 항목 카테고리">
            <button type="button" aria-pressed={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>전체 <span>{addons.length}</span></button>
            {[...grouped.entries()].map(([category, items]) => <button type="button" key={category} aria-pressed={categoryFilter === category} onClick={() => setCategoryFilter(category)}>{ADDON_CATEGORY_LABEL[category as AddonCategory] ?? category} <span>{items.length}</span></button>)}

            <AdminCategoryPicker present={[...grouped.keys()]} onSelect={key => { setExtraCategories(prev => [...prev, key]); setCategoryFilter(key); setSearch(""); setPriceFilter("all"); }} />
          </nav>

          <div className={editorStyles.catalogTools}>
            <label>항목 검색<input type="search" className={FIELD} value={search} onChange={e => setSearch(e.target.value)} placeholder="항목명 또는 단위 검색" /></label>
            <label>정산 방식<select className={FIELD} value={priceFilter} onChange={e => setPriceFilter(e.target.value)}><option value="all">전체 항목</option><option value="editable">단가 편집 가능</option><option value="metered">실사용 정산</option></select></label>
            <span aria-live="polite">{filteredAddons.length}개 항목</span>
          </div>
          <div className={editorStyles.catalogTableWrap}>
            <table className={`${editorStyles.catalogTable} ${editorStyles.rateTable}`}>
              <colgroup><col className={editorStyles.itemColumn} /><col className={editorStyles.priceColumn} /><col className={editorStyles.actionColumn} /></colgroup>
              <thead><tr><th scope="col">항목 / 단위</th><th scope="col">공통 단가</th><th scope="col">관리</th></tr></thead>
              <tbody>{filteredAddons.map(addon => <tr key={addon.id}>
                <td><input aria-label={`${addon.name} 항목명`} value={addon.name} className={FIELD} onChange={e => setAddons(prev => prev.map(a => a.id === addon.id ? {...a, name:e.target.value} : a))} /><small>{ADDON_CATEGORY_LABEL[addon.category]} · {addon.unitLabel}</small></td>
                <td>{addon.editable ? <MoneyInput aria-label={`${addon.name} 단가`} value={addon.unitPrice} className={FIELD_NUM} onChange={value => setAddons(prev => prev.map(a => a.id === addon.id ? {...a, unitPrice:value} : a))} /> : <span className={HELP}>실사용 정산 · 단가 편집 불가</span>}</td>
                <td><button type="button" className={REMOVE_BTN} onClick={() => removeAddon(addon.id, addon.name)} aria-label={`${addon.name} 삭제`}>삭제</button></td>
              </tr>)}</tbody>
            </table>
            {filteredAddons.length === 0 && <p className={editorStyles.empty}>조건에 맞는 항목이 없습니다. 검색어나 필터를 변경해 주세요.</p>}
          </div>
          <div className={editorStyles.tableAdd}>
            <button type="button" className={editorStyles.addChip} aria-expanded={newItemCategory !== null} onClick={() => newItemCategory ? setNewItemCategory(null) : openNewItemForm((categoryFilter === "all" ? addons[0]?.category ?? "SPACE" : categoryFilter) as AddonCategory)}>+ 항목 추가</button>
          </div>
          {newItemCategory && <div className={editorStyles.addPanel}>
            <h3 className={SUB_TITLE}>새 요금 항목</h3>
            <p>추가할 카테고리와 이름, 단위, 단가를 입력하세요. 요금표 저장 시 함께 반영됩니다.</p>
            <label className={`mb-3 block ${HELP}`}>카테고리
              <select className={FIELD} value={newItemCategory} onChange={e => setNewItemCategory(e.target.value as AddonCategory)}>
                {Object.entries(ADDON_CATEGORY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
                <div className={editorStyles.addTools}>
                  <input
                    type="text"
                    autoFocus
                    aria-label="새 항목 이름" placeholder="항목 이름"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className={`flex-1 ${FIELD}`}
                  />
                  <input
                    type="text"
                    aria-label="새 항목 단위" placeholder="단위 (예: 원/일)"
                    value={newItemUnitLabel}
                    onChange={(e) => setNewItemUnitLabel(e.target.value)}
                    className={`w-32 ${FIELD}`}
                  />
                  <MoneyInput
                    value={newItemPrice}
                    onChange={(value) => setNewItemPrice(Math.max(0, value))}
                    className={`w-28 ${FIELD} text-right tabular-nums`}
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
                      className={btnClass("tertiary", "sm")}
                    >
                      취소
                    </button>
                  </div>
                </div>
          </div>}
        </div>
      </section>
      )}

      <div className={editorStyles.saveBar}>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={editorStyles.saveButton}
        >
          {saving ? "저장 중..." : "요금표 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-s text-muted">{message}</span>}
      </div>
    </div>
  );
}
