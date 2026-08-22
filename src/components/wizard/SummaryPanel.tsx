"use client";

import { won } from "@/lib/format";
import { Note } from "@/components/ui/kit";
import { VENUES } from "@/lib/pricing/types";
import type { EstimatedQuote, LineItem } from "@/lib/pricing/types";

const VENUE_NAME: Record<string, string> = Object.fromEntries(VENUES.map((v) => [v.id, v.name]));

/**
 * 우측 sticky 요약 — **실시간 견적 요약**. 카드 박스 없이 헤어라인 표(SpecTable 리듬)로만.
 *
 *   항목(대관료 · 부대시설 …) → 소계 → 부가세 → 합계
 *
 * 한동안 STEP 1·2 에서 금액을 감췄는데, 신청자가 구성을 고르는 동안 값이 얼마나 움직이는지
 * 볼 수 없어 되돌렸다. 대신 "예상 금액 · 확정 아님" 고지를 항상 위에 둔다.
 */
export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  // Bowl 사용료·유틸리티(HIDDEN)는 합계에는 포함하되 신청자 화면에는 항목·금액 모두 노출하지
  // 않는다 — quote.subtotal/total은 전체 lineItems 기준으로 이미 계산돼 있어 여기서 걸러내도
  // 총액에는 영향이 없다.
  const visibleItems = quote.lineItems.filter((item) => item.visibility !== "HIDDEN");
  // 동시 대관에서는 아레나·중형 항목이 한 목록에 섞여 어느 공간 몫인지 구분이 안 된다는
  // 지적으로 공간별 소제목을 넣었다(2026-08-22) — 항목에 실제로 두 공간이 섞여 있을 때만
  // 나눈다. 한 공간만 선택했을 때는 예전처럼 소제목 없이 밋밋한 목록 그대로 보여준다.
  const venuesPresent = new Set(visibleItems.map((item) => item.venue).filter(Boolean));
  const groups: { venue?: string; items: LineItem[] }[] =
    venuesPresent.size > 1
      ? VENUES.filter((v) => venuesPresent.has(v.id as LineItem["venue"])).map((v) => ({
          venue: v.id,
          items: visibleItems.filter((item) => item.venue === v.id),
        }))
      : [{ items: visibleItems }];

  return (
    <aside className="w-full min-w-0 lg:sticky lg:top-28 lg:self-start">
      <div className="border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">실시간 견적 요약</h3>
        <p className="mt-2 text-xs text-muted">
          ※ 예상 금액 — 확정 아님 (신청 → 계약 → 정산 단계에서 확정)
        </p>

        <dl className="mt-5 border-t border-border/25">
          {visibleItems.length === 0 ? (
            <div className="border-b border-border/15 py-4 text-s text-muted">
              공간과 일정을 선택하면 예상 금액이 표시됩니다.
            </div>
          ) : (
            groups.map((group, groupIndex) => (
              <div key={group.venue ?? "single"}>
                {group.venue && (
                  <div
                    className={`border-t-2 border-foreground pt-2.5 text-left text-s font-bold text-foreground ${
                      groupIndex === 0 ? "" : "mt-4"
                    }`}
                  >
                    {VENUE_NAME[group.venue] ?? group.venue}
                  </div>
                )}
                {group.items.map((item) => (
                  <div
                    key={`${group.venue ?? "single"}-${item.addonId}`}
                    className={`flex items-baseline justify-between gap-4 border-b border-border/15 py-3 ${
                      group.venue ? "pl-3" : ""
                    }`}
                  >
                    <dt className="text-s text-muted">
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
                ))}
              </div>
            ))
          )}
        </dl>

        <div className="mt-5">
            <dl>
              <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5">
                <dt className="text-s font-bold text-foreground">소계 (VAT 별도)</dt>
                <dd className="text-s font-bold tabular-nums text-foreground">{won(quote.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5">
                <dt className="text-s text-muted">부가세 10%</dt>
                <dd className="text-s tabular-nums text-muted">{won(quote.vat)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-foreground py-3">
              <span className="text-s font-bold text-foreground">합계</span>
              <span className="type-display text-h5-m tabular-nums sm:text-h5">
                {won(quote.total)}
              </span>
            </div>
        </div>

        <Note className="mt-6">{quote.meteredNotice}</Note>
      </div>
    </aside>
  );
}
