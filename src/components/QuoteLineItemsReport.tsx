import { won } from "@/lib/format";
import { arenaCompositionTiles, baseCompositionTiles, findPackage, packagesForVenue } from "@/lib/pricing/rateTableUtils";
import type { LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

// [개정 2026-08-21, 시안 반영] 표를 "항목/수량/단가/금액" 4열로 단순화하면서, 기존
// "신청/기본포함/과금수량" 3개 열이 담던 정보는 항목명 옆 배지로 옮긴다 — 엔진이 자동으로
// 만드는 기본 요금·할인·유틸리티 라인은 배지를 달지 않고, 신청자가 직접 고른 부대시설만
// "선택 옵션"으로 표시한다.
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

// [개정 2026-08-21, 시안 반영] "기본 포함" 구성(대기실·트러스 등)을 별도 카드로 떼어
// 보여주지 않고, 과금 표 안에 "기본 포함" 배지가 붙은 행으로 함께 넣는다 — 시안처럼
// 표 하나로 전체 산출내역(기본 대관료 → 기본 포함 항목 → 선택 옵션)을 다 보여준다.
interface IncludedRow {
  key: string;
  label: string;
  quantity: string;
}

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
type Row = { kind: "charge"; item: LineItem } | { kind: "included"; row: IncludedRow };

// [공유 2026-08-20] 위저드(Step5Estimate) · 마이페이지 신청 상세 · 인쇄용 신청서, 세 화면
// 모두 "선택한 패키지에 이미 포함된 기본 구성" + "과금 항목"을 동일한 표 하나로 상세
// 노출해야 한다는 요청에 따라, 표 렌더링을 이 한 컴포넌트로 공유한다 — 세 화면이 서로
// 다른 상세도로 보이는 것을 막는다.
export function QuoteLineItemsReport({
  rateTable,
  selection,
  lineItems,
  expectedRevenue,
  showHidden = false,
  dense = false,
}: {
  rateTable: RateTable;
  selection: QuoteSelection;
  lineItems: LineItem[];
  expectedRevenue: number;
  showHidden?: boolean;
  dense?: boolean;
}) {
  const pkg = findPackage(rateTable, selection.packageId);
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const midHallPkg = packagesForVenue(rateTable, "medium-hall")[0];
  const arenaIncludedRows: IncludedRow[] = pkg
    ? arenaCompositionTiles(pkg, rateTable).map((t) => ({ key: `included_${t.label}`, label: t.label, quantity: t.value }))
    : [];
  const midHallIncludedRows: IncludedRow[] =
    midHallPkg && hasMidHall
      ? baseCompositionTiles(midHallPkg, rateTable, { includeSchedule: false }).map((t) => ({
          key: `included_midhall_${t.label}`,
          label: t.label,
          quantity: t.value,
        }))
      : [];

  const visibleItems = lineItems.filter((item) => item.visibility !== "HIDDEN" || showHidden);
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);

  if (isSimultaneous) {
    return (
      <>
        <LineItemTable title="아레나" items={arenaItems} includedRows={arenaIncludedRows} expectedRevenue={expectedRevenue} dense={dense} />
        <LineItemTable
          title="중형공연장"
          items={midHallItems}
          includedRows={midHallIncludedRows}
          expectedRevenue={expectedRevenue}
          dense={dense}
        />
      </>
    );
  }

  return (
    <LineItemTable
      items={visibleItems}
      includedRows={pkg ? arenaIncludedRows : midHallIncludedRows}
      expectedRevenue={expectedRevenue}
      dense={dense}
    />
  );
}

function LineItemTable({
  title,
  items,
  includedRows,
  expectedRevenue,
  dense,
}: {
  title?: string;
  items: LineItem[];
  includedRows: IncludedRow[];
  expectedRevenue: number;
  dense: boolean;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const cellPad = dense ? "py-1.5" : "py-2.5";
  const textSize = dense ? "text-[12.5px]" : "text-[13px]";

  // 기본 대관료(있다면 첫 행) 바로 다음에 "기본 포함" 행을 끼워 넣고, 나머지 과금 항목은
  // 그 뒤에 이어 붙인다 — 시안 순서(기본 대관료 → 기본 포함 → 선택 옵션)와 맞춘다.
  const rows: Row[] = [
    ...items.slice(0, 1).map((item): Row => ({ kind: "charge", item })),
    ...includedRows.map((row): Row => ({ kind: "included", row })),
    ...items.slice(1).map((item): Row => ({ kind: "charge", item })),
  ];

  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-[14.5px] font-semibold text-foreground">{title}</h3>}
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${textSize}`}>
          <thead>
            <tr className="border-b border-border text-[11.5px] font-medium text-muted">
              <th className="py-2 text-left">항목</th>
              <th className="py-2 text-right">수량</th>
              <th className="py-2 text-right">단가</th>
              <th className="py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-center text-[12.5px] text-muted">
                  선택된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                if (row.kind === "included") {
                  return (
                    <tr key={row.row.key} className="border-b border-border/70 tabular-nums">
                      <td className={`${cellPad} text-left`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{row.row.label}</span>
                          <span className="rounded-sm bg-good-soft px-1.5 py-0.5 text-[10px] font-semibold text-good">
                            기본 포함
                          </span>
                        </div>
                      </td>
                      <td className={`${cellPad} text-right`}>{row.row.quantity}</td>
                      <td className={`${cellPad} text-right text-good`}>포함</td>
                      <td className={`${cellPad} text-right font-semibold text-good`}>포함</td>
                    </tr>
                  );
                }
                const item = row.item;
                const isOptionalAddon = !isCoreLine(item);
                return (
                  <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                    <td className={`${cellPad} text-left`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{item.label}</span>
                        {isOptionalAddon && (
                          <span className="rounded-sm bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn">
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
                    <td className={`${cellPad} text-right`}>
                      {item.pricingType === "REVENUE_PERCENT" ? "-" : won(item.unitPrice)}
                    </td>
                    <td className={`${cellPad} text-right font-semibold`}>{won(item.amount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2.5 text-right text-[13px] font-semibold">
                {title ? `${title} 소계` : "소계"}
              </td>
              <td className="pt-2.5 text-right text-[13px] font-semibold tabular-nums">{won(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
