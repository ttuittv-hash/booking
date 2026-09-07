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
}: {
  rateTable: RateTable;
  quote: EstimatedQuote;
  selection: QuoteSelection;
  title: ReactNode;
}) {
  const { t } = useWizardText();
  const pkg = findPackage(rateTable, selection.packageId);
  const hasMidHall = Object.keys(selection.midHallDays).length > 0;
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

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

      {/* 고지문은 색면 박스가 아니라 작은 글씨다 — 박스를 두르면 금액표와 무게가 비슷해져
          어느 쪽이 결과인지 흐려진다. 2026-09-02 부터 "예상 금액" 고지는 여기 한 곳이다
          (사이드바 요약에 있던 같은 문구는 뺐다 — 값이 움직일 때마다 보이는 자리에 경고를
          붙여 두면 읽히지 않는 문구가 된다) */}
      <p className="mt-6 text-xs leading-5 text-muted">
        {quote.meteredNotice} {t("estimate.estimateNoticePrefix", "본 금액은")}{" "}
        <b className="font-bold text-foreground">{t("estimate.estimateNoticeEmphasis", "예상")}</b>
        {t("estimate.estimateNoticeSuffix", "이며 확정 금액이 아닙니다.")}
        {isSimultaneous &&
          ` ${t(
            "estimate.simultaneousSumNote",
            "위 금액은 아레나 + 중형공연장 합산입니다(할인 없이 두 소계를 단순 합산).",
          )}`}
      </p>

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
