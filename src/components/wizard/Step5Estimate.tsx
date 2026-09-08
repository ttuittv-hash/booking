"use client";

import type { ReactNode } from "react";
import { won } from "@/lib/format";
import { findPackage } from "@/lib/pricing/rateTableUtils";
import type { EstimatedQuote, QuoteSelection, RateTable } from "@/lib/pricing/types";
import { useWizardText } from "@/lib/content/wizardText";
import { QuoteLineItemsReport } from "@/components/QuoteLineItemsReport";

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
  /** [신규 2026-09-08] 「추후 정산 예정 금액」 박스와 「소계」 박스 사이에 끼우는 블록 —
   *  대관 경합 옵션(티켓 매출 RS)이 최종 제출 화면에서 이리로 옮겨왔다(nora, 9/8 저녁). */
  beforeTotals?: ReactNode;
}) {
  const { t } = useWizardText();
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

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>

      {/* [삭제 2026-09-08] "~12,000석 규모 · 2027.7 2주차 · 총 6일 · 관객 5,000명"
          요약 줄을 뺐다 — 아래 QuoteLineItemsReport가 공간·항목별로 이미 다 보여줘서
          중복이었다. */}
      {/* [개정 2026-09-08] "예상 대관료도 실시간 대관신청내역 구성과 같아야지 —
          아레나/중형 크게 구분하고 그 안에 대관료 박스·추가옵션. 소계. 총금액" —
          여기서부터 아래 총금액까지는 SummaryPanel(실시간 대관신청내역)과 구조를
          맞춘다: 공간별 대관료/추가 옵션 박스(QuoteLineItemsReport가 공간별로 이미
          나눠 보여준다) → 전체 소계(VAT 별도) → 부가세 → 총금액, 이 순서 하나뿐이다.
          예전엔 이 아래에 "총 대관료"/"총 옵션비용"(공간을 합친 값)을 한 번 더
          보여줬는데, SummaryPanel에는 없는 줄이라 두 화면 구성이 어긋났다 — 뺐다. */}
      <QuoteLineItemsReport
        selection={selection}
        lineItems={quote.lineItems}
        expectedRevenue={selection.expectedRevenue ?? 0}
      />

      {beforeTotals && <div className="mt-6">{beforeTotals}</div>}

      <div className="mt-6 border border-border bg-panel/40 p-5">
        <div className="flex justify-between text-s text-muted">
          <span>{t("estimate.subtotalLabel", "소계 (VAT 별도)")}</span>
          <span className="tabular-nums">{won(quote.subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-s text-muted">
          <span>{t("estimate.vatLabel", "부가세 10%")}</span>
          <span className="tabular-nums">{won(quote.vat)}</span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-s font-bold">{t("estimate.totalLabel", "총금액")}</span>
          <span className="text-h6-m sm:text-h6 font-bold tabular-nums">{won(quote.total)}</span>
        </div>
      </div>

      {/* [삭제 2026-09-08] "이 메시지 삭제해줘" — 유틸리티 정산 안내·예상 금액 고지·
          동시 대관 합산 안내 문구를 뺐다. */}

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
