"use client";

import { won } from "@/lib/format";
import { Note } from "@/components/ui/kit";
import { VENUES } from "@/lib/pricing/types";
import type { EstimatedQuote, LineItem } from "@/lib/pricing/types";
import {
  isHiddenFromApplicant,
  SECTION_LABEL,
  SECTION_SUBTOTAL_LABEL,
  sectionOf,
  type ContractSection,
} from "@/lib/pricing/lineItemGroups";

const VENUE_NAME: Record<string, string> = Object.fromEntries(VENUES.map((v) => [v.id, v.name]));
// "계약 내역"(패키지에 묶인 금액)을 먼저, "추가 예상 금액"(옵션)을 그 아래에 둔다 —
// 계약 확정 대상이 아닌 쪽을 뒤로 밀어야 어느 쪽이 실제 계약금액인지 헷갈리지 않는다.
const SECTION_ORDER: ContractSection[] = ["CONTRACT", "ADDITIONAL"];

/**
 * 우측 sticky 요약 — **실시간 대관신청 내역**. 카드 박스 없이 헤어라인 표(SpecTable 리듬)로만.
 *
 *   (공간 소제목) → 계약 내역(패키지 항목) → 추가 예상 금액(옵션) → 소계 → 부가세 → 합계
 *
 * [개정 2026-08-26] "아레나 패키지의 실제 계약금액은 패키지에 대한 내역이고, 옵션
 * 선택한 것들은 추가 예상 예산" — 계약 확정 대상(패키지)과 신청자가 고른 옵션을
 * 한 목록에 섞어 보여주면 어디까지가 계약금액인지 헷갈린다는 지적으로 슬롯을 나눴다.
 *
 * 한동안 STEP 1·2 에서 금액을 감췄는데, 신청자가 구성을 고르는 동안 값이 얼마나 움직이는지
 * 볼 수 없어 되돌렸다.
 *
 * [개정 2026-09-02] 제목 아래의 "※ 예상 금액 — 확정 아님" 한 줄을 뺐다. 같은 뜻이
 * 화면 곳곳(제출 단계 안내·신청 완료 문구)에 이미 있고, 값이 움직일 때마다 보이는
 * 자리에 경고를 붙여 두면 읽히지 않는 문구가 된다.
 */
export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  // Bowl 사용료·유틸리티(HIDDEN)와 청소비는 합계에는 포함하되 신청자 화면에는 항목·금액을
  // 노출하지 않는다 — quote.subtotal/total 은 전체 lineItems 기준으로 이미 계산돼 있어
  // 여기서 걸러내도 총액에는 영향이 없다. 무엇을 감출지는 lineItemGroups 한 곳에서 정한다.
  const visibleItems = quote.lineItems.filter((item) => !isHiddenFromApplicant(item));
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
    <aside className="mt-10 w-full min-w-0 lg:col-span-2 lg:mt-0 lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-surface bg-panel p-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">실시간 대관신청 내역</h3>

        {visibleItems.length === 0 ? (
          /* 아직 아무것도 고르지 않은 상태다 — 한 줄짜리 안내를 표의 한 행처럼 위아래
             선으로 가두면, 바로 아래 소계 표의 선과 겹쳐 빈 칸만 여러 겹으로 보인다. */
          <p className="mt-5 text-s text-muted">공간과 일정을 선택하면 예상 금액이 표시됩니다.</p>
        ) : (
          groups.map((group, groupIndex) => (
            <div key={group.venue ?? "single"} className={groupIndex === 0 ? "mt-5" : "mt-6"}>
              {group.venue && (
                <div className="border-t border-border/25 pt-2.5 text-left text-s font-bold text-foreground">
                  {VENUE_NAME[group.venue] ?? group.venue}
                </div>
              )}
              {SECTION_ORDER.map((section, sectionIndex) => {
                const sectionItems = group.items.filter((item) => sectionOf(item) === section);
                const subtotal = sectionItems.reduce((sum, item) => sum + item.amount, 0);
                const isEmpty = sectionItems.length === 0 && subtotal === 0;
                return (
                  /* 「계약 내역」과 「추가 예상 금액」은 성격이 다른 두 덩어리다 —
                     덩어리 사이 간격(48)을 줘서 항목 줄 간격과 헷갈리지 않게 한다.
                     첫 덩어리는 바로 위 제목에 붙어야 하므로 그대로 둔다. */
                  <div key={section} className={sectionIndex === 0 ? "mt-4" : "mt-block"}>
                    {/* 아무것도 고르지 않은 슬롯은 제목 한 줄로 끝낸다 — 빈 목록 아래에
                        "…₩0" 을 또 적으면 없다는 말을 두 번 하게 되고, 값이 있는 슬롯과
                        같은 무게로 자리를 차지한다. */}
                    <p className="text-xs font-bold text-muted">
                      {isEmpty ? `${SECTION_LABEL[section]} 없음` : SECTION_LABEL[section]}
                    </p>
                    {sectionItems.length > 0 && (
                      <dl className="mt-1.5 border-t border-border">
                        {sectionItems.map((item) => (
                          <div
                            key={item.addonId}
                            className="flex items-baseline justify-between gap-4 border-b border-border/25 py-2.5"
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
                      </dl>
                    )}
                    {!isEmpty && (
                      <div className="mt-1.5 flex justify-between text-xs text-muted">
                        <span>{SECTION_SUBTOTAL_LABEL[section]}</span>
                        <span className="tabular-nums">{won(subtotal)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* 소계 · 부가세 · 합계는 한 덩어리다 — 셋이 이어지는 계산이라 사이를 띄우면
            어디서 더한 값인지 끊겨 보인다. 앞의 두 묶음(계약 내역 · 추가 예상 금액)과는
            같은 간격으로 떨어진다. */}
        <div className="mt-block border-t border-border">
            <dl>
              <div className="flex items-baseline justify-between gap-4 border-b border-border/25 py-2.5">
                <dt className="text-s font-bold text-foreground">소계 (VAT 별도)</dt>
                <dd className="text-s font-bold tabular-nums text-foreground">{won(quote.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border/25 py-2.5">
                <dt className="text-s text-muted">부가세 10%</dt>
                <dd className="text-s tabular-nums text-muted">{won(quote.vat)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/25 py-3">
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
