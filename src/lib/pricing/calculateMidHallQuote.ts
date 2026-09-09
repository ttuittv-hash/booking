import { isWeekendDate } from "./dateRange";
import { makeLine } from "./lineItem";
import { clampAddonQuantity, findAddon } from "./rateTableUtils";
import type { LineItem, QuoteSelection, RateTable } from "./types";

export interface MidHallCalcResult {
  items: LineItem[];
  blockingIssues: string[];
}

function formatDateLabel(iso: string): string {
  const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

// 순수 함수: 중형공연장(DAILY) 선택 상태 + 요금표 → 라인아이템.
// 셋업/공연(평일·주말)/시간 단위 연장/청소비를 계산한다. 1일 3회 이상 공연은 자동 계산하지
// 않고 blockingIssues로 신청서 제출을 막는다(운영자 확인 필요, 사용자 확정 2026-08-19).
export function calculateMidHallLineItems(selection: QuoteSelection, rateTable: RateTable): MidHallCalcResult {
  const cfg = rateTable.midHall;
  const items: LineItem[] = [];
  const blockingIssues: string[] = [];
  const entries = Object.entries(selection.midHallDays);
  if (entries.length === 0) return { items, blockingIssues };

  // 준비(셋업 Load-In)
  const setupCount = entries.filter(([, d]) => d.role === "SETUP").length;
  if (setupCount > 0) {
    items.push(
      makeLine(
        "midhall_setup",
        `준비 ${setupCount}일`,
        "PER_DAY",
        setupCount,
        0,
        setupCount,
        cfg.setupDayFee,
        setupCount * cfg.setupDayFee,
        "VISIBLE",
      ),
    );
  }

  // 철수(일) — 아레나(DayTag LOAD_OUT)와 동일하게 가격 반영 방식이 아직 미정이라 당분간
  // 셋업과 동일 단가로 취급한다(상태 구분 자체는 화면에 노출).
  const loadOutDayCount = entries.filter(([, d]) => d.role === "LOAD_OUT").length;
  if (loadOutDayCount > 0) {
    items.push(
      makeLine(
        "midhall_loadout_day",
        `철수 ${loadOutDayCount}일`,
        "PER_DAY",
        loadOutDayCount,
        0,
        loadOutDayCount,
        cfg.setupDayFee,
        loadOutDayCount * cfg.setupDayFee,
        "VISIBLE",
      ),
    );
  }

  // 공연일 — 평일/주말 × 1회/2회 조합별로 묶어서 과금한다.
  // [수정 2026-09-08] "셋업 Load-In -> 준비 N일 / 철수 -> 철수 N일 / 공연 Show — 평일
  // -> 공연일 N일, 1일 2회 공연 할증 표기가 눈에 안 띈다" — 라벨을 우측 실시간 패널의
  // 다른 항목들(준비 N일, 철수 N일)과 같은 "이름 N일" 틀로 맞추고, 1일 2회 할증은
  // 괄호로 뚜렷하게 붙인다. 단가(unitPrice) 계산은 그대로 cfg.secondShowSurchargeRatio.
  const secondShowSurchargePercent = Math.round(cfg.secondShowSurchargeRatio * 100);
  const bucketCounts = new Map<string, number>(); // "weekday-1" | "weekday-2" | "weekend-1" | "weekend-2"
  let totalShows = 0;
  for (const [iso, d] of entries) {
    if (d.role !== "PERFORMANCE") continue;
    totalShows += d.shows;
    if (d.shows >= 3) {
      blockingIssues.push(
        `${formatDateLabel(iso)} 공연일이 1일 ${d.shows}회로 지정되어 있습니다 — 3회 이상은 운영자 확인이 필요합니다.`,
      );
      items.push(
        makeLine(
          `midhall_show_review_${iso}`,
          `공연일 ${formatDateLabel(iso)} (1일 ${d.shows}회, 운영자 확인 필요)`,
          "PER_DAY",
          1,
          0,
          1,
          0,
          0,
          "VISIBLE",
        ),
      );
      continue;
    }
    const weekend = isWeekendDate(iso);
    const shows = d.shows >= 2 ? 2 : 1;
    const key = `${weekend ? "weekend" : "weekday"}-${shows}`;
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of bucketCounts) {
    const [period, showsStr] = key.split("-");
    const isWeekend = period === "weekend";
    const isDouble = showsStr === "2";
    const baseFee = isWeekend ? cfg.performanceWeekendFee : cfg.performanceWeekdayFee;
    const unitPrice = isDouble ? Math.round(baseFee * (1 + cfg.secondShowSurchargeRatio)) : baseFee;
    const noteParts: string[] = [];
    if (isWeekend) noteParts.push("주말");
    if (isDouble) noteParts.push(`1일 2회 공연 할증 ${secondShowSurchargePercent}%`);
    const label = `공연일 ${count}일${noteParts.length > 0 ? ` (${noteParts.join(", ")})` : ""}`;
    items.push(
      makeLine(`midhall_show_${key}`, label, "PER_DAY", count, 0, count, unitPrice, count * unitPrice, "VISIBLE"),
    );
  }

  // 시간 단위 추가 — 셋업 연장(22:00~24:00) · 철수 Load-Out
  if (selection.midHallExtraSetupHours > 0) {
    items.push(
      makeLine(
        "midhall_extra_setup_hours",
        "셋업 연장 (22:00~24:00)",
        "PER_HOUR",
        selection.midHallExtraSetupHours,
        0,
        selection.midHallExtraSetupHours,
        cfg.extraHourFee,
        selection.midHallExtraSetupHours * cfg.extraHourFee,
        "VISIBLE",
      ),
    );
  }
  if (selection.midHallExtraLoadOutHours > 0) {
    items.push(
      makeLine(
        "midhall_extra_loadout_hours",
        "철수 Load-Out",
        "PER_HOUR",
        selection.midHallExtraLoadOutHours,
        0,
        selection.midHallExtraLoadOutHours,
        cfg.extraHourFee,
        selection.midHallExtraLoadOutHours * cfg.extraHourFee,
        "VISIBLE",
      ),
    );
  }

  // 청소비 — 1회당 예상 관객 수 × 총 공연 횟수(회차 합, 확인대기 회차 포함).
  // 단가가 0이면(기본 클리닝이 대관료에 포함된 요금표) 0원 줄을 만들지 않는다.
  if (cfg.cleaningUnitPrice > 0 && totalShows > 0 && selection.secondaryAudience > 0) {
    const qty = selection.secondaryAudience * totalShows;
    items.push(
      makeLine("midhall_cleaning", "청소비", "PER_PERSON", qty, 0, qty, cfg.cleaningUnitPrice, qty * cfg.cleaningUnitPrice, "VISIBLE"),
    );
  }

  // [신규 2026-09-08] 중형공연장 선택 옵션 — "아레나 추가 옵션과 동일한 방식으로"(nora).
  // 어드민 패키지 관리 중형 탭에서 만든 venueId "medium-hall" 항목을 신청자가 수량으로
  // 고르면 단가 × 수량으로 여기에 합산한다(아레나 calculateQuote 의 (4) 블록과 같은 규칙,
  // 패키지 기본 포함 수량은 없다). 상한(maxAddQuantity)은 계산 쪽에서 최종으로 자른다.
  for (const selected of selection.addons) {
    const addon = findAddon(rateTable, selected.addonId);
    if (!addon || addon.venueId !== "medium-hall") continue;
    if (addon.billingPhase === "SETTLEMENT" || addon.visibility === "HIDDEN") continue;
    const requested = clampAddonQuantity(addon, undefined, selected.requestedQuantity);
    if (requested <= 0) continue;
    const amount =
      addon.pricingType === "REVENUE_PERCENT"
        ? Math.round(((selection.expectedRevenue ?? 0) * addon.unitPrice) / 100)
        : requested * addon.unitPrice;
    items.push(
      makeLine(addon.id, addon.name, addon.pricingType, requested, 0, requested, addon.unitPrice, amount, addon.visibility),
    );
  }

  return { items, blockingIssues };
}
