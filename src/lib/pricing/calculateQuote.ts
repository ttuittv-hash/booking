import { resolveSelectedDates } from "./dateRange";
import { countPerformanceDays, extraDayPrice, findAddon, findPackage, includedQuantity, packagePrice } from "./rateTableUtils";
import { DEFAULT_VENUE_ID } from "./types";
import type { EstimatedQuote, LineItem, LineItemVisibility, PricingType, QuoteSelection, RateTable } from "./types";

const METERED_NOTICE =
  "전기·상하수도·냉난방 등 유틸리티는 실사용량 기준으로 정산 단계에서 부과됩니다.";

// [개정 2026-08-14, 기능정의서 2-48] 아레나 유틸리티(수도광열비·당일철수·익일철야)는 전 패키지
// 동일 금액이 견적에 자동 산입되며 신청자 화면에는 항목 자체가 드러나지 않는다(Ⓒ, HIDDEN).
// 부록B #1 — 합계 포함 여부 자체는 아직 최종 확정 전이라, 문서가 권장하는 절충안(2-71 검토사항)을
// 따른다: 합계에는 포함하되 "유틸리티(필수)" 한 줄만 금액과 함께 노출해 신청자가 총액을 검산할 수
// 있게 한다 — 세부 3항목(수도광열비/당일철수/익일철야) 단가는 계속 감춘다.
const ARENA_HIDDEN_UTILITY_LABEL = "유틸리티(필수)";

function makeLine(
  addonId: string,
  label: string,
  pricingType: PricingType,
  requested: number,
  included: number,
  billable: number,
  unitPrice: number,
  amount: number,
  visibility: LineItemVisibility,
  phase: LineItem["phase"] = "ESTIMATE",
): LineItem {
  return { addonId, label, pricingType, requested, included, billable, unitPrice, amount, phase, visibility };
}

/**
 * 순수 함수: 선택 상태 + 요금표 → 견적(예상 대관료).
 * 명세서 4.1의 계산 규칙을 그대로 구현한다. UI/스토리지에 의존하지 않는다.
 */
export function calculateQuote(selection: QuoteSelection, rateTable: RateTable): EstimatedQuote {
  const pkg = findPackage(rateTable, selection.packageId);
  const items: LineItem[] = [];

  if (pkg) {
    // (1) 패키지 가격 — 요금표 고정값 그 자체 (Ⓐ 구성항목·Ⓑ Bowl 사용료가 내재된 표시 대관료)
    const price = packagePrice(rateTable, pkg);
    items.push(makeLine("BASE_FEE", "패키지 가격", "FIXED_PER_WEEK", 1, 0, 1, price, price, "VISIBLE"));

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
          "VISIBLE",
        ),
      );
    }

    // (2) 제외 요일 할인 — 화~일 6일 중 실제 사용하지 않는 요일만큼 정액 할인
    // [부록B #2] 정확한 차감 단가 규칙은 아직 미확정 — 확정 전까지는 기존 임시 비율을 유지한다.
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
          "VISIBLE",
        ),
      );
    }

    // (2-1) 추가 일수 — 일요일 이후로 연장하는 일수를 일 단위로 과금 (초과 주차 단가 ÷ 6일)
    // [부록B #22] 셋업/공연 추가일 확정 단가(2-38)는 아직 반영 전 — 기존 임시 비율을 유지한다.
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
          "VISIBLE",
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
          "VISIBLE",
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
          "VISIBLE",
        ),
      );
    }

    // (3-1) 유틸리티(필수) — [아레나 전용] 전 패키지 동일 금액이 자동 산입된다 (2-36 ②, 2-48).
    // 신청자가 선택하거나 화면에서 항목을 보는 절차가 없다 — HIDDEN. 부록B #1 절충안에 따라
    // 세부 3항목은 감추고 합계 한 줄만 노출한다(아래 UI에서 처리).
    if ((pkg.venueId ?? DEFAULT_VENUE_ID) === "arena") {
      const hiddenUtilityAddons = rateTable.addons.filter(
        (a) => a.category === "UTILITY" && a.visibility === "HIDDEN" && a.billingPhase === "ESTIMATE",
      );
      if (hiddenUtilityAddons.length > 0) {
        const utilityTotal = hiddenUtilityAddons.reduce((sum, a) => sum + a.unitPrice, 0);
        items.push(
          makeLine(
            "utility_bundle",
            ARENA_HIDDEN_UTILITY_LABEL,
            "FIXED_PER_WEEK",
            1,
            0,
            1,
            utilityTotal,
            utilityTotal,
            "HIDDEN",
          ),
        );
      }
    }

    // (4) 선택 부대시설 — 초과분만 과금
    for (const selected of selection.addons) {
      if (selected.addonId === "cleaning") continue; // 위에서 이미 처리
      const addonItem = findAddon(rateTable, selected.addonId);
      if (!addonItem) continue;
      if (addonItem.billingPhase === "SETTLEMENT") continue; // 유틸리티는 예상견적 제외
      if (addonItem.visibility === "HIDDEN") continue; // 자동 산입 항목은 위에서 별도 처리

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
          addonItem.visibility,
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
