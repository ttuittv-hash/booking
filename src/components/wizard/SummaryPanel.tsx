"use client";

import { won } from "@/lib/format";
import { Note } from "@/components/ui/kit";
import type { EstimatedQuote } from "@/lib/pricing/types";

export interface SummaryPreviewRow {
  label: string;
  value: string;
}

/**
 * 우측 sticky 요약 — 카드 박스 없이 헤어라인 표(SpecTable 리듬)로만 구성한다.
 *
 * [화면 뼈대 2026-08-19, 화면시나리오 STEP 1-1 "선택 내용"] STEP 1·2(공간·일정, 구성·옵션)
 * 에서는 선택 내용만 요약해 보여주고 금액은 표시하지 않는다 — 신청자가 구성을 충분히 검토한
 * 뒤 STEP 4(예상 대관료)에서 처음 총액을 확인하는 흐름이다. revealPrice=false면 소계·VAT·
 * 합계 대신 안내 문구를 보여준다. previewRows가 있으면(STEP 1-1) 견적 항목 대신 이용시설·
 * 무대구성 등 지금까지 입력한 값 자체를 큐레이션한 목록으로 보여준다.
 */
export function SummaryPanel({
  quote,
  revealPrice = true,
  previewRows,
}: {
  quote: EstimatedQuote;
  revealPrice?: boolean;
  previewRows?: SummaryPreviewRow[];
}) {
  // Bowl 사용료·유틸리티(HIDDEN)는 합계에는 포함하되 신청자 화면에는 항목·금액 모두 노출하지
  // 않는다 — quote.subtotal/total은 전체 lineItems 기준으로 이미 계산돼 있어 여기서 걸러내도
  // 총액에는 영향이 없다.
  const visibleItems = quote.lineItems.filter((item) => item.visibility !== "HIDDEN");

  return (
    <aside className="w-full min-w-0 lg:sticky lg:top-28 lg:self-start">
      <div className="border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">
          {revealPrice ? "실시간 견적 요약" : "선택 내용"}
        </h3>
        <p className="mt-2 text-xs text-muted">
          {revealPrice
            ? "※ 예상 금액 — 확정 아님 (신청 → 계약 → 정산 단계에서 확정)"
            : "※ 스크롤을 따라 고정 · 금액은 표시하지 않음"}
        </p>

        <dl className="mt-5 border-t border-border/25">
          {previewRows ? (
            previewRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-border/15 py-3"
              >
                <dt className="text-s text-muted">{row.label}</dt>
                <dd className="shrink-0 text-s font-bold text-foreground">{row.value}</dd>
              </div>
            ))
          ) : visibleItems.length === 0 ? (
            <div className="border-b border-border/15 py-4 text-s text-muted">
              공간과 일정을 선택하면 선택 내용이 표시됩니다.
            </div>
          ) : (
            visibleItems.map((item) => (
              <div
                key={item.addonId}
                className="flex items-baseline justify-between gap-4 border-b border-border/15 py-3"
              >
                <dt className={item.addonId === "BASE_FEE" ? "text-s font-bold" : "text-s text-muted"}>
                  {item.label}
                  {item.billable > 0 && item.included > 0 && (
                    <span className="ml-1 text-xs text-muted">
                      (초과 {item.billable.toLocaleString()})
                    </span>
                  )}
                </dt>
                {revealPrice && (
                  <dd className="shrink-0 text-s font-bold tabular-nums text-foreground">
                    {won(item.amount)}
                  </dd>
                )}
              </div>
            ))
          )}
        </dl>

        {revealPrice ? (
          <div className="mt-5">
            <dl>
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
              <span className="type-display text-h5-m tabular-nums sm:text-h5">
                {won(quote.total)}
              </span>
            </div>
          </div>
        ) : (
          <Note className="mt-5">예상 대관료는 신청서 제출 직전 단계에서 최종 확인합니다.</Note>
        )}

        {revealPrice && <Note className="mt-6">{quote.meteredNotice}</Note>}
      </div>
    </aside>
  );
}
