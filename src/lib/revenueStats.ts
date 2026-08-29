import type { Quote } from "./pricing/types";
import { quoteMatchesVenue, type ReportVenueTab } from "./reportStats";

/*
  리포트 "매출" 탭 집계 (2026-08-29).

  금액이 세 단계를 지난다 — 셋을 한 숫자로 뭉치면 안 된다.

    접수   신청서를 낸 시점의 견적 금액(quote.total). 아직 아무것도 확정되지 않았다.
    계약   심사를 지나 계약금액이 확정된 금액(contract.contractTotal).
           부속합의(ContractAddendum)는 contractTotal 을 건드리지 않고 쌓이므로
           여기서 더해 준다 — 화면 표시 규칙과 같다.
    확정   정산까지 끝난 최종 금액(settlement.finalTotal). 현장 추가·미사용 차감·
           유틸리티 실사용이 반영된, 실제로 받을 금액이다.

  "총 확정 매출"은 셋째 단계만 센다. 계약만 되고 정산 전인 건은 금액이 아직 움직일 수
  있으므로 확정 매출에 넣지 않고 '정산 예정'으로 따로 보여 준다.
*/

export interface RevenueMonthlyBucket {
  key: string; // "2026-08"
  label: string; // "2026.08"
  /** 그 달에 접수된 신청서 건수·견적 금액 */
  submittedCount: number;
  submittedTotal: number;
  /** 그 달에 계약금액이 확정된 건수·금액 (contract.decidedAt 기준) */
  contractedCount: number;
  contractedTotal: number;
  /** 그 달에 정산이 확정된 건수·금액 (settlement.decidedAt 기준) */
  settledCount: number;
  settledTotal: number;
}

export interface RevenueStats {
  /** 접수 — 전체 신청서 */
  submittedCount: number;
  submittedTotal: number;
  /** 계약 — status 가 CONTRACTED 또는 SETTLED */
  contractedCount: number;
  contractedTotal: number;
  /** 확정 매출 — 정산까지 끝난 건(SETTLED)의 최종 정산금액 합 */
  settledCount: number;
  settledTotal: number;
  /** 계약됐지만 아직 정산 전 — 금액이 더 움직일 수 있는 구간 */
  pendingSettlementCount: number;
  pendingSettlementTotal: number;
  /** 부속합의로 계약금액에 더해진 순증감. 계약금액이 원래 견적과 왜 다른지 설명한다. */
  addendumTotal: number;
  monthly: RevenueMonthlyBucket[];
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function buildEmptyBuckets(now: Date, monthsBack: number): RevenueMonthlyBucket[] {
  const buckets: RevenueMonthlyBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: key.replace("-", "."),
      submittedCount: 0,
      submittedTotal: 0,
      contractedCount: 0,
      contractedTotal: 0,
      settledCount: 0,
      settledTotal: 0,
    });
  }
  return buckets;
}

export function buildRevenueStats(
  quotes: Quote[],
  /** 신청서별 부속합의 금액 합 — 없으면 0으로 본다. */
  addendumByQuote: Map<string, number>,
  now: Date,
  monthsBack = 6,
  venueTab: ReportVenueTab = "all",
): RevenueStats {
  // 공간 탭은 신청서에 걸린 지표라 여기에도 그대로 적용한다.
  const rows = quotes.filter((quote) => quoteMatchesVenue(quote, venueTab));

  const monthly = buildEmptyBuckets(now, monthsBack);
  const byKey = new Map(monthly.map((b) => [b.key, b]));

  const stats: RevenueStats = {
    submittedCount: 0,
    submittedTotal: 0,
    contractedCount: 0,
    contractedTotal: 0,
    settledCount: 0,
    settledTotal: 0,
    pendingSettlementCount: 0,
    pendingSettlementTotal: 0,
    addendumTotal: 0,
    monthly,
  };

  for (const quote of rows) {
    stats.submittedCount++;
    stats.submittedTotal += quote.total;

    const submitted = byKey.get(monthKey(quote.createdAt));
    if (submitted) {
      submitted.submittedCount++;
      submitted.submittedTotal += quote.total;
    }

    const isContracted = quote.status === "CONTRACTED" || quote.status === "SETTLED";
    if (!isContracted) continue;

    // 계약금액이 아직 없으면 견적 금액을 쓴다 — 계약 상태인데 금액이 0으로 보이면 안 된다.
    const addendum = addendumByQuote.get(quote.id) ?? 0;
    const contractTotal = (quote.contract?.contractTotal ?? quote.total) + addendum;
    stats.contractedCount++;
    stats.contractedTotal += contractTotal;
    stats.addendumTotal += addendum;

    // 계약금액이 확정된 달에 잡는다. 확정 시점 기록이 없으면(견적 금액을 쓴 경우)
    // 접수월로 대신한다 — 어느 달에도 안 잡혀 월별 합이 총계와 어긋나는 것보다 낫다.
    const contractedAt = quote.contract?.decidedAt ?? quote.createdAt;
    const contractedBucket = byKey.get(monthKey(contractedAt));
    if (contractedBucket) {
      contractedBucket.contractedCount++;
      contractedBucket.contractedTotal += contractTotal;
    }

    if (quote.status === "SETTLED" && quote.settlement) {
      stats.settledCount++;
      stats.settledTotal += quote.settlement.finalTotal;
      const settledBucket = byKey.get(monthKey(quote.settlement.decidedAt));
      if (settledBucket) {
        settledBucket.settledCount++;
        settledBucket.settledTotal += quote.settlement.finalTotal;
      }
    } else {
      // SETTLED 인데 settlement 이 없는 건도 여기로 온다 — 정산 기록이 없으면 확정
      // 금액을 알 수 없으므로 확정 매출이 아니라 '정산 예정'으로 센다.
      stats.pendingSettlementCount++;
      stats.pendingSettlementTotal += contractTotal;
    }
  }

  return stats;
}
