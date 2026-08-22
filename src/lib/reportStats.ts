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
): ReportStats {
  const thisMonthKey = monthKey(now.toISOString());

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
