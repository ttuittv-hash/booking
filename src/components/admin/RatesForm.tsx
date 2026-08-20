"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryTab } from "@/components/admin/useQueryTab";
import { ADDON_CATEGORY_LABEL, VENUES, type AddonCategory, type RateTable } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { FIELD, FIELD_NUM, HELP, LINK_BTN, PANEL, SECTION_TITLE, SUB_TITLE, tabCls } from "./adminUi";

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
  const [midHall, setMidHall] = useState(rateTable.midHall);
  const [venueUrl, setVenueUrl] = useQueryTab("venue", VENUE_URL_VALUES, "arena");
  const venueTab = URL_TO_VENUE[venueUrl];
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
          midHall,
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
      {/* 1뎁스: 공간 — 아레나와 중형공연장은 요율 체계가 달라 화면을 나눈다(그쪽 개편). */}
      <div className="flex gap-1 border-b border-border/20">
        {(["arena", "medium-hall"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setVenueUrl(VENUE_TO_URL[v])} className={tabCls(venueTab === v)}>
            {VENUES.find((venue) => venue.id === v)?.name ?? v}
          </button>
        ))}
      </div>

      {venueTab === "arena" && (
      <>
      <section className={PANEL}>
        <h2 className={SECTION_TITLE}>공통 요율</h2>
        <p className={`mt-2 ${HELP}`}>
          패키지별 기본 대관료는 &ldquo;패키지 관리&rdquo;에서 함께 편집합니다. 여기서는 모든
          패키지에 공통 적용되는 비율과 부대시설 단가만 관리합니다.
        </p>

        <div className="mt-5 grid grid-cols-1 items-center gap-2 border-t border-border/15 pt-5 sm:grid-cols-[1fr_200px] sm:gap-3">
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
            className={`${FIELD} text-right tabular-nums`}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 items-center gap-2 border-t border-border/15 pt-5 sm:grid-cols-[1fr_200px] sm:gap-3">
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
            value={dayExclusionDiscountRatio}
            onChange={(e) => setDayExclusionDiscountRatio(Number(e.target.value) || 0)}
            className={`${FIELD} text-right tabular-nums`}
          />
        </div>
      </section>
      </>
      )}

      {venueTab === "medium-hall" && (
      <section className={PANEL}>
        <h2 className={SECTION_TITLE}>중형공연장 요금 (DAILY)</h2>
        <p className={`mt-1 ${HELP}`}>
          중형공연장은 패키지가 없는 일 단위 요금제입니다. 1일 3회 이상 공연은 자동 계산하지
          않고 운영자 확인이 필요한 항목으로 남습니다.
        </p>

        {(
          [
            ["setupDayFee", "셋업 Load-In (1일, 평일/주말 동일)"],
            ["performanceWeekdayFee", "공연 Show — 평일 (1일)"],
            ["performanceWeekendFee", "공연 Show — 주말 (1일)"],
            ["extraHourFee", "셋업 연장 · 철수 Load-Out (시간당)"],
            ["cleaningUnitPrice", "청소비 (원/인)"],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="mt-4 grid grid-cols-1 items-center gap-2 border-t border-border-soft pt-4 sm:grid-cols-[1fr_200px] sm:gap-3"
          >
            <div className={SUB_TITLE}>{label}</div>
            <input
              type="number"
              min={0}
              value={midHall[key]}
              onChange={(e) => setMidHall((prev) => ({ ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }))}
              className={FIELD_NUM}
            />
          </div>
        ))}

        <div className="mt-4 grid grid-cols-1 items-center gap-2 border-t border-border-soft pt-4 sm:grid-cols-[1fr_200px] sm:gap-3">
          <div>
            <div className={SUB_TITLE}>1일 2회 공연 할증 비율</div>
            <div className={HELP}>해당 일 공연 요금 × 이 비율만큼 할증 (0.5 = 50%)</div>
          </div>
          <input
            type="number"
            min={0}
            step={0.05}
            value={midHall.secondShowSurchargeRatio}
            onChange={(e) =>
              setMidHall((prev) => ({ ...prev, secondShowSurchargeRatio: Math.max(0, Number(e.target.value) || 0) }))
            }
            className={FIELD_NUM}
          />
        </div>
      </section>
      )}

      {venueTab === "arena" && (
      <>
      <section className={PANEL}>
        <h2 className={SECTION_TITLE}>부대시설 단가</h2>
        <div className="mt-4 space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/25 pb-1.5">
                <p className={SUB_TITLE}>
                  {ADDON_CATEGORY_LABEL[category as keyof typeof ADDON_CATEGORY_LABEL] ?? category}
                </p>
                <button
                  type="button"
                  onClick={() => openNewItemForm(category as AddonCategory)}
                  className={LINK_BTN}
                >
                  + 항목 추가
                </button>
              </div>
              <div className="divide-y divide-border-soft">
                {items.map((addon) => {
                  const globalIndex = addons.findIndex((a) => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[1fr_160px] sm:gap-3"
                    >
                      <span className="text-s">
                        {addon.name} <span className="text-xs text-muted">({addon.unitLabel})</span>
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
                          className={`${FIELD} text-right tabular-nums`}
                        />
                      ) : (
                        <span className="text-right text-xs text-muted">실사용 정산 (편집 불가)</span>
                      )}
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
                    className={`flex-1 ${FIELD}`}
                  />
                  <input
                    type="text"
                    placeholder="단위 (예: 원/일)"
                    value={newItemUnitLabel}
                    onChange={(e) => setNewItemUnitLabel(e.target.value)}
                    className={`w-32 ${FIELD}`}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="단가"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Math.max(0, Number(e.target.value) || 0))}
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
              )}
            </div>
          ))}
        </div>
      </section>
      </>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-border/20 pt-6">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={btnClass("primary", "lg")}
        >
          {saving ? "저장 중..." : "요금표 저장 (새 버전 생성)"}
        </button>
        {message && <span className="text-s text-muted">{message}</span>}
      </div>
    </div>
  );
}
