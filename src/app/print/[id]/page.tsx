import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { findUserById, getQuoteById } from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
} from "@/lib/pricing/types";
import { PrintButton } from "@/components/PrintButton";
import { QuoteLineItemsReport } from "@/components/QuoteLineItemsReport";

export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (!(await canAccessQuote(user, quote))) notFound();

  const applicant = await findUserById(quote.applicantId);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-s text-foreground">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <span className="text-s text-muted">
          브라우저 인쇄 대화상자에서 대상을 &quot;PDF로 저장&quot;으로 선택하면
          PDF 파일로 저장됩니다.
        </span>
        <PrintButton />
      </div>

      <header className="flex items-center justify-between border-b-2 border-foreground pb-4">
        <div>
          <div className="text-[20px] font-bold tracking-tight">
            SEOUL ARENA
          </div>
          <div className="mt-0.5 text-xs text-muted">
            대관 신청서 (예상 견적 기준)
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div>신청번호 {quote.id}</div>
          <div>
            신청일시 {new Date(quote.createdAt).toLocaleString("ko-KR")}
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            신청자 정보
          </h2>
          <dl className="mt-2 space-y-1">
            <Row label="담당자" value={applicant?.name ?? "-"} />
            <Row label="회사/기획사" value={applicant?.companyName ?? "-"} />
            <Row label="이메일" value={applicant?.email ?? "-"} />
          </dl>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            대관 일정
          </h2>
          <dl className="mt-2 space-y-1">
            <Row
              label="공간"
              value={
                quote.selection.bookingMode === "SIMULTANEOUS"
                  ? "아레나 + 중형공연장 (동시 대관)"
                  : (VENUES.find(
                      (v) =>
                        v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID),
                    )?.name ?? "-")
              }
            />
            {(quote.selection.venueId !== "medium-hall" ||
              quote.selection.bookingMode === "SIMULTANEOUS") && (
              <>
                <Row
                  label="주차 (아레나)"
                  value={`${quote.selection.week.year}년 ${quote.selection.week.month}월 ${quote.selection.week.weekOfMonth}주차`}
                />
                <Row
                  label="총 대관일수 (아레나)"
                  value={`${totalRentalDays(quote.selection)}일`}
                />
                <Row
                  label="예상 관객 (아레나)"
                  value={`${quote.selection.expectedAudience.toLocaleString()}명`}
                />
              </>
            )}
            {(quote.selection.venueId === "medium-hall" ||
              quote.selection.bookingMode === "SIMULTANEOUS") && (
              <>
                <Row
                  label="대관일수 (중형)"
                  value={`${Object.keys(quote.selection.midHallDays).length}일`}
                />
                <Row
                  label="예상 관객 (중형)"
                  value={`${quote.selection.secondaryAudience.toLocaleString()}명`}
                />
              </>
            )}
          </dl>
        </div>
      </section>

      {quote.selection.performanceInfo && (
        <section className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
              공연 정보
            </h2>
            <dl className="mt-2 space-y-1">
              <Row
                label="공연(행사)명"
                value={quote.selection.performanceInfo.eventName || "-"}
              />
              <Row
                label="아티스트"
                value={quote.selection.performanceInfo.artist || "-"}
              />
              <Row
                label="주최·주관·기획"
                value={quote.selection.performanceInfo.organizer || "-"}
              />
              <Row
                label="행사규모"
                value={quote.selection.performanceInfo.eventScale || "-"}
              />
            </dl>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
              공연 구성
            </h2>
            <dl className="mt-2 space-y-1">
              <Row
                label="행사유형"
                value={
                  quote.selection.performanceInfo.eventTypes.length
                    ? quote.selection.performanceInfo.eventTypes
                        .map((t) => EVENT_TYPE_LABEL[t])
                        .join(", ")
                    : "-"
                }
              />
              <Row
                label="무대형태"
                value={
                  quote.selection.performanceInfo.stageTypes.length
                    ? quote.selection.performanceInfo.stageTypes
                        .map((t) => STAGE_TYPE_LABEL[t])
                        .join(", ")
                    : "-"
                }
              />
              <Row
                label="객석형태"
                value={
                  quote.selection.performanceInfo.seatingTypes.length
                    ? quote.selection.performanceInfo.seatingTypes
                        .map((t) => SEATING_TYPE_LABEL[t])
                        .join(", ")
                    : "-"
                }
              />
              <Row
                label="수납식 객석 사용여부"
                value={
                  quote.selection.performanceInfo.retractableSeatUse
                    ? RETRACTABLE_SEAT_USE_LABEL[
                        quote.selection.performanceInfo.retractableSeatUse
                      ]
                    : "-"
                }
              />
            </dl>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
          산출내역서
        </h2>
        {/* Bowl 사용료·유틸리티(HIDDEN)는 관리자에게만 항목·금액을 노출한다 — 신청자에게는
            행 자체를 숨기고, 소계/VAT/합계는 quote 전체 lineItems 기준 값을 그대로 쓴다.
            위저드·마이페이지와 동일한 QuoteLineItemsReport를 재사용한다. */}
        <QuoteLineItemsReport
          selection={quote.selection}
          lineItems={quote.lineItems}
          expectedRevenue={quote.selection.expectedRevenue ?? 0}
          showHidden={user.role === "ADMIN"}
          dense
        />
        <div className="mt-3 flex justify-end gap-8">
          <span className="text-muted">
            소계(VAT 별도) {won(quote.subtotal)}
          </span>
          <span className="text-muted">VAT {won(quote.vat)}</span>
          <span className="font-bold">신청 예상금액 {won(quote.total)}</span>
        </div>
      </section>

      {quote.contract && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            계약금액
          </h2>
          <ul className="mt-2 space-y-1">
            {quote.contract.adjustments.map((a, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {a.label} {a.reason && `(${a.reason})`}
                </span>
                <span className="tabular-nums">{won(a.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
            <span>
              계약금액 (확정일{" "}
              {new Date(quote.contract.decidedAt).toLocaleDateString("ko-KR")})
            </span>
            <span className="tabular-nums">
              {won(quote.contract.contractTotal)}
            </span>
          </div>
        </section>
      )}

      {quote.settlement && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            최종 정산금액
          </h2>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
            <span>
              정산금액 (확정일{" "}
              {new Date(quote.settlement.decidedAt).toLocaleDateString("ko-KR")}
              )
            </span>
            <span className="tabular-nums">
              {won(quote.settlement.finalTotal)}
            </span>
          </div>
        </section>
      )}

      <p className="mt-10 border-t border-border pt-4 text-xs leading-5 text-muted">
        {quote.meteredNotice} 본 문서의 &quot;신청 예상금액&quot;은 확정 금액이
        아니며, 계약금액·정산금액이 확정되기 전까지는 참고용입니다. 요금표 버전:{" "}
        {quote.rateTableVersion}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
