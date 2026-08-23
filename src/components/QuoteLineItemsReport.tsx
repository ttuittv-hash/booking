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
// 확정).
// [개정 2026-08-23] "선택 옵션"·"기본 포함" 배지는 뺐다 — 이제 기본/전용/옵션 그룹
// 헤더가 이미 그 구분을 보여주므로 항목마다 배지를 또 붙이면 중복이라는 지적
// ("이미 상단에서 기본, 옵션 등으로나누어서 들어가니까 뱃지는 필요없어"). 대신 무상
// 포함이라 과금이 0원인 항목은 단가·금액 칸에 "포함"(녹색)으로만 표시한다.
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

// [개정 2026-08-23] "대관료는 하위 내역으로 나눠서 정리해서 보여줘" 요청에 따라 표를
// 기본 대관료 · 전용 사용료 · 옵션 사용료 3단으로 묶는다.
//  - 기본 대관료: 패키지 대관료 원가(BASE_FEE)와 그에 딸린 할인
//  - 전용 사용료: 준비일/공연일 등 실제 사용 일수에 따라 붙는 요금(추가일·평일제외
//    할인·중형 셋업/철수일 등) — "셋업일, 공연일" 단위로 매겨지는 항목들
//  - 옵션 사용료: 신청자가 직접 고른 선택 옵션(부대시설 등) — 그 외 나머지는 청소비·
//    유틸리티처럼 패키지에 고정으로 딸려오는 항목이라 기본 대관료 쪽에 둔다
type FeeGroup = "BASE" | "EXCLUSIVE" | "OPTION";

const EXCLUSIVE_USAGE_LINE_IDS = new Set([
  "extra_days",
  "performance_day_adjustment",
  "day_exclusion_discount_prep",
  "day_exclusion_discount_performance",
  "midhall_setup",
  "midhall_loadout_day",
  "midhall_extra_setup_hours",
  "midhall_extra_loadout_hours",
]);

function feeGroupOf(item: LineItem): FeeGroup {
  if (!isCoreLine(item)) return "OPTION";
  if (EXCLUSIVE_USAGE_LINE_IDS.has(item.addonId) || item.addonId.startsWith("midhall_show_")) return "EXCLUSIVE";
  return "BASE";
}

const FEE_GROUP_LABEL: Record<FeeGroup, string> = {
  BASE: "기본 대관료",
  EXCLUSIVE: "전용 사용료",
  OPTION: "옵션 사용료",
};
const FEE_GROUP_ORDER: FeeGroup[] = ["BASE", "EXCLUSIVE", "OPTION"];

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
              (() => {
                const activeGroups = FEE_GROUP_ORDER.filter((g) => items.some((item) => feeGroupOf(item) === g));
                return activeGroups.flatMap((group, gi) => {
                  const groupItems = items.filter((item) => feeGroupOf(item) === group);
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
                            <span className="font-bold">{item.label}</span>
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
