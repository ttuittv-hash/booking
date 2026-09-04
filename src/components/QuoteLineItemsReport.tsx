import { won } from "@/lib/format";
import type { LineItem, QuoteSelection } from "@/lib/pricing/types";
import {
  FEE_GROUP_LABEL,
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

  const visibleItems = lineItems.filter((item) => item.visibility !== "HIDDEN" || showHidden);
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);

  if (isSimultaneous) {
    return (
      <>
        <VenueLineItemGroup title="아레나" items={arenaItems} expectedRevenue={expectedRevenue} dense={dense} />
        <VenueLineItemGroup title="중형공연장" items={midHallItems} expectedRevenue={expectedRevenue} dense={dense} />
      </>
    );
  }

  return <VenueLineItemGroup items={visibleItems} expectedRevenue={expectedRevenue} dense={dense} />;
}

function VenueLineItemGroup({
  title,
  items,
  expectedRevenue,
  dense,
}: {
  title?: string;
  items: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-s font-bold text-foreground">{title}</h3>}
      <SectionTable section="CONTRACT" items={items} expectedRevenue={expectedRevenue} dense={dense} />
      <SectionTable section="ADDITIONAL" items={items} expectedRevenue={expectedRevenue} dense={dense} />
    </div>
  );
}

// [개정 2026-08-26] "아레나 패키지의 실제 계약금액은 패키지에 대한 내역이고, 옵션
// 선택한 것들은 추가 예상 예산" 요청에 따라 표를 "계약 내역"(기본 대관료·전용
// 사용료)과 "추가 예상 금액"(옵션 사용료) 두 슬롯으로 나눈다. 슬롯 안에서는 기존
// 그룹(기본 대관료/전용 사용료, 또는 옵션) 구분을 그대로 유지한다.
function SectionTable({
  section,
  items,
  expectedRevenue,
  dense,
}: {
  section: ContractSection;
  items: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  const groupKeys = SECTION_GROUPS[section];
  const sectionItems = items.filter((item) => groupKeys.includes(feeGroupOf(item)));
  const subtotal = sectionItems.reduce((sum, item) => sum + item.amount, 0);
  const cellPad = dense ? "py-1.5" : "py-2.5";
  const textSize = dense ? "text-xs" : "text-s";
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-xs font-bold text-foreground">{SECTION_LABEL[section]}</h4>
      <div className="overflow-x-auto">
        <table className={`w-full table-fixed border-collapse ${textSize}`}>
          <colgroup>
            <col />
            <col className="w-[14%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
          </colgroup>
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
                    <tr key={`group-${group}`} className={gi > 0 ? "border-t border-border/25" : undefined}>
                      <td colSpan={3} className="pt-5 pb-1.5 text-left text-xs font-bold break-keep text-foreground">
                        {FEE_GROUP_LABEL[group]}
                      </td>
                      <td className="pt-5 pb-1.5 text-right text-xs font-bold text-muted tabular-nums">
                        {won(groupSubtotal)}
                      </td>
                    </tr>,
                    ...groupItems.map((item) => {
                      const isIncluded = item.included > 0 && item.billable === 0 && item.amount === 0;
                      return (
                        <tr key={item.addonId} className="border-b border-border/25 tabular-nums">
                          <td className={`${cellPad} pl-4 text-left`}>
                            <span className="break-keep font-bold">{item.label}</span>
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
