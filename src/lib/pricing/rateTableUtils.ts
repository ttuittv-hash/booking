import type { AddonItem, DayTag, QuoteSelection, RateTable, RentalPackage } from "./types";

export function findPackage(
  rateTable: RateTable,
  id: number | null | undefined,
): RentalPackage | undefined {
  return rateTable.packages.find((p) => p.id === id);
}

export function findAddon(rateTable: RateTable, id: string): AddonItem | undefined {
  return rateTable.addons.find((a) => a.id === id);
}

export function packagesForVenue(rateTable: RateTable, venueId: string): RentalPackage[] {
  return rateTable.packages.filter((p) => (p.venueId ?? "arena") === venueId);
}

export function recommendPackage(rateTable: RateTable, expectedAudience: number, venueId: string): number | null {
  const match = packagesForVenue(rateTable, venueId).find(
    (p) => expectedAudience >= p.audienceTier.min && expectedAudience <= p.audienceTier.max,
  );
  return match ? match.id : null;
}

// 패키지 가격 = 요금표에 등록된 표시 대관료 고정값 그 자체.
// [개정 2026-08-14, 기능정의서 2-20/2-42/부록A] 기존 "기본 대관료 + 기본 포함 항목 단가 합계"
// 역산 규칙은 폐기됐다 — 구성 항목(includedItems)은 신청자 화면에 항목·수량만 보여주는 용도
// (ITEM_ONLY, Ⓐ)이며 이 가격에 가산되지 않는다. 실제 산정표에서도 Ⓐ+Ⓑ 합계와 표시 대관료가
// 일치하지 않는다(패키지마다 수천만원 차이, 마진·반올림 성격은 미확인 — 부록B #21).
export function packagePrice(rateTable: RateTable, pkg: RentalPackage): number {
  return pkg.baseFeePerWeek;
}

export function includedQuantity(pkg: RentalPackage | undefined, addonId: string): number {
  const item = pkg?.includedItems.find((i) => i.addonId === addonId);
  return item ? item.quantity : 0;
}

// 패키지 선택에 따라 부대시설이 선택 가능한지 판단 (명세서 3.4)
export function isAddonAvailable(addonItem: AddonItem, pkg: RentalPackage | undefined): boolean {
  if (!pkg) return false;
  const { mode, packages } = addonItem.availability;
  if (mode === "ALWAYS") return true;
  if (mode === "IF_PACKAGE_IN") return !!packages?.includes(pkg.id);
  if (mode === "IF_NOT_INCLUDED") return includedQuantity(pkg, addonItem.id) === 0;
  return false;
}

export function extraWeekPrice(rateTable: RateTable, pkg: RentalPackage): number {
  return Math.round(pkg.baseFeePerWeek * rateTable.extraWeekRatio);
}

// 일요일 이후 연장하는 하루당 단가 = 초과 주차 단가 ÷ 6일(화~일)
export function extraDayPrice(rateTable: RateTable, pkg: RentalPackage): number {
  return Math.round(extraWeekPrice(rateTable, pkg) / 6);
}

// 신청 총 대관일수 = 기본 6일(화~일) − 제외 요일 수 + 추가 일수
export function totalRentalDays(selection: QuoteSelection): number {
  return 6 - selection.excludedDays.length + selection.extraDays;
}

// 준비일/공연일 기본값 — 패키지 기본 공연일수(dayBreakdown)만큼 날짜 뒤쪽(화요일에서 먼 날짜)을 공연일로 본다.
export function defaultDayTags(dates: string[], defaultPerformanceDays: number): Record<string, DayTag> {
  const performanceCount = Math.max(0, Math.min(defaultPerformanceDays, dates.length));
  const performanceSet = new Set(dates.slice(dates.length - performanceCount));
  const tags: Record<string, DayTag> = {};
  for (const date of dates) tags[date] = performanceSet.has(date) ? "PERFORMANCE" : "PREP";
  return tags;
}

// 날짜별 실제 적용 태그 — 사용자가 지정하지 않은 날짜는 패키지 기본값을 따른다.
export function effectiveDayTag(
  date: string,
  dayTags: Record<string, DayTag>,
  defaults: Record<string, DayTag>,
): DayTag {
  return dayTags?.[date] ?? defaults[date] ?? "PREP";
}

// 실제 공연일로 지정된 날짜 수 (기본값 미지정분은 패키지 기본값 적용)
export function countPerformanceDays(dates: string[], dayTags: Record<string, DayTag>, defaultPerformanceDays: number): number {
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  return dates.filter((date) => effectiveDayTag(date, dayTags, defaults) === "PERFORMANCE").length;
}
