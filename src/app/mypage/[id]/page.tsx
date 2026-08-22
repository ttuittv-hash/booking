import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import {
  getContractSignatureByQuoteId,
  getDepositByQuoteId,
  getFacilityMeetingByQuoteId,
  getQuoteById,
  getRateTableByVersion,
  getTaxInvoice,
  getTicketOpenByQuoteId,
  listAttachments,
} from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  VENUES,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { QuoteApplicationDetail } from "@/components/QuoteApplicationDetail";
import { QuoteLineItemsReport } from "@/components/QuoteLineItemsReport";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter(
    (d) => selection.midHallDays[d].role === "SETUP",
  ).length;
  const performanceDates = dates.filter(
    (d) => selection.midHallDays[d].role === "PERFORMANCE",
  );
  const shows = performanceDates.reduce(
    (sum, d) => sum + selection.midHallDays[d].shows,
    0,
  );
  return `총 ${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수 (예상 견적)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
};

export default async function MyQuoteDetailPage({
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

  const [
    depositRaw,
    attachments,
    signatureRaw,
    contractInvoiceRaw,
    settlementInvoiceRaw,
    ticketOpenRaw,
    facilityMeetingRaw,
    ticketOpenMaterials,
    facilityMeetingMaterials,
    rateTable,
  ] = await Promise.all([
    getDepositByQuoteId(id),
    listAttachments(id, null),
    getContractSignatureByQuoteId(id),
    getTaxInvoice(id, "CONTRACT"),
    getTaxInvoice(id, "SETTLEMENT"),
    getTicketOpenByQuoteId(id),
    getFacilityMeetingByQuoteId(id),
    listAttachments(id, "TICKET_OPEN"),
    listAttachments(id, "FACILITY_MEETING"),
    getRateTableByVersion(quote.rateTableVersion),
  ]);
  const deposit = depositRaw ?? null;
  const signature = signatureRaw ?? null;
  const contractInvoice = contractInvoiceRaw ?? null;
  const settlementInvoice = settlementInvoiceRaw ?? null;
  const ticketOpen = ticketOpenRaw ?? null;
  const facilityMeeting = facilityMeetingRaw ?? null;

  /* 머리글 리드 — 공간·주차·일수·관객을 한 줄로 */
  const summaryLine =
    quote.selection.bookingMode === "SIMULTANEOUS" ? (
      <>
        아레나 {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
        {quote.selection.week.weekOfMonth}주차 · 총{" "}
        {totalRentalDays(quote.selection)}일 · 관객{" "}
        {quote.selection.expectedAudience.toLocaleString()}명
        <br />
        중형공연장 {midHallSummaryLine(quote.selection)}
      </>
    ) : quote.selection.venueId === "medium-hall" ? (
      <>중형공연장 · {midHallSummaryLine(quote.selection)}</>
    ) : (
      <>
        {VENUES.find(
          (v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID),
        )?.name ?? "-"}{" "}
        · {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
        {quote.selection.week.weekOfMonth}주차 · 총{" "}
        {totalRentalDays(quote.selection)}일 · 관객{" "}
        {quote.selection.expectedAudience.toLocaleString()}명
      </>
    );

  return (
    <MyPageShell
      user={user}
      active="/mypage"
      en="BOOKING DETAIL"
      ko={quote.id}
      lead={summaryLine}
      actions={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {quote.status === "ESTIMATE" && !quote.review && user.role !== "ADMIN" && (
            <Link
              href={`/apply/edit/${quote.id}`}
              className="text-s font-bold underline underline-offset-4 hover:text-foreground"
            >
              신청 내용 수정
            </Link>
          )}
          <Link
            href={`/print/${quote.id}`}
            target="_blank"
            className="text-s font-bold underline underline-offset-4 hover:text-foreground"
          >
            인쇄 / PDF 저장
          </Link>
          <span className="text-xs text-muted">
            {STAGE_LABEL[quote.status]}
          </span>
        </div>
      }
    >
      <div>
        <h2 className="type-kr-heading text-h5-m sm:text-h5">신청 내역 상세</h2>
        <p className="mt-1 text-xs text-muted">
          대관 신청 시 탭별로 입력한 값입니다. 항목을 눌러 펼쳐보세요.
        </p>
        <div className="mt-3">
          <QuoteApplicationDetail
            selection={quote.selection}
            rateTable={rateTable}
          />
        </div>
      </div>

      <section className="mt-6 border border-border/25 p-6">
        <h2 className="type-kr-heading text-h5-m sm:text-h5">
          ① 신청 예상금액 · 산출내역
        </h2>
        {/* Bowl 사용료·유틸리티(HIDDEN)는 관리자에게만 항목·금액을 노출한다 — 신청자
                  본인에게는 행 자체를 숨기고, 소계/VAT/합계는 quote 전체 lineItems 기준
                  값을 그대로 쓴다. 위저드(Step5Estimate)와 동일한 QuoteLineItemsReport를
                  써서 세 화면의 산출내역이 서로 다르지 않게 한다. */}
        <QuoteLineItemsReport
          selection={quote.selection}
          lineItems={quote.lineItems}
          expectedRevenue={quote.selection.expectedRevenue ?? 0}
          showHidden={user.role === "ADMIN"}
        />
        <div className="mt-4 flex justify-end gap-8 text-s">
          <span className="text-muted">소계 {won(quote.subtotal)}</span>
          <span className="text-muted">VAT {won(quote.vat)}</span>
          <span className="font-bold">합계 {won(quote.total)}</span>
        </div>
      </section>

      {quote.contract && (
        <section className="mt-6 border border-border/25 p-6">
          <h2 className="type-kr-heading text-h5-m sm:text-h5">
            ② 계약금액 확정됨
          </h2>
          <ul className="mt-3 space-y-1.5 text-s">
            {quote.contract.adjustments.map((a, i) => (
              <li key={i} className="flex justify-between text-muted">
                <span>
                  {a.label} {a.reason && `(${a.reason})`}
                </span>
                <span className="tabular-nums">{won(a.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-s text-muted">
              확정일시{" "}
              {new Date(quote.contract.decidedAt).toLocaleString("ko-KR")}
            </span>
            <span className="text-m font-bold tabular-nums">
              {won(quote.contract.contractTotal)}
            </span>
          </div>
        </section>
      )}

      {quote.contract && (
        <>
          {/* 계약 확인사항이 항목 6개짜리 긴 글이라 세금계산서와 반반으로 나누면 글이
              좁게 눌려 읽기 어렵다(2026-08-22) — 전자 날인만 전체 폭을 쓰게 뺀다. */}
          <div className="mt-6">
            <ContractSignaturePanel
              quoteId={quote.id}
              signature={signature}
              viewerRole="APPLICANT"
            />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <TaxInvoicePanel
              quoteId={quote.id}
              purpose="CONTRACT"
              title="세금계산서 (계약금)"
              invoice={contractInvoice}
              viewerRole="APPLICANT"
            />
          </div>
        </>
      )}

      {quote.contract && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <TicketOpenPanel
            quoteId={quote.id}
            depositConfirmed={deposit?.status === "CONFIRMED"}
            ticketOpen={ticketOpen}
            materials={ticketOpenMaterials}
            viewerRole="APPLICANT"
          />
          <FacilityMeetingPanel
            quoteId={quote.id}
            ticketOpenRegistered={!!ticketOpen?.openDate}
            facilityMeeting={facilityMeeting}
            materials={facilityMeetingMaterials}
            viewerRole="APPLICANT"
          />
        </div>
      )}

      {quote.settlement && (
        <section className="mt-6 border-t-2 border-foreground pt-5">
          <h2 className="type-kr-heading text-h6-m text-foreground">③ 최종 정산 완료</h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-s text-muted">
              확정일시{" "}
              {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
            </span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">
              {won(quote.settlement.finalTotal)}
            </span>
          </div>
          <SettlementMutualConfirm
            quoteId={quote.id}
            settlement={quote.settlement}
            viewerRole="APPLICANT"
          />
        </section>
      )}

      {quote.settlement && (
        <div className="mt-6">
          <TaxInvoicePanel
            quoteId={quote.id}
            purpose="SETTLEMENT"
            title="세금계산서 (정산금)"
            invoice={settlementInvoice}
            viewerRole="APPLICANT"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <DepositPanel
          quoteId={quote.id}
          deposit={deposit}
          viewerRole="APPLICANT"
        />
        <AttachmentsPanel quoteId={quote.id} attachments={attachments} />
      </div>
    </MyPageShell>
  );
}
