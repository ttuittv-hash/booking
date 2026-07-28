import { getAddon, getPackage, includedQuantity } from "./seed";
import type { LineItem, PricingType, Quote, QuoteSelection, RateTable } from "./types";

const METERED_NOTICE =
  "전기·상하수도·냉난방 등 유틸리티는 실사용량 기준으로 정산 단계에서 부과됩니다.";

function makeLine(
  addonId: string,
  label: string,
  pricingType: PricingType,
  requested: number,
  included: number,
  billable: number,
  unitPrice: number,
  amount: number,
  phase: LineItem["phase"] = "ESTIMATE",
): LineItem {
  return { addonId, label, pricingType, requested, included, billable, unitPrice, amount, phase };
}

/**
 * 순수 함수: 선택 상태 + 요금표 → 견적(예상 대관료).
 * 명세서 4.1의 계산 규칙을 그대로 구현한다. UI/스토리지에 의존하지 않는다.
 */
export function calculateQuote(selection: QuoteSelection, rateTable: RateTable): Quote {
  const pkg = getPackage(selection.packageId);
  const items: LineItem[] = [];

  if (pkg) {
    // (1) 기본 대관료 — 정찰제 고정가
    items.push(
      makeLine("BASE_FEE", "기본 대관료", "FIXED_PER_WEEK", 1, 0, 1, pkg.baseFeePerWeek, pkg.baseFeePerWeek),
    );

    // (2) 초과 주차 — MAX(신청주 - 포함주, 0)
    const requestedWeeks = 1 + selection.extraWeeks;
    const billableWeeks = Math.max(requestedWeeks - pkg.includedWeeks, 0);
    if (billableWeeks > 0) {
      const extraWeekPrice = rateTable.extraWeekPrice(pkg);
      items.push(
        makeLine(
          "extra_week",
          "초과 주차",
          "PER_WEEK",
          requestedWeeks,
          pkg.includedWeeks,
          billableWeeks,
          extraWeekPrice,
          billableWeeks * extraWeekPrice,
        ),
      );
    }

    // (3) 청소비 — 관객수 자동 산출 (기본 포함 없음, 전량 과금)
    const cleaning = getAddon("cleaning");
    if (cleaning) {
      items.push(
        makeLine(
          "cleaning",
          cleaning.name,
          cleaning.pricingType,
          selection.expectedAudience,
          0,
          selection.expectedAudience,
          cleaning.unitPrice,
          selection.expectedAudience * cleaning.unitPrice,
        ),
      );
    }

    // (4) 선택 부대시설 — 초과분만 과금
    for (const selected of selection.addons) {
      if (selected.addonId === "cleaning") continue; // 위에서 이미 처리
      const addonItem = getAddon(selected.addonId);
      if (!addonItem) continue;
      if (addonItem.billingPhase === "SETTLEMENT") continue; // 유틸리티는 예상견적 제외

      const included = includedQuantity(pkg, addonItem.id);
      const billable = Math.max(selected.requestedQuantity - included, 0);

      let amount: number;
      if (addonItem.pricingType === "REVENUE_PERCENT") {
        amount = Math.round(((selection.expectedRevenue ?? 0) * addonItem.unitPrice) / 100);
      } else {
        amount = billable * addonItem.unitPrice;
      }

      items.push(
        makeLine(
          addonItem.id,
          addonItem.name,
          addonItem.pricingType,
          selected.requestedQuantity,
          included,
          billable,
          addonItem.unitPrice,
          amount,
        ),
      );
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vat = Math.round(subtotal * rateTable.vatRate);

  return {
    id: "",
    selection,
    rateTableVersion: rateTable.version,
    lineItems: items,
    subtotal,
    vat,
    total: subtotal + vat,
    meteredNotice: METERED_NOTICE,
    status: "ESTIMATE",
    createdAt: "",
  };
}
