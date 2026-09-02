import { WEEKDAYS } from "./types";
import type { AddonItem, DayTag, QuoteSelection, RateTable, RentalPackage, WeekDay } from "./types";

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

/**
 * 이 항목을 최대 몇까지 신청할 수 있는가 (2026-09-02).
 *
 * 운영자가 요금표 관리에서 정한 `availability.maxAddQuantity` 는 **기본 포함 위에 더
 * 얹을 수 있는 양**이다. 신청 화면이 다루는 값은 총 수량이므로 기본 포함을 더해 준다.
 * 상한을 두지 않았으면 undefined(무제한).
 */
export function maxRequestableQuantity(
  addonItem: AddonItem,
  pkg: RentalPackage | undefined,
): number | undefined {
  const max = addonItem.availability.maxAddQuantity;
  if (max === undefined || max === "UNLIMITED") return undefined;
  return includedQuantity(pkg, addonItem.id) + max;
}

/**
 * 신청 수량을 상한 안으로 자른다.
 *
 * 화면(number 입력)의 max 속성은 **타이핑을 막지 못한다** — 6 을 그대로 칠 수 있고
 * 그 값이 그대로 제출됐다. 그래서 화면과 금액 계산 양쪽에서 같은 함수로 자른다.
 * 계산 쪽이 최종 방어선이다(폼을 우회한 요청도 상한을 넘지 못한다).
 */
export function clampAddonQuantity(
  addonItem: AddonItem,
  pkg: RentalPackage | undefined,
  requested: number,
): number {
  const safe = Math.max(0, Math.floor(requested) || 0);
  const max = maxRequestableQuantity(addonItem, pkg);
  return max === undefined ? safe : Math.min(safe, max);
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

// 화~일 6일 중 해당 요일이 패키지 기본값상 "공연일"인지 — WEEKDAYS 배열의 뒤쪽
// defaultPerformanceDays개가 공연일이다(defaultDayTags와 동일 규칙, 요일 단위 버전).
// 요일 제외(2-37)는 그 요일의 실제 날짜 자체가 선택안에서 사라지므로 dayTags 재지정이
// 불가능하다 — 그래서 날짜가 아닌 "요일"의 패키지 기본값으로 셋업/공연 단가를 가른다.
export function isDefaultPerformanceWeekday(day: WeekDay, defaultPerformanceDays: number): boolean {
  const index = WEEKDAYS.indexOf(day);
  return index >= WEEKDAYS.length - defaultPerformanceDays;
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

