import { won } from "@/lib/format";
import type { LineItem, QuoteSelection } from "@/lib/pricing/types";

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

// [개정 2026-08-21] 표는 "항목/수량/단가/금액" 4열로 단순하게 유지한다 — 기본 대관료는
// 패키지 구성을 풀어 헤치지 않고 통으로 한 줄, 그 아래는 신청자가 실제로 고른 옵션만
// 이어 붙인다(패키지 기본 구성을 전부 나열하는 별도 카드/행은 넣지 않음, 2026-08-21
// 확정). 엔진이 자동으로 만드는 기본 요금·할인·유틸리티 라인에는 배지를 달지 않고,
// 신청자가 직접 고른 부대시설에만 "선택 옵션" 배지를, 선택한 수량이 패키지 기본 포함
// 범위 안에 들어 과금이 0원인 경우에만 "기본 포함" 배지를 붙인다.
const CORE_LINE_IDS = new Set([
  "BASE_FEE",
  "package_discount",
  "day_exclusion_discount_prep",
  "day_exclusion_discount_performance",
  "extra_days",
  "performance_day_adjustment",
  "cleaning",
  "utility_bundle",
  "midhall_setup",
  "midhall_loadout_day",
  "midhall_extra_setup_hours",
  "midhall_extra_loadout_hours",
  "midhall_cleaning",
]);

function isCoreLine(item: LineItem): boolean {
  return CORE_LINE_IDS.has(item.addonId) || item.addonId.startsWith("midhall_show_");
}

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
        <LineItemTable title="아레나" items={arenaItems} expectedRevenue={expectedRevenue} dense={dense} />
        <LineItemTable title="중형공연장" items={midHallItems} expectedRevenue={expectedRevenue} dense={dense} />
      </>
    );
  }

  return <LineItemTable items={visibleItems} expectedRevenue={expectedRevenue} dense={dense} />;
}

function LineItemTable({
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
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const cellPad = dense ? "py-1.5" : "py-2.5";
  const textSize = dense ? "text-xs" : "text-s";
  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-s font-bold font-bold text-foreground">{title}</h3>}
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-center text-xs text-muted">
                  선택된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isIncluded = item.included > 0 && item.billable === 0 && item.amount === 0;
                const isOptionalAddon = !isIncluded && !isCoreLine(item);
                return (
                  <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                    <td className={`${cellPad} text-left`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">{item.label}</span>
                        {isIncluded && (
                          <span className="bg-good-soft px-1.5 py-0.5 text-xs font-bold text-good">
                            기본 포함
                          </span>
                        )}
                        {isOptionalAddon && (
                          <span className="bg-warn-soft px-1.5 py-0.5 text-xs font-bold text-warn">
                            선택 옵션
                          </span>
                        )}
                      </div>
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
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2.5 text-right text-s font-bold">
                {title ? `${title} 소계` : "소계"}
              </td>
              <td className="pt-2.5 text-right text-s font-bold tabular-nums">{won(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
