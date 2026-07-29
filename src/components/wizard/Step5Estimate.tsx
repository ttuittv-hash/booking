"use client";

import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";

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
      <section className="rounded-md border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">
          먼저 1단계에서 패키지를 선택하세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">5. 예상 대관료 · 산출내역서</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {pkg.name} · {selection.week.year}.{selection.week.month}{" "}
        {selection.week.weekOfMonth}주차 · 총 {totalRentalDays(selection)}일 · 관객{" "}
        {selection.expectedAudience.toLocaleString()}명
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11.5px] font-medium text-muted">
              <th className="py-2 text-left">항목</th>
              <th className="py-2 text-right">신청</th>
              <th className="py-2 text-right">기본포함</th>
              <th className="py-2 text-right">과금수량</th>
              <th className="py-2 text-right">단가</th>
              <th className="py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item) => (
              <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                <td className="py-2.5 text-left font-medium">{item.label}</td>
                <td className="py-2.5 text-right">
                  {item.pricingType === "REVENUE_PERCENT"
                    ? `${won(selection.expectedRevenue ?? 0)} × ${item.unitPrice}%`
                    : item.requested.toLocaleString()}
                </td>
                <td className="py-2.5 text-right">{item.included || "-"}</td>
                <td className="py-2.5 text-right">
                  {item.pricingType === "REVENUE_PERCENT" ? "-" : item.billable.toLocaleString()}
                </td>
                <td className="py-2.5 text-right">
                  {item.pricingType === "REVENUE_PERCENT" ? "-" : won(item.unitPrice)}
                </td>
                <td className="py-2.5 text-right font-semibold">{won(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-3 text-right text-[13px] font-semibold">
                소계 (VAT 별도)
              </td>
              <td className="pt-3 text-right text-[13px] font-semibold tabular-nums">
                {won(quote.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="pt-1 text-right text-[12.5px] text-muted">
                부가세 10%
              </td>
              <td className="pt-1 text-right text-[12.5px] text-muted tabular-nums">
                {won(quote.vat)}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="pt-2 text-right text-[15px] font-semibold">
                합계
              </td>
              <td className="pt-2 text-right text-[17px] font-semibold tabular-nums">
                {won(quote.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-6 rounded-md border-l-2 border-warn bg-warn-soft px-4 py-3 text-[12.5px] leading-5 text-warn">
        {quote.meteredNotice} 본 금액은 <b>예상</b>이며 확정 금액이 아닙니다.
      </p>
    </section>
  );
}
