"use client";

import { num } from "@/lib/format";
import { findPackage, includedQuantity, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  type AddonCategory,
  type AddonItem,
  type RateTable,
} from "@/lib/pricing/types";
import { ComparisonTable } from "@/components/ui/kit";

/** 단가 열 헤더에 한 번만 붙일 단위. 묶음 안에서 단위가 갈리면 항목명 옆에 표기한다. */
function groupRateUnit(items: AddonItem[]): { sub: string; perRow: boolean } {
  const units = new Set(
    items.filter((a) => a.pricingType !== "METERED").map((a) => a.unitLabel),
  );
  if (units.size === 0) return { sub: "실사용 정산", perRow: false };
  if (units.size === 1) return { sub: [...units][0], perRow: false };
  return { sub: "원", perRow: true };
}

function ruleTagOf(addon: AddonItem): string | null {
  if (addon.availability.mode === "IF_PACKAGE_IN") {
    return `패키지 ${addon.availability.packages?.join("·")} 전용`;
  }
  if (addon.availability.mode === "IF_NOT_INCLUDED") return "미포함 시 선택";
  return null;
}

/** 항목명 + (묶음 단위가 갈릴 때만) 단위 + 조건 메모 */
function rowLabel(addon: AddonItem, perRow: boolean): string {
  const unit =
    perRow && addon.pricingType !== "METERED"
      ? ` (${addon.unitLabel.replace(/^원\//, "")})`
      : "";
  const qualifier = addon.note ?? ruleTagOf(addon);
  return `${addon.name}${unit}${qualifier ? ` · ${qualifier}` : ""}`;
}

export function Step4Addons({
  rateTable,
  packageId,
  addonQuantities,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  rateTable: RateTable;
  packageId: number | null;
  addonQuantities: Record<string, number>;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const pkg = findPackage(rateTable, packageId);

  if (!pkg) {
    return (
      <section>
        <h2 className="type-kr-heading text-h4-m sm:text-h4">추가 옵션 선택</h2>
        <p className="mt-3 text-s text-muted">먼저 2단계에서 패키지를 선택하세요.</p>
      </section>
    );
  }

  const grouped = new Map<AddonCategory, AddonItem[]>();
  for (const addon of rateTable.addons) {
    if (!isAddonAvailable(addon, pkg)) continue;
    const list = grouped.get(addon.category) ?? [];
    list.push(addon);
    grouped.set(addon.category, list);
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h4-m sm:text-h4">추가 옵션 선택</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        기본 포함분은 초과분만 과금됩니다:{" "}
        <b className="text-foreground">MAX(신청−기본, 0) × 단가</b>. 유틸리티는 정산 시 실사용
        부과됩니다.
      </p>

      <div className="mt-8 space-y-10">
        {[...grouped.entries()].map(([category, items]) => {
          const { sub, perRow } = groupRateUnit(items);
          return (
            <div key={category}>
              <div className="flex items-baseline gap-3">
                <h3 className="type-kr-heading text-h6-m sm:text-h6">
                  {ADDON_CATEGORY_LABEL[category]}
                </h3>
                <span className="text-xs tabular-nums text-muted">{items.length}</span>
              </div>

              <ComparisonTable
                dense
                rowLabel="항목"
                columns={[
                  { key: "included", title: "기본 포함", sub: "수량" },
                  { key: "price", title: "단가", sub },
                  { key: "request", title: "신청", sub: "수량" },
                ]}
                rows={items.map((addon) => {
                  const included = includedQuantity(pkg, addon.id);
                  return {
                    label: rowLabel(addon, perRow),
                    cells: [
                      included > 0 ? num(included) : "—",
                      addon.pricingType === "METERED" ? "—" : num(addon.unitPrice),
                      <QuantityControl
                        key="q"
                        addon={addon}
                        included={included}
                        quantity={addonQuantities[addon.id] ?? 0}
                        expectedRevenue={expectedRevenue}
                        onChangeQuantity={onChangeQuantity}
                        onChangeRevenue={onChangeRevenue}
                      />,
                    ],
                  };
                })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** 수량 조절 스테퍼 — 샤프 1px 보더 */
const STEP_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border-soft text-r font-normal text-foreground transition-colors hover:border-foreground hover:bg-accent hover:text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-soft disabled:hover:bg-transparent disabled:hover:text-foreground";

function QuantityControl({
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
  if (addon.billingPhase === "SETTLEMENT") {
    return <span className="whitespace-nowrap text-xs font-normal text-muted">정산 시 부과</span>;
  }

  if (addon.pricingType === "REVENUE_PERCENT") {
    return (
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-normal text-muted">
          <input
            type="checkbox"
            checked={quantity > 0}
            onChange={(e) => onChangeQuantity(addon.id, e.target.checked ? 1 : 0)}
            className="h-4 w-4 accent-accent"
          />
          적용
        </label>
        <span className="block w-28">
          <input
            type="number"
            min={0}
            step={1_000_000}
            placeholder="예상매출"
            value={expectedRevenue || ""}
            disabled={quantity <= 0}
            onChange={(e) => onChangeRevenue(Math.max(0, Number(e.target.value) || 0))}
            aria-label={`${addon.name} 예상매출`}
            className="field-base text-right font-normal tabular-nums disabled:opacity-40"
          />
        </span>
      </div>
    );
  }

  const maxTotal =
    addon.availability.maxAddQuantity && addon.availability.maxAddQuantity !== "UNLIMITED"
      ? included + addon.availability.maxAddQuantity
      : undefined;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChangeQuantity(addon.id, Math.max(0, quantity - 1))}
        disabled={quantity <= 0}
        aria-label={`${addon.name} 수량 감소`}
        className={STEP_BTN}
      >
        −
      </button>
      <span className="block w-14">
        <input
          type="number"
          min={0}
          max={maxTotal}
          value={quantity || ""}
          placeholder="0"
          onChange={(e) => onChangeQuantity(addon.id, Math.max(0, Number(e.target.value) || 0))}
          aria-label={`${addon.name} 신청 수량`}
          className="field-base px-2.5 text-right font-normal tabular-nums"
        />
      </span>
      <button
        type="button"
        onClick={() =>
          onChangeQuantity(
            addon.id,
            maxTotal !== undefined ? Math.min(maxTotal, quantity + 1) : quantity + 1,
          )
        }
        disabled={maxTotal !== undefined && quantity >= maxTotal}
        aria-label={`${addon.name} 수량 증가`}
        className={STEP_BTN}
      >
        +
      </button>
    </div>
  );
}
