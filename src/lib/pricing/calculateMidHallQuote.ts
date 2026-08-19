import { isWeekendDate } from "./dateRange";
import { makeLine } from "./lineItem";
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

  // 셋업 Load-In
  const setupCount = entries.filter(([, d]) => d.role === "SETUP").length;
  if (setupCount > 0) {
    items.push(
      makeLine(
        "midhall_setup",
        "셋업 Load-In",
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
        "철수",
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

  // 공연 Show — 평일/주말 × 1회/2회 조합별로 묶어서 과금한다.
  const bucketCounts = new Map<string, number>(); // "weekday-1" | "weekday-2" | "weekend-1" | "weekend-2"
  const bucketLabel: Record<string, string> = {
    "weekday-1": "공연 Show — 평일",
    "weekday-2": "공연 Show — 평일 (1일 2회, 50% 할증 포함)",
    "weekend-1": "공연 Show — 주말",
    "weekend-2": "공연 Show — 주말 (1일 2회, 50% 할증 포함)",
  };
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
          `공연 Show — ${formatDateLabel(iso)} (1일 ${d.shows}회, 운영자 확인 필요)`,
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
    const baseFee = period === "weekend" ? cfg.performanceWeekendFee : cfg.performanceWeekdayFee;
    const unitPrice = showsStr === "2" ? Math.round(baseFee * (1 + cfg.secondShowSurchargeRatio)) : baseFee;
    items.push(
      makeLine(`midhall_show_${key}`, bucketLabel[key], "PER_DAY", count, 0, count, unitPrice, count * unitPrice, "VISIBLE"),
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

  // 청소비 — 1회당 예상 관객 수 × 총 공연 횟수(회차 합, 확인대기 회차 포함)
  if (totalShows > 0 && selection.secondaryAudience > 0) {
    const qty = selection.secondaryAudience * totalShows;
    items.push(
      makeLine("midhall_cleaning", "청소비", "PER_PERSON", qty, 0, qty, cfg.cleaningUnitPrice, qty * cfg.cleaningUnitPrice, "VISIBLE"),
    );
  }

  return { items, blockingIssues };
}
