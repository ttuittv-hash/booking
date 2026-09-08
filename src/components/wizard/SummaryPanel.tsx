"use client";

import { won } from "@/lib/format";
import { VENUES } from "@/lib/pricing/types";
import type { EstimatedQuote, LineItem } from "@/lib/pricing/types";
import {
  estimateLineLabel,
  isHiddenFromApplicant,
  SECTION_LABEL,
  SECTION_SUBTOTAL_LABEL,
  sectionOf,
  type ContractSection,
} from "@/lib/pricing/lineItemGroups";

const VENUE_NAME: Record<string, string> = Object.fromEntries(VENUES.map((v) => [v.id, v.name]));
// "대관료"(패키지에 묶인 금액)를 먼저, "추가 옵션"을 그 아래에 둔다 — 계약 확정
// 대상이 아닌 쪽을 뒤로 밀어야 어느 쪽이 대관료인지 헷갈리지 않는다.
const SECTION_ORDER: ContractSection[] = ["CONTRACT", "ADDITIONAL"];

/**
 * 우측 sticky 요약 — **실시간 대관신청 내역**.
 *
 *   (공간 소제목) → 대관료 박스(패키지 항목) → 추가 옵션 박스 → 소계 → 부가세 → 총금액
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
 *
 * [개정 2026-09-07] "저 박스에 로직은 노출하지 말라고" — 1일 2회 공연 할증률 안내,
 * 유틸리티 정산 안내 문구를 뺐다. 이 패널은 금액만 보여준다 — 계산 방식·정책
 * 설명은 STEP 안내문(Step5Estimate 등)에서 한다.
 *
 * [개정 2026-09-08] "예상 대관료 내역은 오른쪽 실시간 대관 신청내역과 필드값이
 * 동일해야지" — 박스 제목·소계 라벨·항목 라벨을 lineItemGroups로 옮겨
 * Step5Estimate(QuoteLineItemsReport)·마이페이지·인쇄용 신청서와 공유한다.
 * [수정 2026-09-08] "할인율 보여줘.. 너무 다 감추니까 뭐가뭔지 안보이고" — 항목
 * 라벨에서 할인율(%)까지 지우던 전용 함수(applicantLineLabel)를 없애고, 왼쪽
 * 예상 대관료와 같은 estimateLineLabel(할증 %만 감추고 할인 %는 보여준다)을 쓴다.
 */
export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  // Bowl 사용료·유틸리티(HIDDEN)와 청소비는 합계에는 포함하되 신청자 화면에는 항목·금액을
  // 노출하지 않는다 — quote.subtotal/total 은 전체 lineItems 기준으로 이미 계산돼 있어
  // 여기서 걸러내도 총액에는 영향이 없다. 무엇을 감출지는 lineItemGroups 한 곳에서 정한다.
  const visibleItems = quote.lineItems.filter((item) => !isHiddenFromApplicant(item));
  // [수정 2026-09-07] "계산이 안맞는데? 소계 = 실제 계약금액 + 추가 예상 금액" — 섹션
  // 소계(실제 계약금액/추가 예상 금액)를 visibleItems 로만 더하면 숨긴 항목(청소비 등)의
  // 금액이 어느 소계에도 안 잡혀서 두 소계의 합이 소계(VAT 별도, quote.subtotal 그대로)
  // 보다 작아진다. 항목 행은 그대로 숨기되, 소계 금액에는 실제로 과금되는 숨긴 항목
  // 금액도 포함해야 두 값이 맞는다 — 소계 계산은 전체 lineItems 기준으로 한다.
  const venuesPresent = new Set(visibleItems.map((item) => item.venue).filter(Boolean));
  const groups: { venue?: string; items: LineItem[]; allItems: LineItem[] }[] =
    venuesPresent.size > 1
      ? VENUES.filter((v) => venuesPresent.has(v.id as LineItem["venue"])).map((v) => ({
          venue: v.id,
          items: visibleItems.filter((item) => item.venue === v.id),
          allItems: quote.lineItems.filter((item) => item.venue === v.id),
        }))
      : [{ items: visibleItems, allItems: quote.lineItems }];

  return (
    <aside className="w-full min-w-0 lg:col-span-3 lg:sticky lg:top-28 lg:self-start">
      <div className="border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">실시간 대관신청 내역</h3>

        {visibleItems.length === 0 ? (
          <div className="mt-5 border-t border-border/25 border-b border-border/15 py-4 text-s text-muted">
            공간과 일정을 선택하면 예상 금액이 표시됩니다.
          </div>
        ) : (
          groups.map((group, groupIndex) => (
            <div key={group.venue ?? "single"} className={groupIndex === 0 ? "mt-5" : "mt-6"}>
              {group.venue && (
                <div className="border-t-2 border-foreground pt-2.5 text-left text-s font-bold text-foreground">
                  {VENUE_NAME[group.venue] ?? group.venue}
                </div>
              )}
              {SECTION_ORDER.map((section) => {
                const sectionItems = group.items.filter((item) => sectionOf(item) === section);
                const subtotal = group.allItems
                  .filter((item) => sectionOf(item) === section)
                  .reduce((sum, item) => sum + item.amount, 0);
                return (
                  <div key={section} className="mt-4 border border-border/25 bg-surface p-4">
                    <p className="text-xs font-bold text-foreground">{SECTION_LABEL[section]}</p>
                    {sectionItems.length > 0 && (
                      <dl className="mt-2 border-t border-border/25">
                        {sectionItems.map((item) => (
                          <div
                            key={item.addonId}
                            className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5"
                          >
                            <dt className="text-s text-muted">
                              {estimateLineLabel(item)}
                              {/* [수정 2026-09-07] "공연 일수 조정 (...)(초과 4) -> 초과 부분 제거" —
                                  이 줄은 billable이 옵션 초과분이 아니라 라벨에 이미 적힌 "+N일"
                                  자체라서 "(초과 N)"을 덧붙이면 같은 값이 중복 표시된다. 실제
                                  포함 수량 대비 초과분을 보여주는 다른 항목(선택 옵션 등)에서만
                                  이 표기를 쓴다. */}
                              {item.addonId !== "performance_day_adjustment" &&
                                item.billable > 0 &&
                                item.included > 0 && (
                                  <span className="ml-1 text-xs text-muted">
                                    (초과 {item.billable.toLocaleString()})
                                  </span>
                                )}
                            </dt>
                            <dd className="shrink-0 text-s tabular-nums text-muted">{won(item.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {/* [개정 2026-09-07] "대관료/추가 옵션 박스마다 총액을 강조 표시" 시안
                        요청 — 소계 줄을 박스 안에서 테두리로 감싸 눈에 띄게 한다. */}
                    <div className="mt-3 flex justify-between border border-accent bg-accent-soft/40 px-3 py-2.5 text-s font-bold text-foreground">
                      <span>{SECTION_SUBTOTAL_LABEL[section]}</span>
                      <span className="tabular-nums">{won(subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        <div className="mt-5">
            <dl>
              <div className="flex items-baseline justify-between gap-4 border-t border-border/25 border-b border-border/15 py-2.5">
                <dt className="text-s font-bold text-foreground">소계 (VAT 별도)</dt>
                <dd className="text-s font-bold tabular-nums text-foreground">{won(quote.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5">
                <dt className="text-s text-muted">부가세 10%</dt>
                <dd className="text-s tabular-nums text-muted">{won(quote.vat)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-foreground py-3">
              {/* [개정 2026-09-07] 시안 라벨 "총금액"으로 통일(예전 "합계"). */}
              <span className="text-s font-bold text-foreground">총금액</span>
              <span className="type-display text-h5-m tabular-nums sm:text-h5">
                {won(quote.total)}
              </span>
            </div>
        </div>
      </div>
    </aside>
  );
}
