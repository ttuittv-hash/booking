import { resolveSelectedDates } from "./dateRange";
import {
  countPerformanceDays,
  findAddon,
  findPackage,
  includedQuantity,
  isDefaultPerformanceWeekday,
  packagePrice,
} from "./rateTableUtils";
import { DEFAULT_VENUE_ID } from "./types";
import type { EstimatedQuote, LineItem, LineItemVisibility, PricingType, QuoteSelection, RateTable } from "./types";

const METERED_NOTICE =
  "전기·상하수도·냉난방 등 유틸리티는 실사용량 기준으로 정산 단계에서 부과됩니다.";

// [개정 2026-08-19] 아레나 유틸리티(수도광열비·당일철수·익일철야)·Bowl 사용료는 전 패키지
// 동일/규모 연동 금액이 견적 합계에 자동 산입되지만, 신청자 화면에는 항목·금액 모두 노출하지
// 않는다(HIDDEN) — 2026-08-14에 도입했던 "합계 검산용으로 한 줄만 노출" 절충안(부록B #1)은
// 폐기한다. LineItem 자체는 계속 만들어 합계 계산에는 포함시키고, 화면에서 걸러내는 책임은
// 소비 측(SummaryPanel/Step5Estimate/print·mypage 상세)에 맡긴다 — 관리자 화면(print·mypage의
// user.role === "ADMIN")만 예외적으로 항목을 그대로 보여준다.
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
    items.push(makeLine("BASE_FEE", "기본 대관료", "FIXED_PER_WEEK", 1, 0, 1, price, price, "VISIBLE"));

    // (1-1) 패키지 할인 — 관리자가 설정한 경우에만 기본 대관료에 적용
    if (pkg.discountRatio > 0) {
      const discountAmount = Math.round(pkg.baseFeePerWeek * pkg.discountRatio);
      items.push(
        makeLine(
          "package_discount",
          `대관료 할인 (${Math.round(pkg.discountRatio * 100)}%)`,
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

    // (2) 제외 요일 할인 — 화~일 6일 중 실제 사용하지 않는 요일만큼 정액 할인.
    // [확정 2026-08-14, 기능정의서 2-37/2-38] 기존 "기본 대관료 × 1/6 균등" 임시 규칙 폐기.
    // 확정 추가일 단가(셋업/공연)를 대칭 적용한다 — 제외하는 요일이 패키지 기본값상 준비일인지
    // 공연일인지에 따라 다른 단가로 차감한다(요일 자체가 선택안에서 사라지므로 날짜별 dayTags가
    // 아니라 WEEKDAYS 상의 패키지 기본 배치로 판정, isDefaultPerformanceWeekday).
    if (selection.excludedDays.length > 0) {
      const excludedPrepCount = selection.excludedDays.filter(
        (day) => !isDefaultPerformanceWeekday(day, pkg.defaultPerformanceDays),
      ).length;
      const excludedPerformanceCount = selection.excludedDays.length - excludedPrepCount;

      if (excludedPrepCount > 0) {
        items.push(
          makeLine(
            "day_exclusion_discount_prep",
            `제외 요일 할인 — 준비일 (${excludedPrepCount}일)`,
            "PER_DAY",
            excludedPrepCount,
            0,
            excludedPrepCount,
            pkg.setupExtraDayFee,
            -(excludedPrepCount * pkg.setupExtraDayFee),
            "VISIBLE",
          ),
        );
      }
      if (excludedPerformanceCount > 0) {
        items.push(
          makeLine(
            "day_exclusion_discount_performance",
            `제외 요일 할인 — 공연일 (${excludedPerformanceCount}일)`,
            "PER_DAY",
            excludedPerformanceCount,
            0,
            excludedPerformanceCount,
            pkg.performanceExtraDayFee,
            -(excludedPerformanceCount * pkg.performanceExtraDayFee),
            "VISIBLE",
          ),
        );
      }
    }

    // (2-1) 추가 일수 — 일요일 이후로 연장하는 일수를 일 단위로 과금.
    // [확정 2026-08-14, 기능정의서 2-38] 연장일은 준비일 성격의 추가 접근일로 보고
    // 셋업(준비일) 추가 단가를 적용한다(전 패키지 동일 46,790,000원/일).
    if (selection.extraDays > 0) {
      const price = pkg.setupExtraDayFee;
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

    // (2-2) 준비일/공연일 조정 — 패키지 기본 공연일수 대비 실제 지정한 공연일수 차이만큼 가감.
    // [확정 2026-08-14, 기능정의서 2-38] 공연일 추가 단가(패키지별 상이)를 적용한다.
    const selectedDates = resolveSelectedDates(selection);
    const performanceDayCount = countPerformanceDays(selectedDates, selection.dayTags, pkg.defaultPerformanceDays);
    const performanceDelta = performanceDayCount - pkg.defaultPerformanceDays;
    if (performanceDelta !== 0) {
      const unitPrice = pkg.performanceExtraDayFee;
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
    // 신청자가 선택하거나 화면에서 항목을 보는 절차가 없다 — HIDDEN. 신청자 화면에서는 항목·
    // 금액 모두 완전히 숨긴다(소비 측에서 visibility==="HIDDEN" 라인을 걸러낸다).
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
