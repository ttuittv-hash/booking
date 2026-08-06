"use client";

import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { Label } from "@/components/ui/kit";

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
        <Label className="text-muted">Step 06</Label>
        <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">예상 대관료 · 산출내역서</h2>
        <p className="mt-3 text-s text-muted">먼저 2단계에서 패키지를 선택하세요.</p>
      </section>
    );
  }

  return (
    <section>
      <Label className="text-muted">Step 06</Label>
      <h2 className="type-kr-heading mt-3 text-h4-m sm:text-h4">예상 대관료 · 산출내역서</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        {pkg.name} · {selection.week.year}.{selection.week.month}{" "}
        {selection.week.weekOfMonth}주차 · 총 {totalRentalDays(selection)}일 · 관객{" "}
        {selection.expectedAudience.toLocaleString()}명
      </p>

      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-s">
          <thead>
            <tr className="border-b-2 border-foreground">
              <th className="type-label py-2.5 text-left text-xs text-muted">항목</th>
              <th className="type-label py-2.5 text-right text-xs text-muted">신청</th>
              <th className="type-label py-2.5 text-right text-xs text-muted">기본포함</th>
              <th className="type-label py-2.5 text-right text-xs text-muted">과금수량</th>
              <th className="type-label py-2.5 text-right text-xs text-muted">단가</th>
              <th className="type-label py-2.5 text-right text-xs text-muted">금액</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item) => (
              <tr key={item.addonId} className="border-b border-border/15 tabular-nums">
                <td className="py-3 text-left font-bold">{item.label}</td>
                <td className="py-3 text-right text-muted">
                  {item.pricingType === "REVENUE_PERCENT"
                    ? `${won(selection.expectedRevenue ?? 0)} × ${item.unitPrice}%`
                    : item.requested.toLocaleString()}
                </td>
                <td className="py-3 text-right text-muted">{item.included || "-"}</td>
                <td className="py-3 text-right text-muted">
                  {item.pricingType === "REVENUE_PERCENT" ? "-" : item.billable.toLocaleString()}
                </td>
                <td className="py-3 text-right text-muted">
                  {item.pricingType === "REVENUE_PERCENT" ? "-" : won(item.unitPrice)}
                </td>
                <td className="py-3 text-right font-bold">{won(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b border-border/15">
              <td colSpan={5} className="py-3 text-right text-s font-bold">
                소계 (VAT 별도)
              </td>
              <td className="py-3 text-right text-s font-bold tabular-nums">
                {won(quote.subtotal)}
              </td>
            </tr>
            <tr className="border-b-2 border-foreground">
              <td colSpan={5} className="py-3 text-right text-s text-muted">
                부가세 10%
              </td>
              <td className="py-3 text-right text-s tabular-nums text-muted">{won(quote.vat)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="type-label pt-4 text-right text-xs">
                합계 · VAT 포함
              </td>
              <td className="type-display pt-4 text-right text-h5-m tabular-nums sm:text-h5">
                {won(quote.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-7 border-l-2 border-accent bg-warn-soft px-4 py-3 text-s leading-6 text-muted-strong">
        {quote.meteredNotice} 본 금액은 <b className="text-foreground">예상</b>이며 확정 금액이
        아닙니다.
      </p>
    </section>
  );
}
