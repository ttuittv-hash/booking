import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import {
  getContractSignatureByQuoteId,
  getDepositByQuoteId,
  getFacilityMeetingByQuoteId,
  getQuoteById,
  getTaxInvoice,
  getTicketOpenByQuoteId,
  listAttachments,
} from "@/lib/db";
import { num, won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  Badge,
  Band,
  ButtonLink,
  ComparisonTable,
  PageHeading,
  SpecTable,
  btnClass,
} from "@/components/ui/kit";
import { DEFAULT_VENUE_ID, VENUES, type Quote, type QuoteSelection } from "@/lib/pricing/types";

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

const STAGE_TONE: Record<Quote["status"], "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
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

  // 상세에 필요한 부속 데이터는 한 번에 조회한다 (PostgreSQL 전환 후 전부 async)
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
  ]);
  const deposit = depositRaw ?? null;
  const signature = signatureRaw ?? null;
  const contractInvoice = contractInvoiceRaw ?? null;
  const settlementInvoice = settlementInvoiceRaw ?? null;
  const ticketOpen = ticketOpenRaw ?? null;
  const facilityMeeting = facilityMeetingRaw ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/process" currentUser={user} />
      <Breadcrumb items={[{ label: "대관 신청 현황", href: "/mypage/process" }, { label: quote.id }]} />

      <main className="flex flex-1 flex-col">
        {/* 신청 개요 */}
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title={
              <span className="flex flex-wrap items-center gap-4">
                <span>{quote.id}</span>
                <Badge tone={STAGE_TONE[quote.status]}>{STAGE_LABEL[quote.status]}</Badge>
              </span>
            }
            lead={
              quote.selection.bookingMode === "SIMULTANEOUS" ? (
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
                  {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ??
                    "—"}{" "}
                  · {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                  {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                  {quote.selection.expectedAudience.toLocaleString()}명
                </>
              )
            }
            actions={
              <>
                {quote.status === "ESTIMATE" && user.role !== "ADMIN" && (
                  <ButtonLink href={`/apply/edit/${quote.id}`} variant="secondary">
                    신청 내용 수정
                  </ButtonLink>
                )}
                <a
                  href={`/print/${quote.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass("tertiary")}
                >
                  인쇄 / PDF 저장
                </a>
              </>
            }
          />
        </Band>

        {/* ① 신청 예상금액 · 산출내역 */}
        <Band tone="white" size="sm">
          <div className="flex items-baseline gap-3">
            <span className="type-display text-xs tabular-nums text-muted">01</span>
            <h2 className="type-kr-heading text-h5-m sm:text-h5">신청 예상금액 · 산출내역</h2>
          </div>

          {/*
            Bowl 사용료·유틸리티(HIDDEN)는 관리자에게만 항목·금액을 노출한다 — 신청자
            본인에게는 행 자체를 숨긴다. 소계/VAT/합계는 quote 전체 lineItems 기준으로
            이미 계산돼 있어 행을 숨겨도 총액은 달라지지 않는다.
          */}
          <div className="mt-8">
            <ComparisonTable
              dense
              rowLabel="항목"
              columns={[
                { key: "requested", title: "신청" },
                { key: "included", title: "기본포함" },
                { key: "billable", title: "과금" },
                { key: "unitPrice", title: "단가" },
                { key: "amount", title: "금액" },
              ]}
              rows={quote.lineItems
                .filter((item) => item.visibility !== "HIDDEN" || user.role === "ADMIN")
                .map((item) => ({
                  label: item.label,
                  cells: [
                    num(item.requested),
                    item.included ? num(item.included) : "—",
                    num(item.billable),
                    num(item.unitPrice),
                    num(item.amount),
                  ],
                }))}
            />
          </div>

          <div className="mt-8 ml-auto w-full max-w-sm">
            <SpecTable
              dense
              rows={[
                ["소계 (VAT 별도)", won(quote.subtotal)],
                ["VAT", won(quote.vat)],
              ]}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-foreground py-3">
              <span className="text-s text-muted">합계</span>
              <span className="type-display text-h5-m tabular-nums sm:text-h5">
                {won(quote.total)}
              </span>
            </div>
          </div>
        </Band>

        {/* ② 계약금액 · ③ 정산금액 */}
        {(quote.contract || quote.settlement) && (
          <Band tone="light" size="sm">
            <div className="grid gap-14 lg:grid-cols-2">
              {quote.contract && (
                <section>
                  <div className="flex items-baseline gap-3">
                    <span className="type-display text-xs tabular-nums text-muted">02</span>
                    <h2 className="type-kr-heading text-h5-m sm:text-h5">계약금액 확정됨</h2>
                  </div>
                  {quote.contract.adjustments.length > 0 && (
                    <SpecTable
                      className="mt-6"
                      rows={quote.contract.adjustments.map((a) => [
                        a.reason ? `${a.label} (${a.reason})` : a.label,
                        won(a.amount),
                      ])}
                    />
                  )}
                  <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
                    <span className="text-xs text-muted">
                      확정일시 {new Date(quote.contract.decidedAt).toLocaleString("ko-KR")}
                    </span>
                    <span className="type-display text-h5-m tabular-nums sm:text-h5">
                      {won(quote.contract.contractTotal)}
                    </span>
                  </div>
                </section>
              )}

              {quote.settlement && (
                <section>
                  <div className="flex items-baseline gap-3">
                    <span className="type-display text-xs tabular-nums text-muted">03</span>
                    <h2 className="type-kr-heading text-h5-m sm:text-h5">최종 정산 완료</h2>
                  </div>
                  <div className="mt-6">
                    <Badge tone="good">정산 확정</Badge>
                  </div>
                  <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
                    <span className="text-xs text-muted">
                      확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                    </span>
                    <span className="type-display text-h5-m tabular-nums sm:text-h5">
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
            </div>
          </Band>
        )}

        {/* 계약 이행 — 날인·세금계산서·티켓오픈·현장미팅 */}
        {(quote.contract || quote.settlement) && (
          <Band tone="light" size="sm" divide>
            <h2 className="type-kr-heading mb-8 text-h5-m sm:text-h5">계약 이행</h2>

            {quote.contract && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ContractSignaturePanel
                  quoteId={quote.id}
                  signature={signature}
                  viewerRole="APPLICANT"
                />
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
          </Band>
        )}

        {/* 보증금 · 첨부서류 */}
        <Band tone="white" size="sm">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <DepositPanel quoteId={quote.id} deposit={deposit} viewerRole="APPLICANT" />
            <AttachmentsPanel quoteId={quote.id} attachments={attachments} />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
