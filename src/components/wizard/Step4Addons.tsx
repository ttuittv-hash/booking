"use client";

import { num, won } from "@/lib/format";
import { findPackage, includedQuantity, isAddonAvailable } from "@/lib/pricing/rateTableUtils";
import {
  ADDON_CATEGORY_LABEL,
  type AddonCategory,
  type AddonItem,
  type RateTable,
} from "@/lib/pricing/types";
import { ComparisonTable } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

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
        <StepHeading
        title={<>추가 옵션 선택</>}
        lead={<>먼저 규모·패키지 선택 단계에서 패키지를 고르세요.</>}
      />
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

  const hasAnyIncluded = [...grouped.values()]
    .flat()
    .some((a) => includedQuantity(pkg, a.id) > 0);

  return (
    <section>
      <StepHeading
        title={<>추가 옵션 선택</>}
        lead={<>기본 포함분은 초과분만 과금됩니다:{" "}
        <b className="text-foreground">MAX(신청−기본, 0) × 단가</b>. 유틸리티는 정산 시 실사용
        부과됩니다.</>}
      />

      {/*
        카테고리마다 표를 만들면 열 수·열 폭이 묶음마다 달라진다.
        한 표에 소제목 행으로 묶어 열 구성을 한 번만 정한다.
        "기본 포함" 열은 이 패키지에 포함 수량이 하나라도 있을 때만 만든다.
      */}
      <div className="mt-8">
        <ComparisonTable
          dense
          rowLabel="항목"
          columns={[
            ...(hasAnyIncluded ? [{ key: "included", title: "기본 포함" }] : []),
            { key: "price", title: "단가" },
            { key: "request", title: "신청" },
          ]}
          groups={[...grouped.entries()].map(([category, items]) => ({
            title: `${ADDON_CATEGORY_LABEL[category]} (${items.length})`,
            rows: items.map((addon) => {
              const included = includedQuantity(pkg, addon.id);
              return {
                // 한 표 안에 단위가 섞이므로 단위는 항상 항목명 옆에 적는다.
                label: rowLabel(addon, true),
                cells: [
                  ...(hasAnyIncluded ? [included > 0 ? num(included) : "—"] : []),
                  addon.pricingType === "METERED" ? "—" : won(addon.unitPrice),
                  <span key="q" className="flex justify-end">
                    <QuantityControl
                      addon={addon}
                      included={included}
                      quantity={addonQuantities[addon.id] ?? 0}
                      expectedRevenue={expectedRevenue}
                      onChangeQuantity={onChangeQuantity}
                      onChangeRevenue={onChangeRevenue}
                    />
                  </span>,
                ],
              };
            }),
          }))}
        />
      </div>
    </section>
  );
}

/** 수량 조절 스테퍼 — 샤프 1px 보더 */
const STEP_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border-soft text-r font-normal text-foreground transition-colors hover:border-foreground hover:bg-inverse-bg hover:text-inverse-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-soft disabled:hover:bg-transparent disabled:hover:text-foreground";

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
            className="h-4 w-4 accent-foreground"
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
