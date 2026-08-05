"use client";

import { won } from "@/lib/format";
import { findPackage, includedQuantity, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  type AddonCategory,
  type AddonItem,
  type RateTable,
} from "@/lib/pricing/types";
import { Badge, Label } from "@/components/ui/kit";

/** 수량 입력 — ProfileForm 의 FIELD 규격을 좁은 숫자 입력용으로 맞춘 변형 */
const NUM_FIELD =
  "shrink-0 border border-border-soft bg-surface px-2.5 py-2 text-right text-s tabular-nums text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent disabled:opacity-40";

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
        <Label className="text-muted">Step 04</Label>
        <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">추가 옵션 선택</h2>
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
      <Label className="text-muted">Step 04</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">추가 옵션 선택</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        기본 포함분은 초과분만 과금됩니다:{" "}
        <b className="text-foreground">MAX(신청−기본, 0) × 단가</b>. 유틸리티는 정산 시 실사용
        부과됩니다.
      </p>

      <div className="mt-8 space-y-9">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground pb-2.5">
              <h3 className="type-label text-xs">{ADDON_CATEGORY_LABEL[category]}</h3>
              <span className="text-xs tabular-nums text-muted">{items.length}개 항목</span>
            </div>
            <ul>
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
            </ul>
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

  // 수량 조절 스테퍼 — 샤프 1px 보더
  const stepBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center border border-border-soft bg-surface text-r text-foreground outline-none transition-colors hover:border-foreground hover:bg-accent hover:text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-soft disabled:hover:bg-surface disabled:hover:text-foreground";

  return (
    <li
      className={[
        "flex flex-col gap-3 border-b border-border/15 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        isUtil ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-s font-bold">{addon.name}</span>
          {included > 0 && <Badge tone="good">{included} 기본포함</Badge>}
          {ruleTag && <Badge tone="warn">{ruleTag}</Badge>}
        </div>
        <div className="mt-1 text-xs text-muted">
          {addon.unitLabel}
          {addon.note ? ` · ${addon.note}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className="whitespace-nowrap text-xs tabular-nums text-muted">{priceLabel}</span>

        {isUtil ? (
          <span className="whitespace-nowrap text-xs text-muted">정산 단계 부과</span>
        ) : isRevenue ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
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
              aria-label={`${addon.name} 예상매출`}
              className={`${NUM_FIELD} w-24 sm:w-28`}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeQuantity(addon.id, Math.max(0, quantity - 1))}
              disabled={quantity <= 0}
              aria-label={`${addon.name} 수량 감소`}
              className={stepBtn}
            >
              −
            </button>
            <input
              type="number"
              min={0}
              max={maxTotal}
              value={quantity || ""}
              placeholder="0"
              onChange={(e) =>
                onChangeQuantity(addon.id, Math.max(0, Number(e.target.value) || 0))
              }
              aria-label={`${addon.name} 신청 수량`}
              className={`${NUM_FIELD} w-14`}
            />
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
              className={stepBtn}
            >
              +
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
