"use client";

import { won } from "@/lib/format";
import { isMidHallWeekend, midHallReferencePrice } from "./MidHallCalendar";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";

function formatDateLabel(iso: string): string {
  const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
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
    const midHallDates = Object.keys(selection.midHallDays).sort();
    if (midHallDates.length === 0) {
      return (
        <section className="rounded border border-border bg-background p-7">
          <p className="text-[13.5px] text-muted">먼저 1단계에서 패키지를 선택하세요.</p>
        </section>
      );
    }
    const referenceTotal = midHallDates.reduce(
      (sum, iso) => sum + midHallReferencePrice(iso, selection.midHallDays[iso].role),
      0,
    );
    return (
      <section className="rounded border border-border bg-background p-7">
        <h2 className="text-[19px] font-semibold">6. 예상 대관료 · 산출내역서 (중형)</h2>
        <p className="mt-1.5 text-[13.5px] text-muted">
          중형공연장은 패키지가 없어 날짜별 참고 단가만 안내합니다 — 실제 견적 계산(요금 엔진
          연동)은 다음 업데이트에서 반영됩니다.
        </p>
        <div className="mt-5 divide-y divide-border rounded border border-border">
          {midHallDates.map((iso) => {
            const sel = selection.midHallDays[iso];
            const price = midHallReferencePrice(iso, sel.role);
            return (
              <div key={iso} className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                <span>
                  {formatDateLabel(iso)} {isMidHallWeekend(iso) && <span className="text-muted">· 주말</span>} ·{" "}
                  {sel.role === "SETUP" ? "셋업" : `공연 ${sel.shows}회차`}
                </span>
                <span className="tabular-nums text-muted">{won(price)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between bg-panel px-4 py-2.5 text-[13.5px] font-semibold">
            <span>참고 합계 (VAT 별도)</span>
            <span className="tabular-nums">{won(referenceTotal)}</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          청소비 · 시간 단위 추가 · 선택 옵션은 이 참고 합계에 포함되지 않습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">6. 예상 대관료 · 산출내역서</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {pkg.audienceTier.label} · {selection.week.year}.{selection.week.month}{" "}
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

      {selection.bookingMode === "SIMULTANEOUS" && (
        <div className="mt-4 rounded border-l-2 border-accent bg-accent-soft px-4 py-3 text-[12.5px] leading-5 text-accent">
          위 금액은 <b>아레나 소계만</b> 반영합니다. 중형 소계 · 합산 금액은 요금 엔진 연동 후
          이 화면에 함께 표시될 예정입니다(할인 없이 두 소계를 단순 합산).
        </div>
      )}
    </section>
  );
}
