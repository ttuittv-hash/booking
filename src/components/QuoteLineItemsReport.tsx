import type { ReactNode } from "react";
import { won } from "@/lib/format";
import {
  arenaCompositionTiles,
  baseCompositionTiles,
  findPackage,
  packagesForVenue,
} from "@/lib/pricing/rateTableUtils";
import type { LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { BaseCompositionCard } from "./wizard/BaseCompositionCard";

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

// [공유 2026-08-20] 위저드(Step5Estimate) · 마이페이지 신청 상세 · 인쇄용 신청서, 세 화면
// 모두 "선택한 패키지에 이미 포함된 기본 구성" + "과금 항목"을 동일하게 상세 노출해야 한다는
// 요청에 따라, 표 렌더링(아레나/중형 분리 + 기본 포함 카드)을 이 한 컴포넌트로 공유한다 —
// 세 화면이 서로 다른 상세도로 보이는 것을 막는다.
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
  const arenaTiles = pkg ? arenaCompositionTiles(pkg, rateTable) : [];
  const midHallTiles = midHallPkg && hasMidHall ? baseCompositionTiles(midHallPkg, rateTable, { includeSchedule: false }) : [];

  const visibleItems = lineItems.filter((item) => item.visibility !== "HIDDEN" || showHidden);
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);

  if (isSimultaneous) {
    return (
      <>
        <LineItemTable
          title="아레나"
          items={arenaItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
          composition={
            arenaTiles.length > 0 && (
              <BaseCompositionCard
                tiles={arenaTiles}
                note="기본 대관료에 포함된 구성 — 관객 규모와 무관하게 전 패키지 동일하게 제공됩니다"
              />
            )
          }
        />
        <LineItemTable
          title="중형공연장"
          items={midHallItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
          composition={
            midHallTiles.length > 0 && (
              <BaseCompositionCard
                tiles={midHallTiles}
                note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
              />
            )
          }
        />
      </>
    );
  }

  return (
    <LineItemTable
      items={visibleItems}
      expectedRevenue={expectedRevenue}
      dense={dense}
      composition={
        pkg
          ? arenaTiles.length > 0 && (
              <BaseCompositionCard
                tiles={arenaTiles}
                note="기본 대관료에 포함된 구성 — 관객 규모와 무관하게 전 패키지 동일하게 제공됩니다"
              />
            )
          : midHallTiles.length > 0 && (
              <BaseCompositionCard
                tiles={midHallTiles}
                note="대관료에 이미 포함된 구성 — 예약 일수와 무관하게 동일하게 제공됩니다"
              />
            )
      }
    />
  );
}

function LineItemTable({
  title,
  items,
  expectedRevenue,
  composition,
  dense,
}: {
  title?: string;
  items: LineItem[];
  expectedRevenue: number;
  composition?: ReactNode;
  dense: boolean;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const cellPad = dense ? "py-1.5" : "py-2.5";
  const textSize = dense ? "text-[12.5px]" : "text-[13px]";
  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-[14.5px] font-semibold text-foreground">{title}</h3>}
      {composition}
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${textSize}`}>
          <thead>
            <tr className="border-b border-border text-[11.5px] font-medium text-muted">
              <th className="py-2 text-left">항목</th>
              <th className="py-2 text-right">신청</th>
              <th className="py-2 text-right">기본포함</th>
              <th className="py-2 text-right">과금수량</th>
              <th className="py-2 text-right">단가</th>
              <th className="py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-center text-[12.5px] text-muted">
                  선택된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                  <td className={`${cellPad} text-left font-medium`}>{item.label}</td>
                  <td className={`${cellPad} text-right`}>
                    {item.pricingType === "REVENUE_PERCENT"
                      ? `${won(expectedRevenue)} × ${item.unitPrice}%`
                      : item.requested.toLocaleString()}
                  </td>
                  <td className={`${cellPad} text-right`}>{item.included || "-"}</td>
                  <td className={`${cellPad} text-right`}>
                    {item.pricingType === "REVENUE_PERCENT" ? "-" : item.billable.toLocaleString()}
                  </td>
                  <td className={`${cellPad} text-right`}>
                    {item.pricingType === "REVENUE_PERCENT" ? "-" : won(item.unitPrice)}
                  </td>
                  <td className={`${cellPad} text-right font-semibold`}>{won(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-2.5 text-right text-[13px] font-semibold">
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
