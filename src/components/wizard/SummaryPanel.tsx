"use client";

import { useState } from "react";
import { won } from "@/lib/format";
import { VENUES } from "@/lib/pricing/types";
import type { EstimatedQuote, LineItem } from "@/lib/pricing/types";
import {
  isHiddenFromApplicant,
  SECTION_LABEL,
  SECTION_SUBTOTAL_CAPTION,
  SECTION_TAG,
  sectionOf,
  summaryPanelLineLabel,
  type ContractSection,
} from "@/lib/pricing/lineItemGroups";

const VENUE_NAME: Record<string, string> = Object.fromEntries(
  VENUES.map((v) => [v.id, v.name]),
);
// "대관료"(패키지에 묶인 금액)를 먼저, "추후 정산 예정 금액"을 그 아래에 둔다 — 계약
// 확정 대상이 아닌 쪽을 뒤로 밀어야 어느 쪽이 대관료인지 헷갈리지 않는다.
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
 * extra_days_rest만 summaryPanelLineLabel이 더 짧은 "추가일(휴무일 N일)"로 대신한다
 * (할인율 두 개가 겹쳐 한 줄로 못 담는 예외 — QuoteLineItemsReport 세부내역 칸에는
 * 원문이 그대로 남는다).
 *
 * [개정 2026-09-08] "아레나/중형 동시 선택 시 너무 복잡해.. 플로팅 박스 맨 위에
 * 아레나 탭, 중형탭 위에 넣어줘" — 공간이 둘 이상이면(동시 대관) 박스를 전부
 * 세로로 나열하는 대신 맨 위에 공간 탭을 두고 한 번에 한 공간의 대관료/추후정산
 * 박스만 보여준다(구성·옵션 STEP의 아레나/중형 탭과 같은 문법). 맨 아래
 * "총금액(예상)"은 탭과 무관하게 항상 전체 공간 합계로 고정한다.
 */
export function SummaryPanel({ quote }: { quote: EstimatedQuote }) {
  // Bowl 사용료·유틸리티(HIDDEN)와 청소비는 합계에는 포함하되 신청자 화면에는 항목·금액을
  // 노출하지 않는다 — quote.subtotal/total 은 전체 lineItems 기준으로 이미 계산돼 있어
  // 여기서 걸러내도 총액에는 영향이 없다. 무엇을 감출지는 lineItemGroups 한 곳에서 정한다.
  const visibleItems = quote.lineItems.filter(
    (item) => !isHiddenFromApplicant(item),
  );
  // [수정 2026-09-07] "계산이 안맞는데? 소계 = 실제 계약금액 + 추가 예상 금액" — 섹션
  // 소계(실제 계약금액/추가 예상 금액)를 visibleItems 로만 더하면 숨긴 항목(청소비 등)의
  // 금액이 어느 소계에도 안 잡혀서 두 소계의 합이 소계(VAT 별도, quote.subtotal 그대로)
  // 보다 작아진다. 항목 행은 그대로 숨기되, 소계 금액에는 실제로 과금되는 숨긴 항목
  // 금액도 포함해야 두 값이 맞는다 — 소계 계산은 전체 lineItems 기준으로 한다.
  const venuesPresent = new Set(
    visibleItems.map((item) => item.venue).filter(Boolean),
  );
  const groups: { venue?: string; items: LineItem[]; allItems: LineItem[] }[] =
    venuesPresent.size > 1
      ? VENUES.filter((v) => venuesPresent.has(v.id as LineItem["venue"])).map(
          (v) => ({
            venue: v.id,
            items: visibleItems.filter((item) => item.venue === v.id),
            allItems: quote.lineItems.filter((item) => item.venue === v.id),
          }),
        )
      : [{ items: visibleItems, allItems: quote.lineItems }];

  // [재개정 2026-09-08] "대관료에도 vat 별도 수수료가 붙고 총 계약금액으로 노출되어야지..
  // 시안대로 해야지" — 박스마다 자기 소계·부가세·최종금액을 갖는다(사용자 와이어프레임
  // 그대로). rateTable.vatRate를 이 컴포넌트가 직접 받지 않으므로, 이미 계산된
  // quote.subtotal/quote.vat의 비율로 유효 세율을 역산한다 — 관리자가 세율을 바꿔도
  // 항상 서버 계산과 같은 비율을 쓴다.
  const effectiveVatRate =
    quote.subtotal > 0 ? quote.vat / quote.subtotal : 0.1;
  // 각 박스(공간 × 섹션)의 소계/부가세/최종금액을 렌더 전에 미리 계산한다 — 렌더 중
  // 부수효과로 합계를 누적하지 않고, 맨 아래 "총금액(예상)"은 이 배열의 최종금액을
  // 그대로 더해 화면에 보이는 숫자끼리 항상 맞게 한다.
  const sectionBoxes = groups.flatMap((group) =>
    SECTION_ORDER.map((section) => {
      const sectionItems = group.items.filter(
        (item) => sectionOf(item) === section,
      );
      const subtotal = group.allItems
        .filter((item) => sectionOf(item) === section)
        .reduce((sum, item) => sum + item.amount, 0);
      const vat = Math.round(subtotal * effectiveVatRate);
      return {
        venue: group.venue,
        section,
        sectionItems,
        subtotal,
        vat,
        total: subtotal + vat,
      };
    }),
  );
  const grandTotal = sectionBoxes.reduce((sum, box) => sum + box.total, 0);

  // [신규 2026-09-08] 탭이 가리키는 공간 — 선택했던 공간이 더 이상 groups에 없으면
  // (STEP1에서 공간을 뺐다든지) 첫 번째 공간으로 자동 복귀한다. 공간이 하나뿐이면
  // 탭 자체를 안 그리므로 항상 undefined.
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const activeVenue =
    groups.length > 1
      ? (groups.find((g) => g.venue === selectedVenue)?.venue ??
        groups[0]?.venue)
      : undefined;
  const visibleGroups =
    groups.length > 1 ? groups.filter((g) => g.venue === activeVenue) : groups;
  const grandTotalLabel =
    groups.length > 1
      ? `총금액(예상) · ${groups.map((g) => VENUE_NAME[g.venue!] ?? g.venue).join("+")}`
      : "총금액(예상)";

  return (
    <aside className="w-full min-w-0 lg:col-span-3 lg:sticky lg:top-28 lg:self-start">
      <div className="border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">
          실시간 대관신청 내역
        </h3>

        {visibleItems.length === 0 ? (
          <div className="mt-5 border-t border-border/25 border-b border-border/15 py-4 text-s text-muted">
            공간과 일정을 선택하면 예상 금액이 표시됩니다.
          </div>
        ) : (
          <>
            {/* [신규 2026-09-08] 공간 탭 — 동시 대관일 때만 보인다.
                [수정 2026-09-08] "메뉴명 밑에 숫자 빼" — 탭 아래 소계 미리보기 줄을 뺐다. */}
            {groups.length > 1 && (
              <div className="mt-5 flex border-b border-border-soft">
                {groups.map((group) => {
                  const isActive = group.venue === activeVenue;
                  return (
                    <button
                      key={group.venue}
                      type="button"
                      onClick={() => setSelectedVenue(group.venue ?? null)}
                      className={[
                        "flex-1 border-b-2 px-3 py-2.5 text-center text-s font-bold transition-colors",
                        isActive
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {VENUE_NAME[group.venue!] ?? group.venue}
                    </button>
                  );
                })}
              </div>
            )}
            {visibleGroups.map((group, groupIndex) => (
              <div
                key={group.venue ?? "single"}
                className={
                  groups.length > 1
                    ? "mt-4"
                    : groupIndex === 0
                      ? "mt-5"
                      : "mt-6"
                }
              >
                {SECTION_ORDER.map((section) => {
                  const sectionItems = group.items.filter(
                    (item) => sectionOf(item) === section,
                  );
                  const subtotal = group.allItems
                    .filter((item) => sectionOf(item) === section)
                    .reduce((sum, item) => sum + item.amount, 0);
                  const vat = Math.round(subtotal * effectiveVatRate);
                  const sectionTotal = subtotal + vat;
                  const vatPct = Math.round(effectiveVatRate * 100);
                  const isContract = section === "CONTRACT";
                  // [수정 2026-09-08] "박싱 해서 구분을 해주고.. 지금은 구분 너무 약한거
                  // 같아" — 옅은(border/25) 테두리로는 두 박스가 잘 갈라져 보이지
                  // 않는다. 굵은 실선 테두리(border-2)로 각 박스 자체를 뚜렷하게
                  // 감싸고, 색도 위 태그와 맞춘다(대관료=노랑, 추후정산=회색).
                  return (
                    <div
                      key={section}
                      className={[
                        "mt-4 border-2 bg-surface p-4",
                        isContract ? "border-accent" : "border-muted-strong/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground">
                          {SECTION_LABEL[section]}
                        </p>
                        {/* [부활 2026-09-08] "계약시 결제 노랑색... 변동가능 회색 글씨 좋았어" */}
                        <span
                          className={[
                            "shrink-0 border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                            isContract
                              ? "border-accent bg-accent-soft text-foreground"
                              : "border-border-soft bg-panel-strong text-muted",
                          ].join(" ")}
                        >
                          {SECTION_TAG[section]}
                        </span>
                      </div>
                      {sectionItems.length > 0 && (
                        <dl className="mt-2 border-t border-border/25">
                          {sectionItems.map((item) => (
                            <div
                              key={item.addonId}
                              className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2.5"
                            >
                              <dt className="text-s text-muted">
                                {summaryPanelLineLabel(item)}
                                {/* [수정 2026-09-07] "공연 일수 조정 (...)(초과 4) -> 초과 부분 제거" —
                                  이 줄은 billable이 옵션 초과분이 아니라 라벨에 이미 적힌 "+N일"
                                  자체라서 "(초과 N)"을 덧붙이면 같은 값이 중복 표시된다. 실제
                                  포함 수량 대비 초과분을 보여주는 다른 항목(선택 옵션 등)에서만
                                  이 표기를 쓴다. */}
                                {item.addonId !==
                                  "performance_day_adjustment" &&
                                  item.billable > 0 &&
                                  item.included > 0 && (
                                    <span className="ml-1 text-xs text-muted">
                                      (초과 {item.billable.toLocaleString()})
                                    </span>
                                  )}
                              </dt>
                              <dd className="shrink-0 text-s tabular-nums text-muted">
                                {won(item.amount)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {/* [재개정 2026-09-08] "대관료에도 vat 별도 수수료가 붙고 총 계약금액으로
                        노출되어야지.. 시안대로 해야지" — 박스마다 소계(VAT 별도)·부가세·
                        최종금액(검정 강조 바)을 갖는다. 사용자가 준 와이어프레임 그대로:
                        박스 색은 CONTRACT/ADDITIONAL 구분 없이 같고, 최종 줄만 검정으로
                        강조한다.
                        [수정 2026-09-08] "소계 행 위에 줄은 굵게 하던지 경계를 줘야지..
                        하이라키가 있어야함" — 항목 행 사이의 옅은 구분선(border/25)과
                        같은 굵기로는 "항목 나열"과 "합계 요약"이 한 덩어리로 보인다.
                        여기부터는 굵은 실선(border-foreground)으로 갈라 위계를 준다. */}
                      <dl className="mt-3 border-t-2 border-foreground pt-0.5">
                        <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2">
                          <dt className="text-xs text-muted">
                            소계 (VAT 별도)
                          </dt>
                          <dd className="text-xs tabular-nums text-muted">
                            {won(subtotal)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4 border-b border-border/15 py-2">
                          <dt className="text-xs text-muted">
                            부가세 {vatPct}%
                          </dt>
                          <dd className="text-xs tabular-nums text-muted">
                            {won(vat)}
                          </dd>
                        </div>
                      </dl>
                      {/* [수정 2026-09-08] "계약금액은 노란색으로 컬러 넣어줘" — 대관료
                        박스의 최종금액 줄만 노란 강조로 바꾼다(확정·결제 금액이라는
                        신호). 추후 정산 예정 금액 줄은 검정 그대로 둔다. */}
                      <div
                        className={[
                          "mt-2 flex justify-between px-3 py-2.5 text-s font-bold",
                          isContract
                            ? "bg-accent text-foreground"
                            : "bg-foreground text-background",
                        ].join(" ")}
                      >
                        <span>{SECTION_SUBTOTAL_CAPTION[section]}</span>
                        <span className="tabular-nums">
                          {won(sectionTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {visibleItems.length > 0 && (
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 bg-foreground px-4 py-3.5 text-background">
            <span className="text-s font-bold">{grandTotalLabel}</span>
            <span className="type-display text-h5-m tabular-nums sm:text-h5">
              {won(grandTotal)}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
