import { MEDIA_TIER_LABEL, WEEKDAYS } from "./types";
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

// [폐기 2026-08-14, 기능정의서 2-38/부록A] "기본 대관료 × 60% ÷ 6" 임시 규칙 — 확정 단가
// (pkg.setupExtraDayFee / pkg.performanceExtraDayFee)로 대체됐다. 중형공연장(medium-hall)
// 플레이스홀더 패키지가 아직 이 비율을 참조하므로 함수 자체는 남겨둔다.
export function extraWeekPrice(rateTable: RateTable, pkg: RentalPackage): number {
  return Math.round(pkg.baseFeePerWeek * rateTable.extraWeekRatio);
}

export function extraDayPrice(rateTable: RateTable, pkg: RentalPackage): number {
  return Math.round(extraWeekPrice(rateTable, pkg) / 6);
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

// [공유 2026-08-20] "패키지 기본 포함 구성" 타일 목록 — 구성·옵션(STEP2) 패키지 슬롯 요약과
// 예상 대관료(STEP4-1) 상세 내역에서 동일하게 재사용한다. 두 화면에서 서로 다른 산정표가
// 나오지 않도록 이 한 곳에서만 정의한다.
export type BaseCompositionGroup = "일정" | "공간" | "인프라";

export interface BaseCompositionTile {
  group: BaseCompositionGroup;
  label: string;
  value: string;
}

export const BASE_COMPOSITION_GROUP_ORDER: BaseCompositionGroup[] = ["일정", "공간", "인프라"];

const TRUSS_ADDON_IDS = ["mother_truss_a", "mother_truss_b", "mother_truss_c", "mother_truss_l", "mother_truss_r"];

// addon.category → 기본구성 그리드 그룹. SPACE는 공간, PRODUCTION·PREMIUM은 인프라(무대·조명·
// 음향 등 설비류)로 묶는다 — 일정(준비/공연)은 addon이 아니라 합성 항목이라 별도 처리한다.
function baseCompositionGroupOf(category: AddonItem["category"]): BaseCompositionGroup {
  return category === "SPACE" ? "공간" : "인프라";
}

function unitSuffix(unitLabel: string): string {
  if (unitLabel.includes("일")) return "일";
  if (unitLabel.includes("대")) return "대";
  if (unitLabel.includes("실")) return "실";
  return "";
}

// 중형공연장 패키지에서 재사용하는 addon 중 일부는 아레나와 quantity의 의미가 다르다 —
// 아레나는 waiting_room/intercom_wireless를 일 단위 과금 addon(원/일)으로 써서 quantity가
// "포함 일수"를 뜻하지만, 중형 패키지는 같은 addon을 "대기실 몇 실 · 인터컴 몇 대"라는
// 개수 의미로 재사용한다(waitingRoomNote="지상 2실"과 일치). unitLabel만 보고는 구분이
// 안 되므로 중형 패키지에 한해 addonId로 단위를 오버라이드한다.
const MID_HALL_COUNT_UNIT_OVERRIDES: Record<string, string> = {
  waiting_room: "실",
  intercom_wireless: "대",
  intercom_wired: "대",
};

// [화면 뼈대 2026-08-19, 패키지 구성 산정표] "기본 구성" 그리드는 pkg.includedItems를 그대로
// 데이터 기반으로 나열하고(addonId → 요금표에서 이름·단위 조회), 일정 · 공간 · 인프라 3개
// 그룹으로 묶어 보여준다 — 관리자가 "패키지 관리"에서 항목을 추가·삭제·수정하면 이 그리드에도
// 그대로 반영된다. 트러스 5종(A+B+C+L+R)만 산정표처럼 "트러스(센터)" 한 줄로 합쳐 보여준다
// (선택 옵션에서는 5종 그대로 개별 addon으로 남는다 — 여기는 표시 전용 큐레이션일 뿐 요금
// 데이터 모델은 바꾸지 않는다). 준비/공연 일수는 대응하는 addon이 없어 dayBreakdown 문자열
// 에서 그대로 읽는다 — 다만 중형공연장은 패키지 고정 일수가 아니라 캘린더에서 자유롭게
// 고른 일수(최소 대관일수 제한 없음)라 dayBreakdown 기반 준비/공연 타일은 의미가 없으므로
// includeSchedule=false 로 꺼서 공간·인프라 기본 구성만 보여준다.
export function baseCompositionTiles(
  pkg: RentalPackage,
  rateTable: RateTable,
  options: { includeSchedule?: boolean } = {},
): BaseCompositionTile[] {
  const { includeSchedule = true } = options;
  const tiles: BaseCompositionTile[] = [];

  if (includeSchedule) {
    const match = pkg.dayBreakdown.match(/준비\s*(\d+)일.*공연\s*(\d+)일/);
    const setupDays = match ? Number(match[1]) : 4;
    const performanceDays = match ? Number(match[2]) : 2;
    tiles.push({ group: "일정", label: "준비", value: `${setupDays}일` });
    tiles.push({ group: "일정", label: "공연", value: `${performanceDays}일` });
  }

  let trussDays = 0;
  for (const item of pkg.includedItems) {
    if (TRUSS_ADDON_IDS.includes(item.addonId)) {
      trussDays = Math.max(trussDays, item.quantity);
      continue;
    }
    const addon = rateTable.addons.find((a) => a.id === item.addonId);
    if (!addon) continue;
    const suffix =
      pkg.venueId === "medium-hall" && MID_HALL_COUNT_UNIT_OVERRIDES[item.addonId]
        ? MID_HALL_COUNT_UNIT_OVERRIDES[item.addonId]
        : unitSuffix(addon.unitLabel);
    tiles.push({
      group: baseCompositionGroupOf(addon.category),
      label: addon.name,
      value: `${item.quantity.toLocaleString()}${suffix}`,
    });
  }
  if (trussDays > 0) tiles.push({ group: "인프라", label: "트러스(센터)", value: `${trussDays}일` });

  return tiles;
}

// 아레나 전용 — 기본 구성 타일에 "홍보 디지털 매체" 등급(mediaTier)까지 더한 전체 목록.
export function arenaCompositionTiles(pkg: RentalPackage, rateTable: RateTable): BaseCompositionTile[] {
  return [
    ...baseCompositionTiles(pkg, rateTable),
    {
      group: "인프라",
      label: "홍보 디지털 매체",
      value: pkg.mediaTier ? MEDIA_TIER_LABEL[pkg.mediaTier] : "미포함",
    },
  ];
}

// 패키지 슬롯 하단 한 줄 요약(2026-08-20, 구성·옵션 화면 개정)에서 쓰는 텍스트 변환.
export function baseCompositionSummaryLine(tiles: BaseCompositionTile[]): string {
  return tiles.map((t) => `${t.label} ${t.value}`).join(" · ");
}
