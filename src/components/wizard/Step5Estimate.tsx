"use client";

import type { ReactNode } from "react";
import { won } from "@/lib/format";
import { findPackage } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";
import type { ContractSection } from "@/lib/pricing/lineItemGroups";
import { useWizardText } from "@/lib/content/wizardText";
import { defaultVenueName, venueLabelKey } from "@/lib/content/venueLabels";
import { QuoteSectionBox, quoteSectionBoxes } from "./SummaryPanel";

/**
 * 예상 대관료(STEP 8).
 *
 * [전면 개정 2026-09-08 밤] "2번째처럼 변경되었으면 좋겠어" — 오른쪽 실시간 대관신청
 * 내역과 **같은 박스**(QuoteSectionBox)를 쓰되, 동시 대관이면 아레나·중형공연장을
 * 나란히(두 열) 놓고 공간이 하나면 한 열만 그린다. 순서는
 *   대관료(공간별) → 총계약 금액 → 추후 정산 예정 금액(공간별) → 추후 정산 예정 금액 합계
 *   → 티켓 매출 RS(beforeTotals)
 * 이다. 예전의 항목/세부내역/금액 3열 표(QuoteLineItemsReport)는 마이페이지·인쇄용에만 남는다.
 */
export function Step5Estimate({
  rateTable,
  quote,
  selection,
  title,
  beforeTotals,
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
  title: ReactNode;
  /** 티켓 매출 RS 박스 — 맨 아래에 놓는다(이름은 처음 자리 때 것). */
  beforeTotals?: ReactNode;
}) {
  const { t, tStr } = useWizardText();
  const pkg = findPackage(rateTable, selection.packageId);
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;

  if (!pkg && !hasMidHall) {
    return (
      <section>
        <p className="text-s text-muted">
          {t("estimate.pickPackageOrScheduleFirst", "먼저 1단계에서 패키지를 선택하거나 중형공연장 일정을 선택하세요.")}
        </p>
      </section>
    );
  }

  const { groups, boxes, vatPct } = quoteSectionBoxes(quote);
  const multi = groups.length > 1;
  // [수정 2026-09-08 밤] "하나여도 아레나인지 표시되면 좋겠다" — 공간이 하나일 때도 머리글을
  // 그린다. 이름은 고른 공간(아레나·중형공연장·올인원) 기준, 백오피스 공간명 문구를 따른다.
  const singleVenueName = selection.venueId
    ? tStr(venueLabelKey(selection.venueId), defaultVenueName(selection.venueId))
    : null;

  function renderSection(section: ContractSection) {
    const sectionBoxes = boxes.filter((b) => b.section === section);
    return (
      <div className={multi ? "grid grid-cols-1 gap-6 md:grid-cols-2" : ""}>
        {sectionBoxes.map((box) => (
          <div key={`${box.venue ?? "single"}-${section}`}>
            {(multi || singleVenueName) && (
              <div className="border-b-2 border-foreground pb-2 text-center text-s font-bold">
                {multi ? box.venueName : singleVenueName}
              </div>
            )}
            <QuoteSectionBox
              section={section}
              sectionItems={box.sectionItems}
              subtotal={box.subtotal}
              vat={box.vat}
              vatPct={vatPct}
              tone="report"
            />
          </div>
        ))}
      </div>
    );
  }

  function renderTotal(section: ContractSection, label: ReactNode) {
    const sectionBoxes = boxes.filter((b) => b.section === section);
    const subtotal = sectionBoxes.reduce((s, b) => s + b.subtotal, 0);
    const vat = sectionBoxes.reduce((s, b) => s + b.vat, 0);
    return (
      <div className="mt-4 border border-border bg-panel/40 p-5">
        <div className="flex justify-between text-s text-muted">
          <span>{t("estimate.subtotalLabel", "소계 (VAT 별도)")}</span>
          <span className="tabular-nums">{won(subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-s text-muted">
          <span>
            {t("estimate.vatLabel", "부가세")} {vatPct}%
          </span>
          <span className="tabular-nums">{won(vat)}</span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-s font-bold">{label}</span>
          <span className="text-h6-m sm:text-h6 font-bold tabular-nums">{won(subtotal + vat)}</span>
        </div>
      </div>
    );
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>

      {/* 1. 대관료 → 총계약 금액 */}
      <div className="mt-6">{renderSection("CONTRACT")}</div>
      {renderTotal("CONTRACT", t("estimate.contractTotalLabel", "총계약 금액"))}

      {/* 2. 추후 정산 예정 금액 → 합계 */}
      <div className="mt-8">{renderSection("ADDITIONAL")}</div>
      {renderTotal("ADDITIONAL", t("estimate.settlementTotalLabel", "추후 정산 예정 금액 합계"))}

      {/* 3. 티켓 매출 RS */}
      {beforeTotals && <div className="mt-8">{beforeTotals}</div>}

      {quote.blockingIssues.length > 0 && (
        <div className="mt-4 text-xs leading-5 text-muted">
          <p className="font-bold text-foreground">
            {t("estimate.blockingIssuesHeading", "운영자 확인이 필요해 아직 신청서를 제출할 수 없습니다.")}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {quote.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
