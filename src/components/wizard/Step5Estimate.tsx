"use client";

import { won } from "@/lib/format";
import { findPackage, totalRentalDays } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { QuoteLineItemsReport } from "@/components/QuoteLineItemsReport";

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
        <p className="text-s text-muted">먼저 1단계에서 패키지를 선택하거나 중형공연장 일정을 선택하세요.</p>
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

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">예상 대관료</h2>
      <p className="measure mt-3 break-keep text-s text-muted">
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

      {/* Bowl 사용료·유틸리티(HIDDEN)는 아래 합계 계산에는 포함되지만 신청자 화면에는
          항목·금액을 노출하지 않는다 — 그래서 아레나/중형 소계를 각각 더해도 맨 아래
          최종 소계(quote.subtotal, 전체 lineItems 기준)와는 차이가 날 수 있다.
          마이페이지 신청 상세·인쇄용 신청서와 동일한 QuoteLineItemsReport를 재사용해 세
          화면의 산출내역이 서로 다르지 않게 한다. */}
      <QuoteLineItemsReport
        selection={selection}
        lineItems={quote.lineItems}
        expectedRevenue={selection.expectedRevenue ?? 0}
      />

      <div className="mt-6 border border-border bg-panel/40 p-5">
        {isSimultaneous && (
          <div className="mb-3 flex items-center justify-between border-b border-border pb-3 text-s">
            <span className="text-muted">아레나 소계 + 중형공연장 소계</span>
            <span className="tabular-nums text-foreground">
              {won(arenaVisibleSubtotal)} + {won(midHallVisibleSubtotal)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-s text-muted">
          <span>소계 (VAT 별도)</span>
          <span className="tabular-nums">{won(quote.subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-s text-muted">
          <span>부가세 10%</span>
          <span className="tabular-nums">{won(quote.vat)}</span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-r font-bold">합계</span>
          <span className="text-h6-m sm:text-h6 font-bold tabular-nums">{won(quote.total)}</span>
        </div>
      </div>

      <p className="mt-6 border-l-2 border-border bg-panel px-4 py-3 text-xs leading-5 text-muted-strong">
        {quote.meteredNotice} 본 금액은 <b>예상</b>이며 확정 금액이 아닙니다.
      </p>

      {quote.blockingIssues.length > 0 && (
        <div className="mt-4 border-l-2 border-border bg-panel px-4 py-3 text-xs leading-5 text-muted-strong">
          <p className="font-bold">운영자 확인이 필요해 아직 신청서를 제출할 수 없습니다.</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {quote.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {isSimultaneous && (
        <div className="mt-4 border-l-2 border-foreground bg-inverse-bg text-inverse-fg px-4 py-3 text-xs leading-5 text-foreground">
          위 금액은 <b>아레나 + 중형공연장 합산</b>입니다 (할인 없이 두 소계를 단순 합산).
        </div>
      )}
    </section>
  );
}
