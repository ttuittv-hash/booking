"use client";

import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  defaultDayTags,
  effectiveDayTag,
  findAddon,
  findPackage,
  includedQuantity,
  isAddonAvailable,
} from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  MEDIA_TIER_LABEL,
  type AddonCategory,
  type AddonItem,
  type QuoteSelection,
  type RateTable,
} from "@/lib/pricing/types";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 05/12] "규모/패키지 선택 → 기본 포함사항 →
// 추가 옵션" 3개 화면을 STEP 2(구성·옵션) 한 화면으로 합친다. 패키지는 신청자가 카드를
// 눌러 고르는 게 아니라 관객 규모로 자동 결정되고(2-16, recommendPackage), 이 화면은
// 그 결과와 기본 구성·선택 옵션만 보여준다.
function arenaSummaryLine(selection: QuoteSelection, defaultPerformanceDays: number): string {
  const dates = resolveSelectedDates(selection);
  if (dates.length === 0) return "";
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  let setup = 0;
  let performance = 0;
  let loadOut = 0;
  for (const d of dates) {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    if (tag === "PREP") setup++;
    else if (tag === "LOAD_OUT") loadOut++;
    else performance++;
  }
  const parts = [`셋업${setup}`, `공연${performance}`];
  if (loadOut > 0) parts.push(`철수${loadOut}`);
  return parts.join(" · ");
}

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays);
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performance = dates.length - setup;
  return `${dates.length}일 · 셋업${setup} · 공연${performance}`;
}

export function StepConfigOptions({
  rateTable,
  selection,
  defaultPerformanceDays,
  addonQuantities,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  rateTable: RateTable;
  selection: QuoteSelection;
  defaultPerformanceDays: number;
  addonQuantities: Record<string, number>;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const midHallOnly = selection.venueId === "medium-hall" && selection.bookingMode === "SINGLE";
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const pkg = findPackage(rateTable, selection.packageId);

  if (midHallOnly || !pkg) {
    return (
      <section className="rounded border border-border bg-background p-7">
        <h2 className="text-[19px] font-semibold">2. 구성 · 옵션</h2>
        <p className="mt-3 text-[13.5px] text-muted">
          {midHallOnly
            ? "중형공연장은 패키지가 없습니다 — 추가 옵션 화면은 다음 업데이트에서 반영됩니다(화면시나리오 기능정의 2-43 옵션 목록 확정 후)."
            : "예상 관객 규모에 맞는 패키지를 아직 찾지 못했습니다. STEP 1에서 관객 규모를 확인해 주세요."}
        </p>
      </section>
    );
  }

  const grouped = new Map<AddonCategory, AddonItem[]>();
  for (const addon of rateTable.addons) {
    if (!isAddonAvailable(addon, pkg)) continue;
    if (addon.visibility === "HIDDEN") continue; // 자동 산입 항목 — 신청자가 선택하는 화면이 아니다 (2-71)
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  const optionsTotal = [...grouped.values()]
    .flat()
    .reduce((sum, addon) => {
      if (addon.billingPhase === "SETTLEMENT") return sum;
      const qty = addonQuantities[addon.id] ?? 0;
      const included = includedQuantity(pkg, addon.id);
      if (addon.pricingType === "REVENUE_PERCENT") {
        return qty > 0 ? sum + Math.round((expectedRevenue * addon.unitPrice) / 100) : sum;
      }
      return sum + Math.max(qty - included, 0) * addon.unitPrice;
    }, 0);

  const midHallLine = isSimultaneous ? midHallSummaryLine(selection) : null;

  return (
    <section className="rounded border border-border bg-background p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="text-[19px] font-semibold">
            아레나 <span className="text-[14px] font-normal text-muted">· 관객 규모 기준 자동 산정</span>
          </h2>
          <p className="mt-1 text-[12.5px] text-muted">
            {pkg.audienceTier.label} · 예상 관객 {selection.expectedAudience.toLocaleString()}명 ·{" "}
            {arenaSummaryLine(selection, defaultPerformanceDays)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2.5 text-[12.5px] font-medium text-muted">
          기본 구성 (대관료 포함) — 항목 · 수량. 관객 규모와 무관하게 동일하게 제공됩니다.
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pkg.includedItems.length === 0 ? (
            <div className="col-span-full text-[12.5px] text-muted">별도 기본 포함 항목 없음</div>
          ) : (
            pkg.includedItems.map((item) => {
              const addon = findAddon(rateTable, item.addonId);
              return (
                <div key={item.addonId} className="rounded-sm border border-border bg-panel/60 px-3 py-2">
                  <div className="text-[11px] text-muted">{addon?.name ?? item.addonId}</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-accent">
                    {item.quantity.toLocaleString()}
                    {addon?.unitLabel.includes("일") ? "일" : ""}
                  </div>
                </div>
              );
            })
          )}
          <div className="rounded-sm border border-border bg-panel/60 px-3 py-2">
            <div className="text-[11px] text-muted">홍보 디지털 매체</div>
            <div className="mt-0.5 text-[13px] font-semibold text-accent">
              {pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-muted">
          <span>대기실 {pkg.waitingRoomNote}</span>
          <span>부속공간 {pkg.sideFacilities}</span>
          {pkg.outdoorPlazaIncluded && <span>야외광장 · 티켓박스 · 하역시설 포함</span>}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-2.5 text-[12.5px] font-medium text-muted">
          선택 옵션 — 수량을 정하면 단가 × 수량으로 금액이 즉시 계산됩니다
        </div>
        <div className="space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
                {ADDON_CATEGORY_LABEL[category]}
              </div>
              <div className="space-y-2">
                {items.map((addon) => (
                  <AddonRow
                    key={addon.id}
                    addon={addon}
                    included={includedQuantity(pkg, addon.id)}
                    quantity={addonQuantities[addon.id] ?? 0}
                    expectedRevenue={expectedRevenue}
                    onChangeQuantity={onChangeQuantity}
                    onChangeRevenue={onChangeRevenue}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-sm bg-panel px-4 py-3 text-[13.5px] font-semibold">
          <span>선택 옵션 합계</span>
          <span className="tabular-nums">{won(optionsTotal)}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          총 대관료는 신청서 제출 직전(STEP 3-3)에 확인합니다. 이 화면은 선택 옵션 금액까지만
          보여줍니다.
        </p>
      </div>

      {isSimultaneous && (
        <div className="mt-7 border-t border-border pt-5">
          <div className="text-[13px] font-semibold">중형공연장</div>
          {midHallLine ? (
            <p className="mt-1 text-[12.5px] text-muted">
              일 요금제 · {midHallLine} · 기본 구성: 대기실 4개실 · 퀵체인지룸 · 로비 · 분장실
              (아레나와 별개 공간) · 선택 옵션 화면은 다음 업데이트에서 반영됩니다.
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] text-muted">
              중형 일정이 아직 없습니다 — STEP 1(공간·일정)의 중형 일정 탭에서 먼저 날짜를
              지정해 주세요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function AddonRow({
  addon,
  included,
  quantity,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  addon: AddonItem;
  included: number;
  quantity: number;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const isUtil = addon.billingPhase === "SETTLEMENT";
  const isRevenue = addon.pricingType === "REVENUE_PERCENT";
  const ruleTag =
    addon.availability.mode === "IF_PACKAGE_IN"
      ? `패키지 ${addon.availability.packages?.join("·")} 전용`
      : addon.availability.mode === "IF_NOT_INCLUDED"
        ? "미포함 시 선택"
        : null;

  const maxTotal =
    addon.availability.maxAddQuantity && addon.availability.maxAddQuantity !== "UNLIMITED"
      ? included + addon.availability.maxAddQuantity
      : undefined;

  const priceLabel = isUtil
    ? "실사용 정산"
    : isRevenue
      ? `매출 ${addon.unitPrice}%`
      : `${won(addon.unitPrice)} / ${addon.unitLabel.replace("원/", "")}`;

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        isUtil ? "border-border/70 bg-panel/50 opacity-60" : "border-border bg-panel/60",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13.5px] font-medium">{addon.name}</span>
          {included > 0 && (
            <span className="rounded-sm bg-good-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-good">
              {included} 기본포함
            </span>
          )}
          {ruleTag && (
            <span className="rounded-sm bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">
              {ruleTag}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted">
          {addon.unitLabel}
          {addon.note ? ` · ${addon.note}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className="whitespace-nowrap text-[12px] text-muted">{priceLabel}</span>

        {isUtil ? (
          <span className="whitespace-nowrap text-[12.5px] text-muted">정산 단계 부과</span>
        ) : isRevenue ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted">
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(e) => onChangeQuantity(addon.id, e.target.checked ? 1 : 0)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              적용
            </label>
            <input
              type="number"
              min={0}
              step={1_000_000}
              placeholder="예상매출"
              value={expectedRevenue || ""}
              disabled={quantity <= 0}
              onChange={(e) => onChangeRevenue(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 shrink-0 rounded-sm border border-border bg-background px-2.5 py-1.5 text-right text-[13px] outline-none focus:border-accent disabled:opacity-40 sm:w-28"
            />
          </div>
        ) : (
          <input
            type="number"
            min={0}
            max={maxTotal}
            value={quantity || ""}
            placeholder="0"
            onChange={(e) =>
              onChangeQuantity(addon.id, Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 shrink-0 rounded-sm border border-border bg-background px-2.5 py-1.5 text-right text-[13px] outline-none focus:border-accent"
          />
        )}
      </div>
    </div>
  );
}
