import { won } from "@/lib/format";
import type { LineItem, QuoteSelection } from "@/lib/pricing/types";
import {
  applicantLineLabel,
  FEE_GROUP_LABEL,
  isHiddenFromApplicant,
  SECTION_GROUPS,
  SECTION_LABEL,
  SECTION_SUBTOTAL_LABEL,
  feeGroupOf,
  isMidHallLineItem,
  type ContractSection,
  type FeeGroup,
} from "@/lib/pricing/lineItemGroups";

// [공유 2026-08-20] 위저드(Step5Estimate) · 마이페이지 신청 상세 · 인쇄용 신청서, 세 화면
// 모두 같은 산출내역 표를 보여줘야 한다는 요청에 따라, 표 렌더링을 이 한 컴포넌트로
// 공유한다 — 세 화면이 서로 다른 내용으로 보이는 것을 막는다. 동시 대관은 아레나/중형
// 소계를 각각 보여주고(요청: "아레나·중형 비용이 나눠져서 보여지고"), 최종 합계는 이
// 컴포넌트를 호출하는 화면(Step5Estimate 등)에서 두 소계를 합산해 별도로 보여준다
// (요청: "합산 통합으로도 보여지고").
export function QuoteLineItemsReport({
  selection,
  lineItems,
  expectedRevenue,
  showHidden = false,
  dense = false,
}: {
  selection: QuoteSelection;
  lineItems: LineItem[];
  expectedRevenue: number;
  showHidden?: boolean;
  dense?: boolean;
}) {
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

  // [버그 수정 2026-09-08] "예상 대관료도 실시간 대관신청내역과 같아야지" — 이 표를
  // 확인하던 중 청소비(cleaning)가 여기(위저드 STEP5·마이페이지·인쇄용 신청서)에는
  // 그대로 보이는데 SummaryPanel(실시간 대관신청 내역)에는 안 보이는 것을 발견했다.
  // item.visibility === "HIDDEN" 만 걸러냈을 뿐 청소비·유틸리티처럼 addonId로 감추는
  // 항목(APPLICANT_HIDDEN_LINE_IDS)은 안 걸러지고 있었다 — SummaryPanel과 같은 기준
  // isHiddenFromApplicant()로 통일한다. showHidden=true(운영자 보기, mypage/print)는
  // 예전처럼 전부 보여준다.
  const visibleItems = lineItems.filter((item) => showHidden || !isHiddenFromApplicant(item));
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);
  // [버그 수정 2026-09-08] 청소비·유틸리티처럼 감춘 항목도 실제로는 과금돼 quote.subtotal
  // 에 포함돼 있다(SummaryPanel과 같은 규칙) — 행은 visibleItems 만으로 그리되, 소계
  // 금액은 감추지 않은 전체 lineItems 기준으로 내야 두 화면의 "총 대관료"/"총 옵션비용"
  // 이 어긋나지 않는다.
  const arenaAllItems = lineItems.filter((item) => !isMidHallLineItem(item));
  const midHallAllItems = lineItems.filter(isMidHallLineItem);

  if (isSimultaneous) {
    return (
      <>
        <VenueLineItemGroup
          title="아레나"
          items={arenaItems}
          allItems={arenaAllItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
        />
        <VenueLineItemGroup
          title="중형공연장"
          items={midHallItems}
          allItems={midHallAllItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
        />
      </>
    );
  }

  return (
    <VenueLineItemGroup items={visibleItems} allItems={lineItems} expectedRevenue={expectedRevenue} dense={dense} />
  );
}

function VenueLineItemGroup({
  title,
  items,
  allItems,
  expectedRevenue,
  dense,
}: {
  title?: string;
  items: LineItem[];
  allItems: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-s font-bold text-foreground">{title}</h3>}
      <SectionTable section="CONTRACT" items={items} allItems={allItems} expectedRevenue={expectedRevenue} dense={dense} />
      <SectionTable section="ADDITIONAL" items={items} allItems={allItems} expectedRevenue={expectedRevenue} dense={dense} />
    </div>
  );
}

// [개정 2026-08-26] "아레나 패키지의 실제 계약금액은 패키지에 대한 내역이고, 옵션
// 선택한 것들은 추가 예상 예산" 요청에 따라 표를 "대관료"(기본 대관료·전용
// 사용료)과 "추가 옵션"(옵션 사용료) 두 슬롯으로 나눈다. 슬롯 안에서는 기존
// 그룹(기본 대관료/전용 사용료, 또는 옵션) 구분을 그대로 유지한다.
// [개정 2026-09-08] 라벨을 실시간 요약 패널(SummaryPanel)과 같은 말로 맞췄다
// (lineItemGroups.SECTION_LABEL/SECTION_SUBTOTAL_LABEL 참고).
function SectionTable({
  section,
  items,
  allItems,
  expectedRevenue,
  dense,
}: {
  section: ContractSection;
  items: LineItem[];
  allItems: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  const groupKeys = SECTION_GROUPS[section];
  const sectionItems = items.filter((item) => groupKeys.includes(feeGroupOf(item)));
  // 소계는 감춘 항목(청소비 등)까지 포함한 allItems 기준 — 행은 sectionItems(보이는 것)만 그린다.
  const subtotal = allItems
    .filter((item) => groupKeys.includes(feeGroupOf(item)))
    .reduce((sum, item) => sum + item.amount, 0);
  const cellPad = dense ? "py-1.5" : "py-2.5";
  const textSize = dense ? "text-xs" : "text-s";
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-xs font-bold text-muted">{SECTION_LABEL[section]}</h4>
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${textSize}`}>
          <thead>
            <tr className="border-b border-border text-xs font-bold text-muted">
              <th className="py-2 text-left">항목</th>
              <th className="py-2 text-right">수량</th>
              <th className="py-2 text-right">단가</th>
              <th className="py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {sectionItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-center text-xs text-muted">
                  선택된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              (() => {
                const activeGroups = groupKeys.filter((g: FeeGroup) => sectionItems.some((item) => feeGroupOf(item) === g));
                return activeGroups.flatMap((group, gi) => {
                  const groupItems = sectionItems.filter((item) => feeGroupOf(item) === group);
                  const groupSubtotal = groupItems.reduce((sum, item) => sum + item.amount, 0);
                  return [
                    // 그룹 라벨은 옅은 배경 대신 굵은 텍스트 + 위 여백만으로 구분한다 —
                    // 배경을 칠하면 표 안에서 붕 뜬 "회색 줄"처럼 보인다는 지적(2026-08-23,
                    // "하얗게 들어가게 너무 이상해")에 따른 수정.
                    <tr key={`group-${group}`} className={gi > 0 ? "border-t border-border/60" : undefined}>
                      <td colSpan={3} className="pt-5 pb-1.5 text-left text-xs font-bold text-foreground">
                        {FEE_GROUP_LABEL[group]}
                      </td>
                      <td className="pt-5 pb-1.5 text-right text-xs font-bold text-muted tabular-nums">
                        {won(groupSubtotal)}
                      </td>
                    </tr>,
                    ...groupItems.map((item) => {
                      const isIncluded = item.included > 0 && item.billable === 0 && item.amount === 0;
                      return (
                        <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                          <td className={`${cellPad} pl-4 text-left`}>
                            <span className="font-bold">{applicantLineLabel(item)}</span>
                          </td>
                          <td className={`${cellPad} text-right`}>
                            {item.pricingType === "REVENUE_PERCENT"
                              ? `${won(expectedRevenue)} × ${item.unitPrice}%`
                              : item.requested.toLocaleString()}
                          </td>
                          <td className={`${cellPad} text-right ${isIncluded ? "text-good" : ""}`}>
                            {isIncluded
                              ? "포함"
                              : item.pricingType === "REVENUE_PERCENT"
                                ? "-"
                                : won(item.unitPrice)}
                          </td>
                          <td className={`${cellPad} text-right font-bold ${isIncluded ? "text-good" : ""}`}>
                            {isIncluded ? "포함" : won(item.amount)}
                          </td>
                        </tr>
                      );
                    }),
                  ];
                });
              })()
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2.5 text-right text-s font-bold">
                {SECTION_SUBTOTAL_LABEL[section]}
              </td>
              <td className="pt-2.5 text-right text-s font-bold tabular-nums">{won(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
