import type { Company, Quote, ReviewDecision } from "./pricing/types";

// 어드민 "리포트" 화면(2026-08-22 신설)이 쓰는 집계 로직 — DB에서 받은 Quote/Company
// 목록을 순수 함수로 집계만 한다. 신청 건수 규모가 대관 시스템 특성상 크지 않아
// SQL 집계 대신 애플리케이션 레벨에서 계산한다.

export interface MonthlyBucket {
  key: string; // "2026-08"
  label: string; // "2026.08"
  count: number;
  total: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  total: number;
}

export interface ReportStats {
  totalQuotes: number;
  newThisMonth: number;
  pendingReview: number; // review === null
  reviewBreakdown: BreakdownRow[]; // APPROVED / HOLD / REJECTED
  contractedCount: number; // status가 CONTRACTED 또는 SETTLED
  contractedTotal: number; // 위 건들의 계약금액(contract.contractTotal, 없으면 total) 합
  settledCount: number;
  venueBreakdown: BreakdownRow[];
  monthly: MonthlyBucket[];
  companyBreakdown: BreakdownRow[]; // PENDING / APPROVED / REJECTED / SUSPENDED
}

const REVIEW_DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "승인",
  HOLD: "보류",
  REJECTED: "거절",
};

const COMPANY_STATUS_LABEL: Record<Company["status"], string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "거절",
  SUSPENDED: "정지",
};

/**
 * 리포트의 공간 탭(2026-08-27). "전체" 외에는 VENUES 의 공간 하나로 좁혀서 본다.
 *
 * 동시 대관(아레나+중형) 건은 **양쪽 탭에 모두** 잡힌다 — 한쪽에서만 세면 두 탭의 합이
 * 전체와 어긋나고, 어느 쪽에서 봐도 "그 공간에 걸린 신청"이 빠져 보인다. 그래서 탭별
 * 건수의 합은 전체보다 클 수 있다.
 */
export type ReportVenueTab = "all" | string; // "all" | Venue["id"]

export function quoteMatchesVenue(quote: Quote, tab: ReportVenueTab): boolean {
  if (tab === "all") return true;
  if (quote.selection.bookingMode === "SIMULTANEOUS") {
    return tab === "arena" || tab === "medium-hall";
  }
  return (quote.selection.venueId ?? "arena") === tab;
}

function venueLabel(quote: Quote): string {
  if (quote.selection.bookingMode === "SIMULTANEOUS") return "동시 대관(아레나+중형)";
  if (quote.selection.venueId === "medium-hall") return "중형공연장";
  return "아레나";
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-08"
}

/** 최근 monthsBack개월(이번 달 포함) 순서로 빈 버킷을 만든다. */
function buildEmptyMonthlyBuckets(now: Date, monthsBack: number): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: key.replace("-", "."), count: 0, total: 0 });
  }
  return buckets;
}

export function buildReportStats(
  quotes: Quote[],
  companies: Company[],
  now: Date,
  monthsBack = 6,
  venueTab: ReportVenueTab = "all",
): ReportStats {
  const thisMonthKey = monthKey(now.toISOString());
  // 공간 탭은 신청서에 걸린 지표에만 적용된다. 법인회원 승인 현황(companies)은 공간과
  // 무관하므로 아래에서 원본 목록을 그대로 쓴다.
  quotes = quotes.filter((quote) => quoteMatchesVenue(quote, venueTab));

  const reviewCounts = new Map<string, number>();
  const venueCounts = new Map<string, BreakdownRow>();
  const monthlyBuckets = buildEmptyMonthlyBuckets(now, monthsBack);
  const monthlyByKey = new Map(monthlyBuckets.map((b) => [b.key, b]));

  let pendingReview = 0;
  let newThisMonth = 0;
  let contractedCount = 0;
  let contractedTotal = 0;
  let settledCount = 0;

  for (const quote of quotes) {
    if (monthKey(quote.createdAt) === thisMonthKey) newThisMonth++;

    if (quote.review === null) {
      pendingReview++;
    } else {
      reviewCounts.set(quote.review.decision, (reviewCounts.get(quote.review.decision) ?? 0) + 1);
    }

    const vLabel = venueLabel(quote);
    const vRow = venueCounts.get(vLabel) ?? { key: vLabel, label: vLabel, count: 0, total: 0 };
    vRow.count++;
    vRow.total += quote.total;
    venueCounts.set(vLabel, vRow);

    const bucket = monthlyByKey.get(monthKey(quote.createdAt));
    if (bucket) {
      bucket.count++;
      bucket.total += quote.total;
    }

    if (quote.status === "CONTRACTED" || quote.status === "SETTLED") {
      contractedCount++;
      contractedTotal += quote.contract?.contractTotal ?? quote.total;
    }
    if (quote.status === "SETTLED") settledCount++;
  }

  const reviewBreakdown: BreakdownRow[] = (["APPROVED", "HOLD", "REJECTED"] as ReviewDecision[]).map(
    (decision) => ({
      key: decision,
      label: REVIEW_DECISION_LABEL[decision],
      count: reviewCounts.get(decision) ?? 0,
      total: 0,
    }),
  );

  const companyCounts = new Map<string, number>();
  for (const company of companies) {
    companyCounts.set(company.status, (companyCounts.get(company.status) ?? 0) + 1);
  }
  const companyBreakdown: BreakdownRow[] = (
    ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as Company["status"][]
  ).map((status) => ({
    key: status,
    label: COMPANY_STATUS_LABEL[status],
    count: companyCounts.get(status) ?? 0,
    total: 0,
  }));

  return {
    totalQuotes: quotes.length,
    newThisMonth,
    pendingReview,
    reviewBreakdown,
    contractedCount,
    contractedTotal,
    settledCount,
    venueBreakdown: [...venueCounts.values()].sort((a, b) => b.count - a.count),
    monthly: monthlyBuckets,
    companyBreakdown,
  };
}
