"use client";

import { won } from "@/lib/format";
import type { EstimatedQuote } from "@/lib/pricing/types";

export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded border border-border bg-panel/70 p-6">
        <h3 className="text-[15px] font-semibold">실시간 견적 요약</h3>
        <p className="mt-1 text-[11.5px] font-medium text-warn">
          ※ 예상 금액 — 확정 아님 (신청 → 계약 → 정산 단계에서 확정)
        </p>

        <div className="mt-4 divide-y divide-border/70">
          {quote.lineItems.length === 0 ? (
            <div className="py-3 text-[13px] text-muted">
              패키지를 선택하면 견적이 표시됩니다.
            </div>
          ) : (
            quote.lineItems.map((item) => (
              <div
                key={item.addonId}
                className="flex items-center justify-between py-2.5 text-[13px]"
              >
                <span
                  className={
                    item.addonId === "BASE_FEE"
                      ? "font-semibold text-foreground"
                      : "text-muted"
                  }
                >
                  {item.label}
                  {item.billable > 0 && item.included > 0 && (
                    <span className="ml-1 text-[11px] text-muted">
                      (초과 {item.billable.toLocaleString()})
                    </span>
                  )}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {won(item.amount)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <div className="flex justify-between text-[13px] text-muted">
            <span>소계 (VAT 별도)</span>
            <span className="tabular-nums">{won(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-muted">
            <span>부가세 10%</span>
            <span className="tabular-nums">{won(quote.vat)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <span className="text-[14px] font-semibold">합계</span>
            <span className="text-[22px] font-semibold tabular-nums">
              {won(quote.total)}
            </span>
          </div>
        </div>

        <p className="mt-4 rounded border-l-2 border-warn bg-warn-soft px-3 py-2.5 text-[11.5px] leading-5 text-warn">
          {quote.meteredNotice}
        </p>
      </div>
    </aside>
  );
}
