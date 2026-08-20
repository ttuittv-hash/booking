"use client";

import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { ComparisonTable, Note, type CompareGroup, type CompareRow } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";
import type { EstimatedQuote, LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

function itemRow(item: LineItem, expectedRevenue: number): CompareRow {
  const isRevenuePercent = item.pricingType === "REVENUE_PERCENT";
  return {
    label: item.label,
    cells: [
      isRevenuePercent ? `${won(expectedRevenue)} × ${item.unitPrice}%` : item.requested.toLocaleString(),
      item.included ? item.included.toLocaleString() : "—",
      isRevenuePercent ? "—" : item.billable.toLocaleString(),
      isRevenuePercent ? "—" : won(item.unitPrice),
      won(item.amount),
    ],
  };
}

/** 묶음 끝의 소계 행 — 금액 열에만 값을 둔다 */
function subtotalRow(label: string, amount: number): CompareRow {
  return {
    label: <span className="font-bold">{label}</span>,
    cells: ["", "", "", "", <span key="v" className="font-bold">{won(amount)}</span>],
  };
}

export function Step5Estimate({
  rateTable,
  quote,
  selection,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
}) {
  const pkg = findPackage(rateTable, selection.packageId);
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

  if (!pkg && !hasMidHall) {
    return (
      <section>
        <StepHeading
          title={<>예상 대관료 · 산출내역서</>}
          lead={<>먼저 1단계에서 패키지를 선택하거나 중형공연장 일정을 선택하세요.</>}
        />
      </section>
    );
  }

  const arenaLine = pkg
    ? `${pkg.audienceTier.label} · ${selection.week.year}.${selection.week.month} ${selection.week.weekOfMonth}주차 · 총 ${totalRentalDays(selection)}일 · 관객 ${selection.expectedAudience.toLocaleString()}명`
    : null;
  const midHallLine = midHallSummaryLine(selection);

  const visibleItems = quote.lineItems.filter((item) => item.visibility !== "HIDDEN");
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);
  const arenaVisibleSubtotal = arenaItems.reduce((sum, item) => sum + item.amount, 0);
  const midHallVisibleSubtotal = midHallItems.reduce((sum, item) => sum + item.amount, 0);
  const revenue = selection.expectedRevenue ?? 0;

  // 카테고리로 묶을 때 표를 쪼개면 묶음마다 열 폭이 달라진다 — ComparisonTable 의 groups 로
  // 단일 표 안에서 아레나/중형을 나누고, 각 묶음 끝에 소계 행을 둔다.
  const groups: CompareGroup[] | undefined = isSimultaneous
    ? [
        {
          title: "아레나",
          rows: [
            ...arenaItems.map((item) => itemRow(item, revenue)),
            subtotalRow("아레나 소계", arenaVisibleSubtotal),
          ],
        },
        {
          title: "중형공연장",
          rows: [
            ...midHallItems.map((item) => itemRow(item, revenue)),
            subtotalRow("중형공연장 소계", midHallVisibleSubtotal),
          ],
        },
      ]
    : undefined;

  return (
    <section>
      <StepHeading
        title={<>예상 대관료</>}
        lead={
          isSimultaneous ? (
            <>
              아레나 — {arenaLine}
              <br />
              중형공연장 — {midHallLine}
            </>
          ) : (
            (arenaLine ?? midHallLine)
          )
        }
      />

      {/*
        Bowl 사용료·유틸리티(HIDDEN)는 아래 합계 계산에는 포함되지만 신청자 화면에는
        항목·금액을 노출하지 않는다 — 그래서 아레나/중형 소계를 각각 더해도 맨 아래
        최종 소계(quote.subtotal, 전체 lineItems 기준)와는 차이가 날 수 있다.
      */}
      <div className="mt-10">
        <ComparisonTable
          dense
          rowLabel="항목"
          columns={[
            { key: "requested", title: "신청" },
            { key: "included", title: "기본포함" },
            { key: "billable", title: "과금수량" },
            { key: "unitPrice", title: "단가" },
            { key: "amount", title: "금액" },
          ]}
          groups={groups}
          rows={groups ? undefined : visibleItems.map((item) => itemRow(item, revenue))}
        />
      </div>

      <div className="mt-8 ml-auto w-full max-w-sm">
        {isSimultaneous && (
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border/25 py-2.5">
            <span className="text-s text-muted">아레나 소계 + 중형공연장 소계</span>
            <span className="text-s tabular-nums text-muted">
              {won(arenaVisibleSubtotal)} + {won(midHallVisibleSubtotal)}
            </span>
          </div>
        )}
        <dl className="border-t border-border/25">
          <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5">
            <dt className="text-s text-muted">소계 (VAT 별도)</dt>
            <dd className="text-s tabular-nums text-muted">{won(quote.subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5">
            <dt className="text-s text-muted">부가세 10%</dt>
            <dd className="text-s tabular-nums text-muted">{won(quote.vat)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-foreground py-3">
          <span className="text-s text-muted">합계</span>
          <span className="type-display text-h5-m tabular-nums sm:text-h5">{won(quote.total)}</span>
        </div>
      </div>

      <Note className="mt-8">
        {quote.meteredNotice} 본 금액은 <b className="text-foreground">예상</b>이며 확정 금액이 아닙니다.
      </Note>

      {isSimultaneous && (
        <Note className="mt-4">
          위 금액은 <b className="text-foreground">아레나 + 중형공연장 합산</b>입니다 (할인 없이 두
          소계를 단순 합산).
        </Note>
      )}

      {quote.blockingIssues.length > 0 && (
        <div className="mt-8 border-t-2 border-foreground pt-5">
          <p className="text-s font-bold">운영자 확인이 필요해 아직 신청서를 제출할 수 없습니다.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-s text-muted">
            {quote.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
