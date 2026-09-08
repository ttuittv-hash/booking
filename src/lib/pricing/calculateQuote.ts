import { calculateMidHallLineItems } from "./calculateMidHallQuote";
import { resolveSelectedDates } from "./dateRange";
import { makeLine } from "./lineItem";
import {
  clampAddonQuantity,
  countPerformanceDays,
  defaultDayTags,
  effectiveDayTag,
  findAddon,
  findPackage,
  includedQuantity,
  isDefaultPerformanceWeekday,
  packagePrice,
} from "./rateTableUtils";
import { DEFAULT_VENUE_ID, SPECIAL_VENUE_ID } from "./types";
import type {
  EstimatedQuote,
  LineItem,
  QuoteSelection,
  RateTable,
} from "./types";

const METERED_NOTICE =
  "전기·상하수도·냉난방 등 유틸리티는 실사용량 기준으로 정산 단계에서 부과됩니다.";

// [개정 2026-08-19] 아레나 유틸리티(수도광열비·당일철수·익일철야)·Bowl 사용료는 전 패키지
// 동일/규모 연동 금액이 견적 합계에 자동 산입되지만, 신청자 화면에는 항목·금액 모두 노출하지
// 않는다(HIDDEN) — 2026-08-14에 도입했던 "합계 검산용으로 한 줄만 노출" 절충안(부록B #1)은
// 폐기한다. LineItem 자체는 계속 만들어 합계 계산에는 포함시키고, 화면에서 걸러내는 책임은
// 소비 측(SummaryPanel/Step5Estimate/print·mypage 상세)에 맡긴다 — 관리자 화면(print·mypage의
// user.role === "ADMIN")만 예외적으로 항목을 그대로 보여준다.
const ARENA_HIDDEN_UTILITY_LABEL = "유틸리티(필수)";

/**
 * 순수 함수: 선택 상태 + 요금표 → 견적(예상 대관료).
 * 명세서 4.1의 계산 규칙을 그대로 구현한다. UI/스토리지에 의존하지 않는다.
 */
export function calculateQuote(
  selection: QuoteSelection,
  rateTable: RateTable,
): EstimatedQuote {
  const pkg = findPackage(rateTable, selection.packageId);
  const items: LineItem[] = [];

  if (pkg) {
    // [신규 2026-09-08] "올인원 선택 시 화~일 기간 해제 불가... 총 6일 내에서 준비·공연
    // 일정을 원하는 방식으로 구성할 수 있으므로, 여기서 공연일 추가/삭제/휴무일 이런
    // 것들이 추가 과금되거나 차감되지 않음" — 올인원(SPECIAL_VENUE_ID)은 기본 6일을
    // 고정가로 파는 패키지라, 그 안에서 준비/공연/휴무 역할을 어떻게 배치하든(요일 제외
    // 포함) 가격이 움직이면 안 된다. UI(Step1Calendar allowDayExclusion)에서도 화~일
    // 제외를 막지만, 과거 데이터·API 직접 호출 등 UI를 거치지 않는 경로까지 방어하려면
    // 계산 쪽에서도 막아야 한다 — (2) 요일 제외 할인, (2-2) 공연 일수 조정, (2-3) 공연
    // 2회 할증 세 줄을 스킵한다. (2-1) 6일을 넘는 추가 일수 과금은 그대로 유지한다.
    const isSpecialVenuePackage = pkg.venueId === SPECIAL_VENUE_ID;

    // (1) 패키지 가격 — 요금표 고정값 그 자체 (Ⓐ 구성항목·Ⓑ Bowl 사용료가 내재된 표시 대관료)
    const price = packagePrice(rateTable, pkg);
    items.push(
      makeLine(
        "BASE_FEE",
        `기본 대관료(${pkg.name})`,
        "FIXED_PER_WEEK",
        1,
        0,
        1,
        price,
        price,
        "VISIBLE",
      ),
    );

    // (1-1) 패키지 할인 — 관리자가 설정한 경우에만 기본 대관료에 적용
    // [수정 2026-09-08 밤] "대관료 할인(10%) → 2027년 대관료 할인(10%)"(nora) — 고른 주차의
    // 연도를 앞에 붙인다(개관 연도 프로모션이라는 뜻). 2027 을 박아 두지 않고 선택한 해를
    // 쓰므로 노출월이 다음 해로 넘어가도 라벨이 저절로 따라간다.
    if (pkg.discountRatio > 0) {
      const discountAmount = Math.round(pkg.baseFeePerWeek * pkg.discountRatio);
      items.push(
        makeLine(
          "package_discount",
          `${selection.week.year}년 대관료 할인 (${Math.round(pkg.discountRatio * 100)}%)`,
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
    // 확정 추가일 단가(준비일/공연일)를 대칭 적용한다 — 제외하는 요일이 패키지 기본값상 준비일인지
    // 공연일인지에 따라 다른 단가로 차감한다(요일 자체가 선택안에서 사라지므로 날짜별 dayTags가
    // 아니라 WEEKDAYS 상의 패키지 기본 배치로 판정, isDefaultPerformanceWeekday).
    // [수정 2026-09-08] "준비일/공연일 추가·삭제 시에도 할인율 적용" — /rates 페이지의
    // Rate 카드가 "준비일 추가·삭제"·"공연일 추가·삭제"를 같은 할인가 하나로 보여주는데
    // (정가에 취소선 + extraDayDiscountRatio 배지), 여기(요일 제외 = 삭제 쪽)는 정가
    // 그대로 차감하고 있었다 — 추가 쪽(아래 (2-1))과 같은 할인율을 곱해 대칭을 맞춘다.
    if (!isSpecialVenuePackage && selection.excludedDays.length > 0) {
      const excludedPrepCount = selection.excludedDays.filter(
        (day) => !isDefaultPerformanceWeekday(day, pkg.defaultPerformanceDays),
      ).length;
      const excludedPerformanceCount =
        selection.excludedDays.length - excludedPrepCount;
      const excludedPrepUnitPrice = Math.round(
        pkg.setupExtraDayFee * (1 - pkg.extraDayDiscountRatio),
      );
      const excludedPerformanceUnitPrice = Math.round(
        pkg.performanceExtraDayFee * (1 - pkg.extraDayDiscountRatio),
      );

      if (excludedPrepCount > 0) {
        items.push(
          makeLine(
            "day_exclusion_discount_prep",
            `제외 — 준비일 (${excludedPrepCount}일)`,
            "PER_DAY",
            excludedPrepCount,
            0,
            excludedPrepCount,
            excludedPrepUnitPrice,
            -(excludedPrepCount * excludedPrepUnitPrice),
            "VISIBLE",
          ),
        );
      }
      if (excludedPerformanceCount > 0) {
        items.push(
          makeLine(
            "day_exclusion_discount_performance",
            `제외 — 공연일 (${excludedPerformanceCount}일)`,
            "PER_DAY",
            excludedPerformanceCount,
            0,
            excludedPerformanceCount,
            excludedPerformanceUnitPrice,
            -(excludedPerformanceCount * excludedPerformanceUnitPrice),
            "VISIBLE",
          ),
        );
      }
    }

    const selectedDates = resolveSelectedDates(selection);

    // (2-1) 추가 일수 — 일요일 이후로 연장하는 일수를 일 단위로 과금.
    // [확정 2026-08-14, 기능정의서 2-38] 연장일은 준비일 성격의 추가 접근일로 보고
    // 셋업(준비일) 추가 단가를 적용한다(전 패키지 동일 46,790,000원/일).
    // [신규 2026-09-06] "휴무일을 지정할수 있고 휴무일로 지정하면 공연 준비일에 50%
    // 할인이 붙는 개념" — 화~일 기본 6일 다음으로 개별 추가하는 날에만 고를 수 있는
    // REST 태그(Step1Calendar.tsx가 dayKind.kind !== "base"일 때만 버튼을 보여준다).
    // defaultDayTags는 REST를 절대 자동으로 매기지 않으므로(항상 명시적 지정), 여기서는
    // dayTags에 직접 REST로 찍힌 날짜만 골라 매긴다 — 나머지 추가일(REST가 아닌 날)은
    // 준비일 추가 단가의 10% 할인가로 적용한다.
    // [신규 2026-09-06 ②] "추가 준비일도 기존 준비일 대비 10% 할인" — 기본 6일을 넘겨
    // 추가하는 준비일(REST 제외)에 pkg.extraDayDiscountRatio만큼 할인을 적용한다.
    // [재개정 2026-09-08] "휴무일도 준비일 10% 할인금액에서 또 50% 할인값이 들어가야함" —
    // REST 할인을 정가(setupExtraDayFee)가 아니라 이미 10% 할인된 준비일 단가 위에
    // 50%를 추가로 적용하도록 뒤집는다(2026-09-06 ③ 결정 — "10%와 중복 적용하지
    // 않는다" — 은 폐기). 두 할인이 곱으로 누적된다: 정가 × (1-10%) × (1-50%).
    if (selection.extraDays > 0) {
      const price = pkg.setupExtraDayFee;
      const discountedPrice = Math.round(
        price * (1 - pkg.extraDayDiscountRatio),
      );
      const restPrice = Math.round(
        discountedPrice * (1 - pkg.restDayDiscountRatio),
      );
      // 방어적으로 extraDays를 넘지 않게 자른다 — REST는 추가일에만 쓰는 태그라
      // 기본 6일 쪽에 잘못 남은 값이 있어도 추가 일수 계산에 영향을 주지 않는다.
      const restCount = Math.min(
        selectedDates.filter((d) => selection.dayTags[d] === "REST").length,
        selection.extraDays,
      );
      const fullPriceCount = selection.extraDays - restCount;
      if (fullPriceCount > 0) {
        items.push(
          makeLine(
            "extra_days",
            `추가 일수`,
            "PER_DAY",
            fullPriceCount,
            0,
            fullPriceCount,
            discountedPrice,
            fullPriceCount * discountedPrice,
            "VISIBLE",
          ),
        );
      }
      if (restCount > 0) {
        items.push(
          makeLine(
            "extra_days_rest",
            `추가일수 휴무일 ${restCount}일`,
            "PER_DAY",
            restCount,
            0,
            restCount,
            restPrice,
            restCount * restPrice,
            "VISIBLE",
          ),
        );
      }
    }

    // (2-2) 준비일/공연일 조정 — 패키지 기본 공연일수 대비 실제 지정한 공연일수 차이만큼 가감.
    // [확정 2026-08-14, 기능정의서 2-38] 공연일 추가 단가(패키지별 상이)를 적용한다.
    // [신규 2026-09-06] "추가공연일도 기존 공연일의 10%할인" — 기본 공연일수보다 늘어난
    // 만큼(delta>0, 순수 추가분)만 공연일 추가 단가에서 pkg.extraDayDiscountRatio만큼
    // 할인한다(위 (2-1) 추가 준비일과 같은 비율 — 패키지 관리에서 "같은 값 공유"로 확정,
    // 2026-09-06).
    // [재개정 2026-09-08] "공연일 추가/차감시에도 할인율 적용" — 기본보다 줄어든 경우
    // (delta<0)는 할인 없이 원래 단가로 차감하던 걸(2026-09-06 결정) 뒤집는다. /rates
    // 페이지의 Rate 카드가 "공연일 추가·삭제"를 방향 구분 없이 같은 할인가 하나로
    // 보여주므로, 계산도 늘어나든 줄어든든 같은 할인 단가를 쓴다.
    const performanceDayCount = countPerformanceDays(
      selectedDates,
      selection.dayTags,
      pkg.defaultPerformanceDays,
    );
    // [버그 수정 2026-09-08 밤] "공연일수 1번 제외했는데 두 번 제외되는 오류"(nora) — 일요일
    // (기본 공연일)을 「삭제」하면 위 (1-2) "제외 — 공연일"로 이미 차감됐는데, 여기서 또
    // "기본 2일 대비 -1일"로 한 번 더 뺐다. 비교 기준은 패키지 기본 공연일수에서 **제외로
    // 이미 빠진 기본 공연일**을 뺀 값이어야 한다 — 남은 날짜 안에서만 늘고 준 만큼 가감한다.
    const excludedDefaultPerformanceDays = isSpecialVenuePackage
      ? 0
      : selection.excludedDays.filter((day) =>
          isDefaultPerformanceWeekday(day, pkg.defaultPerformanceDays),
        ).length;
    const performanceBaseline = Math.max(
      0,
      pkg.defaultPerformanceDays - excludedDefaultPerformanceDays,
    );
    const performanceDelta = performanceDayCount - performanceBaseline;
    if (!isSpecialVenuePackage && performanceDelta !== 0) {
      const unitPrice = Math.round(
        pkg.performanceExtraDayFee * (1 - pkg.extraDayDiscountRatio),
      );
      const sign = performanceDelta > 0 ? "+" : "";
      items.push(
        makeLine(
          "performance_day_adjustment",
          `공연 일수 조정 (기본 ${performanceBaseline}일 대비 ${sign}${performanceDelta}일)`,
          "PER_DAY",
          performanceDayCount,
          performanceBaseline,
          Math.abs(performanceDelta),
          unitPrice,
          performanceDelta * unitPrice,
          "VISIBLE",
        ),
      );
    }

    // (2-3) 공연 2회 할증 — "1일 2회 공연 시 아레나는 50% 할증"(2026-09-06).
    // dayShowCounts는 화면 입력만 받고 있던 값(2-20 당시 할증 로직 미정)이었는데,
    // 이제 공연일로 지정된 날짜 중 1일 회차가 2회 이상인 날짜에 한해 공연일 단가
    // (performanceExtraDayFee)에 패키지별 할증률을 곱해 별도 줄로 얹는다. 기존 (2-2)
    // 공연 일수 조정(기본 대비 delta)은 그대로 두고 그 위에 얹는 가산 항목이다 —
    // 기본 포함 공연일이든 추가 공연일이든, 그날 실제로 2회 이상 공연하면 할증한다.
    // [수정 2026-09-08] "할인된 금액에 추가로 할증율 적용" — 할증 기준을 정가
    // (performanceExtraDayFee)가 아니라 (2-2)와 같은 할인 단가로 바꾼다 — 이미 10%
    // 할인된 공연일 단가에 50%를 얹는다.
    // [재수정 2026-09-08 밤] "1일 3회면 2회 추가분인데 1회분만 계산됨" — 날짜(일) 수만
    // 세던 것을 날짜별 "추가 회차" 합으로 바꾼다. 1일 2회는 추가 1회, 1일 3회는 추가
    // 2회 — 할증은 첫 회를 제외한 나머지 회차마다 붙는다.
    if (!isSpecialVenuePackage && pkg.secondShowSurchargeRatio > 0) {
      const defaults = defaultDayTags(
        selectedDates,
        pkg.defaultPerformanceDays,
      );
      const extraShowCount = selectedDates.reduce((sum, date) => {
        if (effectiveDayTag(date, selection.dayTags, defaults) !== "PERFORMANCE") return sum;
        const shows = selection.dayShowCounts[date] ?? 1;
        return shows >= 2 ? sum + (shows - 1) : sum;
      }, 0);
      if (extraShowCount > 0) {
        const discountedPerformanceUnitPrice = Math.round(
          pkg.performanceExtraDayFee * (1 - pkg.extraDayDiscountRatio),
        );
        const unitPrice = Math.round(
          discountedPerformanceUnitPrice * pkg.secondShowSurchargeRatio,
        );
        items.push(
          makeLine(
            "second_show_surcharge",
            `공연 2회 이상 할증 (추가 ${extraShowCount}회 × ${Math.round(pkg.secondShowSurchargeRatio * 100)}%)`,
            "PER_DAY",
            extraShowCount,
            0,
            extraShowCount,
            unitPrice,
            extraShowCount * unitPrice,
            "VISIBLE",
          ),
        );
      }
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
        (a) =>
          a.category === "UTILITY" &&
          a.visibility === "HIDDEN" &&
          a.billingPhase === "ESTIMATE",
      );
      if (hiddenUtilityAddons.length > 0) {
        const utilityTotal = hiddenUtilityAddons.reduce(
          (sum, a) => sum + a.unitPrice,
          0,
        );
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
      if (addonItem.venueId === "medium-hall") continue; // 중형 옵션은 calculateMidHallLineItems 가 합산(2026-09-08)
      if (addonItem.billingPhase === "SETTLEMENT") continue; // 유틸리티는 예상견적 제외
      if (addonItem.visibility === "HIDDEN") continue; // 자동 산입 항목은 위에서 별도 처리

      const included = includedQuantity(pkg, addonItem.id);
      // 상한을 넘겨 들어온 수량은 여기서 자른다(2026-09-02). 화면의 number 입력 max 는
      // 타이핑을 막지 못하고, 폼을 우회한 요청도 있을 수 있어 계산 쪽이 최종 방어선이다.
      const requested = clampAddonQuantity(
        addonItem,
        pkg,
        selected.requestedQuantity,
      );
      const billable = Math.max(requested - included, 0);

      let amount: number;
      if (addonItem.pricingType === "REVENUE_PERCENT") {
        amount = Math.round(
          ((selection.expectedRevenue ?? 0) * addonItem.unitPrice) / 100,
        );
      } else {
        amount = billable * addonItem.unitPrice;
      }

      items.push(
        makeLine(
          addonItem.id,
          addonItem.name,
          addonItem.pricingType,
          requested,
          included,
          billable,
          addonItem.unitPrice,
          amount,
          addonItem.visibility,
        ),
      );
    }

    // 여기까지 쌓인 항목은 전부 아레나 몫이다 — 동시 대관에서 아래 중형 항목과 한 목록에
    // 섞이므로, 화면(SummaryPanel)이 공간별로 나눠 보여줄 수 있게 표시해 둔다.
    items.forEach((item) => {
      item.venue = "arena";
    });
  }

  // (5) 중형공연장(DAILY) — 중형 단독 또는 동시 대관일 때 아레나 계산과 별개로 합산한다
  // (동시 대관은 할인 없이 단순 합산, 기능정의 2-13 확정).
  let blockingIssues: string[] = [];
  if (
    selection.venueId === "medium-hall" ||
    selection.bookingMode === "SIMULTANEOUS"
  ) {
    const midHall = calculateMidHallLineItems(selection, rateTable);
    items.push(
      ...midHall.items.map((item) => ({
        ...item,
        venue: "medium-hall" as const,
      })),
    );
    blockingIssues = midHall.blockingIssues;
  }

  // (6) 경합 시 추가 대관료 옵션(선택) — 신청자가 제시한 최대값을 "추가 예상 금액"에
  // 반영한다(2026-08-26, "이 추가 대관료 가능 금액도 대관 신청 마지막 단계 계산서에
  // 반영되어야지.. 우측 플로팅 박스에도 추가 예상 금액에 포함시켜야 하고"). 공간을
  // 분리하지 않은 경우(공통 탭)는 아레나·중형 어느 한쪽에만 반영해 이중 계상을 막는다 —
  // 아레나가 있으면 아레나 몫으로, 아레나 없이 중형만 있으면 중형 몫으로 본다.
  function pushCompetitionFeeLine(
    amount: number | undefined,
    venue: "arena" | "medium-hall",
  ) {
    if (typeof amount !== "number" || amount <= 0) return;
    const addonId =
      venue === "medium-hall"
        ? "midhall_competition_fee_option"
        : "competition_fee_option";
    items.push({
      ...makeLine(
        addonId,
        "경합 시 추가 대관료 옵션(최대)",
        "FIXED_PER_WEEK",
        1,
        0,
        1,
        amount,
        amount,
        "VISIBLE",
      ),
      venue,
    });
  }
  if (pkg) {
    pushCompetitionFeeLine(
      selection.performanceInfo.competitionFeeOptionMax,
      "arena",
    );
  }
  if (
    selection.venueId === "medium-hall" ||
    selection.bookingMode === "SIMULTANEOUS"
  ) {
    if (selection.midHallPerformanceInfo) {
      pushCompetitionFeeLine(
        selection.midHallPerformanceInfo.competitionFeeOptionMax,
        "medium-hall",
      );
    } else if (!pkg) {
      pushCompetitionFeeLine(
        selection.performanceInfo.competitionFeeOptionMax,
        "medium-hall",
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
    blockingIssues,
    status: "ESTIMATE",
  };
}
