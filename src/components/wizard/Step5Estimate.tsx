"use client";

import { num, won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { ComparisonTable, Note } from "@/components/ui/kit";
import { StepHeading } from "./StepHeading";

/** 매출 연동 항목은 수량이 아니라 예상매출 × 요율로 산정되므로 근거를 항목명에 붙인다. */
function lineLabel(item: LineItem, expectedRevenue: number): string {
  if (item.pricingType !== "REVENUE_PERCENT") return item.label;
  return `${item.label} · 예상매출 ${won(expectedRevenue)}`;
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

  if (!pkg) {
    return (
      <section>
        <StepHeading
        title={<>예상 대관료 · 산출내역서</>}
        lead={<>먼저 2단계에서 패키지를 선택하세요.</>}
      />
      </section>
    );
  }

  const expectedRevenue = selection.expectedRevenue ?? 0;

  return (
    <section>
      <StepHeading
        title={<>예상 대관료 · 산출내역서</>}
        lead={<>{pkg.name} · {selection.week.year}.{selection.week.month}{" "}
        {selection.week.weekOfMonth}주차 · 총 {totalRentalDays(selection)}일 · 관객{" "}
        {selection.expectedAudience.toLocaleString()}명</>}
      />

      {/*
        열은 3개로 고정한다. 신청·기본포함 수량은 열을 더 만들지 않고 항목 아래
        보조행(note)으로 내린다 — 좁은 컬럼에서 6열은 읽히지 않는다.
      */}
      <div className="mt-7">
        <ComparisonTable
          dense
          rowLabel="항목"
          columns={[
            { key: "billable", title: "과금" },
            { key: "unitPrice", title: "단가" },
            { key: "amount", title: "금액" },
          ]}
          rows={quote.lineItems.map((item) => {
            const byRevenue = item.pricingType === "REVENUE_PERCENT";
            return {
              label: lineLabel(item, expectedRevenue),
              note: byRevenue
                ? undefined
                : `신청 ${num(item.requested)} · 기본 포함 ${item.included ? num(item.included) : 0}`,
              cells: [
                byRevenue ? "—" : num(item.billable),
                byRevenue ? `${item.unitPrice}%` : won(item.unitPrice),
                won(item.amount),
              ],
            };
          })}
          footer={
            <dl className="ml-auto grid max-w-xs grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-8 gap-y-2.5">
              <dt className="text-s text-muted">소계 · VAT 별도</dt>
              <dd className="text-right text-s tabular-nums">{won(quote.subtotal)}</dd>
              <dt className="text-s text-muted">부가세 10%</dt>
              <dd className="text-right text-s tabular-nums text-muted">{won(quote.vat)}</dd>
              <dt className="border-t-2 border-foreground pt-3 text-s font-bold">
                합계 · VAT 포함
              </dt>
              <dd className="border-t-2 border-foreground pt-3 text-right text-h6-m font-bold tabular-nums sm:text-h6">
                {won(quote.total)}
              </dd>
            </dl>
          }
        />
      </div>

      <Note className="mt-7">
        {quote.meteredNotice} 본 금액은 <b className="text-foreground">예상</b>이며 확정 금액이
        아닙니다.
      </Note>
    </section>
  );
}
