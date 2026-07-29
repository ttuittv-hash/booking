import { resolveSelectedDates } from "./dateRange";
import { countPerformanceDays, extraDayPrice, findAddon, findPackage, includedQuantity } from "./rateTableUtils";
import type { EstimatedQuote, LineItem, PricingType, QuoteSelection, RateTable } from "./types";

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
export function calculateQuote(selection: QuoteSelection, rateTable: RateTable): EstimatedQuote {
  const pkg = findPackage(rateTable, selection.packageId);
  const items: LineItem[] = [];

  if (pkg) {
    // (1) 기본 대관료 — 정찰제 고정가
    items.push(
      makeLine("BASE_FEE", "기본 대관료", "FIXED_PER_WEEK", 1, 0, 1, pkg.baseFeePerWeek, pkg.baseFeePerWeek),
    );

    // (1-1) 패키지 할인 — 관리자가 설정한 경우에만 기본 대관료에 적용
    if (pkg.discountRatio > 0) {
      const discountAmount = Math.round(pkg.baseFeePerWeek * pkg.discountRatio);
      items.push(
        makeLine(
          "package_discount",
          `패키지 할인 (${Math.round(pkg.discountRatio * 100)}%)`,
          "FIXED_PER_WEEK",
          1,
          0,
          1,
          discountAmount,
          -discountAmount,
        ),
      );
    }

    // (2) 제외 요일 할인 — 화~일 6일 중 실제 사용하지 않는 요일만큼 정액 할인
    if (selection.excludedDays.length > 0) {
      const perDayDiscount = Math.round(pkg.baseFeePerWeek * rateTable.dayExclusionDiscountRatio);
      const excludedDayCount = selection.excludedDays.length;
      items.push(
        makeLine(
          "day_exclusion_discount",
          `제외 요일 할인 (${excludedDayCount}일)`,
          "PER_DAY",
          excludedDayCount,
          0,
          excludedDayCount,
          perDayDiscount,
          -(perDayDiscount * excludedDayCount),
        ),
      );
    }

    // (2-1) 추가 일수 — 일요일 이후로 연장하는 일수를 일 단위로 과금 (초과 주차 단가 ÷ 6일)
    if (selection.extraDays > 0) {
      const price = extraDayPrice(rateTable, pkg);
      items.push(
        makeLine(
          "extra_days",
          "추가 일수",
          "PER_DAY",
          selection.extraDays,
          0,
          selection.extraDays,
          price,
          selection.extraDays * price,
        ),
      );
    }

    // (2-2) 준비일/공연일 조정 — 패키지 기본 공연일수 대비 실제 지정한 공연일수 차이만큼 가감
    const selectedDates = resolveSelectedDates(selection);
    const performanceDayCount = countPerformanceDays(selectedDates, selection.dayTags, pkg.defaultPerformanceDays);
    const performanceDelta = performanceDayCount - pkg.defaultPerformanceDays;
    if (performanceDelta !== 0) {
      const unitPrice = extraDayPrice(rateTable, pkg);
      items.push(
        makeLine(
          "performance_day_adjustment",
          `공연 일수 조정 (기본 ${pkg.defaultPerformanceDays}일 대비 ${performanceDelta > 0 ? "+" : ""}${performanceDelta}일)`,
          "PER_DAY",
          performanceDayCount,
          pkg.defaultPerformanceDays,
          Math.abs(performanceDelta),
          unitPrice,
          performanceDelta * unitPrice,
        ),
      );
    }

    // (3) 청소비 — 관객수 자동 산출 (기본 포함 없음, 전량 과금)
    const cleaning = findAddon(rateTable, "cleaning");
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
      const addonItem = findAddon(rateTable, selected.addonId);
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
    selection,
    rateTableVersion: rateTable.version,
    lineItems: items,
    subtotal,
    vat,
    total: subtotal + vat,
    meteredNotice: METERED_NOTICE,
    status: "ESTIMATE",
  };
}
