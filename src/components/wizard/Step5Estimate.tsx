"use client";

import type { ReactNode } from "react";
import { won } from "@/lib/format";
import {
  arenaCompositionTiles,
  baseCompositionTiles,
  findPackage,
  packagesForVenue,
  totalRentalDays,
} from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, LineItem, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { BaseCompositionCard } from "./BaseCompositionCard";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

// 중형공연장 라인아이템은 addonId가 전부 "midhall"로 시작한다(calculateMidHallQuote.ts) —
// 계산 엔진을 건드리지 않고 화면에서만 아레나/중형으로 갈라 보여주는 데 이 규칙을 쓴다.
function isMidHallLineItem(item: LineItem): boolean {
  return item.addonId.startsWith("midhall");
}

function LineItemTable({
  title,
  items,
  expectedRevenue,
  composition,
}: {
  title?: string;
  items: LineItem[];
  expectedRevenue: number;
  composition?: ReactNode;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="mt-6">
      {title && <h3 className="mb-2 text-[14.5px] font-semibold text-foreground">{title}</h3>}
      {composition}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
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
                  <td className="py-2.5 text-left font-medium">{item.label}</td>
                  <td className="py-2.5 text-right">
                    {item.pricingType === "REVENUE_PERCENT"
                      ? `${won(expectedRevenue)} × ${item.unitPrice}%`
                      : item.requested.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right">{item.included || "-"}</td>
                  <td className="py-2.5 text-right">
                    {item.pricingType === "REVENUE_PERCENT" ? "-" : item.billable.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right">
                    {item.pricingType === "REVENUE_PERCENT" ? "-" : won(item.unitPrice)}
                  </td>
                  <td className="py-2.5 text-right font-semibold">{won(item.amount)}</td>
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

export function Step5Estimate({
  rateTable,
  quote,
  selection,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
}) {
  const pkg = findPackage(rateTable, selection.packageId);
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

  if (!pkg && !hasMidHall) {
    return (
      <section className="rounded border border-border bg-background p-7">
        <p className="text-[13.5px] text-muted">먼저 1단계에서 패키지를 선택하거나 중형공연장 일정을 선택하세요.</p>
      </section>
    );
  }

  const arenaLine = pkg
    ? `${pkg.audienceTier.label} · ${selection.week.year}.${selection.week.month} ${selection.week.weekOfMonth}주차 · 총 ${totalRentalDays(selection)}일 · 관객 ${selection.expectedAudience.toLocaleString()}명`
    : null;
  const midHallLine = midHallSummaryLine(selection);

  const visibleItems = quote.lineItems.filter((item) => item.visibility !== "HIDDEN");
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);
  const arenaVisibleSubtotal = arenaItems.reduce((sum, item) => sum + item.amount, 0);
  const midHallVisibleSubtotal = midHallItems.reduce((sum, item) => sum + item.amount, 0);

  // [개정 2026-08-20] "예상 대관료" 화면은 과금 항목뿐 아니라 선택한 패키지에 이미 포함된
  // 기본 구성(대기실·인터컴·트러스 등)도 상세히 보여준다 — 구성·옵션(STEP2) 패키지 슬롯과
  // 동일한 baseCompositionTiles를 재사용해 두 화면의 산정 내역이 서로 다르지 않게 한다.
  const midHallPkg = packagesForVenue(rateTable, "medium-hall")[0];
  const arenaTiles = pkg ? arenaCompositionTiles(pkg, rateTable) : [];
  const midHallTiles = midHallPkg && hasMidHall ? baseCompositionTiles(midHallPkg, rateTable, { includeSchedule: false }) : [];

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">예상 대관료</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {isSimultaneous ? (
          <>
            아레나 — {arenaLine}
            <br />
            중형공연장 — {midHallLine}
          </>
        ) : (
          arenaLine ?? midHallLine
        )}
      </p>

      {/* Bowl 사용료·유틸리티(HIDDEN)는 아래 합계 계산에는 포함되지만 신청자 화면에는
          항목·금액을 노출하지 않는다 — 그래서 아레나/중형 소계를 각각 더해도 맨 아래
          최종 소계(quote.subtotal, 전체 lineItems 기준)와는 차이가 날 수 있다. */}
      {isSimultaneous ? (
        <>
          <LineItemTable
            title="아레나"
            items={arenaItems}
            expectedRevenue={selection.expectedRevenue ?? 0}
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
            expectedRevenue={selection.expectedRevenue ?? 0}
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
      ) : (
        <LineItemTable
          items={visibleItems}
          expectedRevenue={selection.expectedRevenue ?? 0}
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
      )}

      <div className="mt-6 rounded-sm border border-border bg-panel/40 p-5">
        {isSimultaneous && (
          <div className="mb-3 flex items-center justify-between border-b border-border pb-3 text-[13px]">
            <span className="text-muted">아레나 소계 + 중형공연장 소계</span>
            <span className="tabular-nums text-foreground">
              {won(arenaVisibleSubtotal)} + {won(midHallVisibleSubtotal)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-[13px] text-muted">
          <span>소계 (VAT 별도)</span>
          <span className="tabular-nums">{won(quote.subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-[13px] text-muted">
          <span>부가세 10%</span>
          <span className="tabular-nums">{won(quote.vat)}</span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-[15px] font-semibold">합계</span>
          <span className="text-[19px] font-semibold tabular-nums">{won(quote.total)}</span>
        </div>
      </div>

      <p className="mt-6 rounded border-l-2 border-warn bg-warn-soft px-4 py-3 text-[12.5px] leading-5 text-warn">
        {quote.meteredNotice} 본 금액은 <b>예상</b>이며 확정 금액이 아닙니다.
      </p>

      {quote.blockingIssues.length > 0 && (
        <div className="mt-4 rounded border-l-2 border-warn bg-warn-soft px-4 py-3 text-[12.5px] leading-5 text-warn">
          <p className="font-semibold">운영자 확인이 필요해 아직 신청서를 제출할 수 없습니다.</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {quote.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {isSimultaneous && (
        <div className="mt-4 rounded border-l-2 border-accent bg-accent-soft px-4 py-3 text-[12.5px] leading-5 text-accent">
          위 금액은 <b>아레나 + 중형공연장 합산</b>입니다 (할인 없이 두 소계를 단순 합산).
        </div>
      )}
    </section>
  );
}
