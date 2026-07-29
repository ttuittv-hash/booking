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

export function recommendPackage(rateTable: RateTable, expectedAudience: number): number | null {
  const match = rateTable.packages.find(
    (p) => expectedAudience >= p.audienceTier.min && expectedAudience <= p.audienceTier.max,
  );
  return match ? match.id : null;
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
