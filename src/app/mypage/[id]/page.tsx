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
import { DEFAULT_VENUE_ID, VENUES, type QuoteSelection } from "@/lib/pricing/types";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { QuoteApplicationDetail } from "@/components/QuoteApplicationDetail";
import { QuoteLineItemsReport } from "@/components/QuoteLineItemsReport";

function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
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

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage" />

          <div className="min-w-0 max-w-4xl flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[22px] font-semibold">{quote.id}</h1>
              <div className="flex items-center gap-3">
                {quote.status === "ESTIMATE" && user.role !== "ADMIN" && (
                  <Link
                    href={`/apply/edit/${quote.id}`}
                    className="text-[12.5px] font-medium text-accent hover:underline"
                  >
                    신청 내용 수정
                  </Link>
                )}
                <Link
                  href={`/print/${quote.id}`}
                  target="_blank"
                  className="text-[12.5px] font-medium text-accent hover:underline"
                >
                  인쇄 / PDF 저장
                </Link>
                <span className="text-[12.5px] text-muted">
                  {STAGE_LABEL[quote.status]}
                </span>
              </div>
            </div>
    
            <p className="mt-1.5 text-[13.5px] text-muted">
              {quote.selection.bookingMode === "SIMULTANEOUS" ? (
                <>
                  아레나 {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                  {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                  {quote.selection.expectedAudience.toLocaleString()}명
                  <br />
                  중형공연장 {midHallSummaryLine(quote.selection)}
                </>
              ) : quote.selection.venueId === "medium-hall" ? (
                <>중형공연장 · {midHallSummaryLine(quote.selection)}</>
              ) : (
                <>
                  {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-"} ·{" "}
                  {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                  {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                  {quote.selection.expectedAudience.toLocaleString()}명
                </>
              )}
            </p>

            <div className="mt-6">
              <h2 className="text-[15px] font-semibold">신청 내역 상세</h2>
              <p className="mt-1 text-[12px] text-muted">
                대관 신청 시 탭별로 입력한 값입니다. 항목을 눌러 펼쳐보세요.
              </p>
              <div className="mt-3">
                <QuoteApplicationDetail selection={quote.selection} rateTable={rateTable} />
              </div>
            </div>

            <section className="mt-6 rounded border border-border bg-background p-6">
              <h2 className="text-[15px] font-semibold">① 신청 예상금액 · 산출내역</h2>
              {/* Bowl 사용료·유틸리티(HIDDEN)는 관리자에게만 항목·금액을 노출한다 — 신청자
                  본인에게는 행 자체를 숨기고, 소계/VAT/합계는 quote 전체 lineItems 기준
                  값을 그대로 쓴다. 패키지 기본 구성(대기실·트러스 등)도 위저드(Step5Estimate)와
                  동일하게 QuoteLineItemsReport로 상세히 보여준다. */}
              <QuoteLineItemsReport
                rateTable={rateTable}
                selection={quote.selection}
                lineItems={quote.lineItems}
                expectedRevenue={quote.selection.expectedRevenue ?? 0}
                showHidden={user.role === "ADMIN"}
              />
              <div className="mt-4 flex justify-end gap-8 text-[13px]">
                <span className="text-muted">소계 {won(quote.subtotal)}</span>
                <span className="text-muted">VAT {won(quote.vat)}</span>
                <span className="font-semibold">합계 {won(quote.total)}</span>
              </div>
            </section>
    
            {quote.contract && (
              <section className="mt-6 rounded border border-border bg-panel/60 p-6">
                <h2 className="text-[15px] font-semibold">② 계약금액 확정됨</h2>
                <ul className="mt-3 space-y-1.5 text-[13px]">
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
                  <span className="text-[13px] text-muted">
                    확정일시 {new Date(quote.contract.decidedAt).toLocaleString("ko-KR")}
                  </span>
                  <span className="text-[18px] font-semibold tabular-nums">
                    {won(quote.contract.contractTotal)}
                  </span>
                </div>
              </section>
            )}
    
            {quote.contract && (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ContractSignaturePanel quoteId={quote.id} signature={signature} viewerRole="APPLICANT" />
                <TaxInvoicePanel
                  quoteId={quote.id}
                  purpose="CONTRACT"
                  title="세금계산서 (계약금)"
                  invoice={contractInvoice}
                  viewerRole="APPLICANT"
                />
              </div>
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
              <section className="mt-6 rounded border border-good/30 bg-good-soft p-6">
                <h2 className="text-[15px] font-semibold text-good">③ 최종 정산 완료</h2>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[13px] text-good/80">
                    확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                  </span>
                  <span className="text-[20px] font-semibold tabular-nums text-good">
                    {won(quote.settlement.finalTotal)}
                  </span>
                </div>
                <SettlementMutualConfirm quoteId={quote.id} settlement={quote.settlement} viewerRole="APPLICANT" />
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
    
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <DepositPanel quoteId={quote.id} deposit={deposit} viewerRole="APPLICANT" />
              <AttachmentsPanel quoteId={quote.id} attachments={attachments} />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
