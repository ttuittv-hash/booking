"use client";

import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
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
      <section className="rounded border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">먼저 1단계에서 패키지를 선택하거나 중형공연장 일정을 선택하세요.</p>
      </section>
    );
  }

  const arenaLine = pkg
    ? `${pkg.audienceTier.label} · ${selection.week.year}.${selection.week.month} ${selection.week.weekOfMonth}주차 · 총 ${totalRentalDays(selection)}일 · 관객 ${selection.expectedAudience.toLocaleString()}명`
    : null;
  const midHallLine = midHallSummaryLine(selection);

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">6. 예상 대관료 · 산출내역서</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {isSimultaneous ? (
          <>
            아레나 — {arenaLine}
            <br />
            중형공연장 — {midHallLine}
          </>
        ) : (
          arenaLine ?? midHallLine
        )}
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
            {/* Bowl 사용료·유틸리티(HIDDEN)는 합계에는 포함하되 신청자 화면에는 항목·금액을
                노출하지 않는다 — 아래 소계/부가세/합계는 quote.subtotal 등 전체 lineItems
                기준 값을 그대로 쓰므로 여기서 걸러내도 금액 자체는 달라지지 않는다. */}
            {quote.lineItems
              .filter((item) => item.visibility !== "HIDDEN")
              .map((item) => (
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

      <p className="mt-6 rounded border-l-2 border-warn bg-warn-soft px-4 py-3 text-[12.5px] leading-5 text-warn">
        {quote.meteredNotice} 본 금액은 <b>예상</b>이며 확정 금액이 아닙니다.
      </p>

      {quote.blockingIssues.length > 0 && (
        <div className="mt-4 rounded border-l-2 border-warn bg-warn-soft px-4 py-3 text-[12.5px] leading-5 text-warn">
          <p className="font-semibold">운영자 확인이 필요해 아직 신청서를 제출할 수 없습니다.</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {quote.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {isSimultaneous && (
        <div className="mt-4 rounded border-l-2 border-accent bg-accent-soft px-4 py-3 text-[12.5px] leading-5 text-accent">
          위 금액은 <b>아레나 + 중형공연장 합산</b>입니다 (할인 없이 두 소계를 단순 합산).
        </div>
      )}
    </section>
  );
}
