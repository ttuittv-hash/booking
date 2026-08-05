"use client";

import { won } from "@/lib/format";
import { findPackage, includedQuantity, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  type AddonCategory,
  type AddonItem,
  type RateTable,
} from "@/lib/pricing/types";

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
      <section className="rounded border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">
          먼저 1단계에서 패키지를 선택하세요.
        </p>
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
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">5. 추가 옵션 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        기본 포함분은 초과분만 과금됩니다:{" "}
        <b className="text-foreground">MAX(신청−기본, 0) × 단가</b>. 유틸리티는
        정산 시 실사용 부과됩니다.
      </p>

      <div className="mt-6 space-y-7">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-accent">
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
