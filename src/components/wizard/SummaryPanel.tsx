"use client";

import { won } from "@/lib/format";
import type { EstimatedQuote } from "@/lib/pricing/types";

/** 우측 sticky 요약 — 카드 박스 없이 헤어라인 표(SpecTable 스타일)로만 구성한다. */
export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  return (
    <aside className="w-full min-w-0 lg:col-span-2 lg:sticky lg:top-28 lg:self-start">
      <div className="border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">실시간 견적 요약</h3>

        <dl className="mt-5 border-t border-border/25">
          {quote.lineItems.length === 0 ? (
            <div className="border-b border-border/25 py-4 text-s text-muted">
              패키지를 선택하면 견적이 표시됩니다.
            </div>
          ) : (
            quote.lineItems.map((item) => (
              <div
                key={item.addonId}
                className="flex items-baseline justify-between gap-4 border-b border-border/15 py-3"
              >
                <dt
                  className={
                    item.addonId === "BASE_FEE"
                      ? "min-w-0 text-s font-bold text-foreground"
                      : "min-w-0 text-s text-muted"
                  }
                >
                  {item.label}
                  {item.billable > 0 && item.included > 0 && (
                    <span className="ml-1 text-xs text-muted">
                      (초과 {item.billable.toLocaleString()})
                    </span>
                  )}
                </dt>
                <dd className="shrink-0 text-s font-bold tabular-nums text-foreground">
                  {won(item.amount)}
                </dd>
              </div>
            ))
          )}
        </dl>

        <dl className="border-b border-border/25">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-s text-muted">소계 (VAT 별도)</dt>
            <dd className="text-s tabular-nums text-muted">{won(quote.subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 pb-3">
            <dt className="text-s text-muted">부가세 10%</dt>
            <dd className="text-s tabular-nums text-muted">{won(quote.vat)}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t-2 border-foreground pt-4">
          <p className="text-xs font-bold">합계 (VAT 포함)</p>
          <p className="type-display mt-2 text-h5-m tabular-nums sm:text-h5">{won(quote.total)}</p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
            <li>부가세 10% 별도 산정 후 합산한 예상 금액입니다.</li>
            <li>실제 금액은 신청 → 계약 → 정산 단계에서 확정됩니다.</li>
            <li>{quote.meteredNotice}</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
