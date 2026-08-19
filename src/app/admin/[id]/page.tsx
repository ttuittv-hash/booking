import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  findApprovedWeekConflict,
  findUserById,
  getContractSignatureByQuoteId,
  getDepositByQuoteId,
  getFacilityMeetingByQuoteId,
  getQuoteById,
  getTaxInvoice,
  getTicketOpenByQuoteId,
  listAttachments,
  listAuditLogsForQuote,
} from "@/lib/db";
import { num, won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { SpecTable } from "@/components/ui/kit";
import { ContractForm } from "@/components/admin/ContractForm";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { SettlementForm } from "@/components/admin/SettlementForm";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import {
  ERROR_NOTE,
  INFO_NOTE,
  LINK_BTN,
  NONE,
  PANEL,
  SECTION_TITLE,
  SUB_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD_ID,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

// 중형공연장은 주차가 아니라 날짜별(셋업/공연·회차)로 잡히므로 개요 한 줄로 압축해 보여준다.
function midHallSummaryLine(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performanceDates = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE");
  const shows = performanceDates.reduce((sum, d) => sum + selection.midHallDays[d].shows, 0);
  return `총 ${dates.length}일 (셋업 ${setup} · 공연 ${performanceDates.length} · 회차 ${shows}) · 관객 ${selection.secondaryAudience.toLocaleString()}명`;
}

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
  SUBMITTED: "신청서 제출",
  EDITED: "신청서 수정(신청자)",
  REVIEW_APPROVED: "심사 승인",
  REVIEW_HOLD: "심사 보류",
  REVIEW_REJECTED: "심사 반려",
  DEPOSIT_REPORTED: "보증금 입금신청",
  DEPOSIT_CONFIRMED: "보증금 입금확인",
  SIGNED_VENUE: "계약서 날인(공연장)",
  SIGNED_APPLICANT: "계약서 날인(대관사)",
  INVOICE_ISSUED: "세금계산서 발행",
  INVOICE_PAYMENT_REPORTED: "세금계산서 입금신청",
  INVOICE_PAYMENT_CONFIRMED: "세금계산서 입금확인",
  TICKET_OPEN_SET: "티켓오픈일 등록",
  FACILITY_MEETING_SET: "시설회의일 등록",
  SETTLEMENT_MUTUAL_CONFIRMED: "정산 상호확인",
};

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();


  const applicant = await findUserById(quote.applicantId);
  const auditLog = await listAuditLogsForQuote(id);
  const deposit = (await getDepositByQuoteId(id)) ?? null;
  const attachments = await listAttachments(id, null);
  const weekConflict =
    quote.status === "ESTIMATE" ? (await findApprovedWeekConflict(quote)) ?? null : null;
  const signature = (await getContractSignatureByQuoteId(id)) ?? null;
  const contractInvoice = (await getTaxInvoice(id, "CONTRACT")) ?? null;
  const settlementInvoice = (await getTaxInvoice(id, "SETTLEMENT")) ?? null;
  const ticketOpen = (await getTicketOpenByQuoteId(id)) ?? null;
  const facilityMeeting = (await getFacilityMeetingByQuoteId(id)) ?? null;
  const ticketOpenMaterials = await listAttachments(id, "TICKET_OPEN");
  const facilityMeetingMaterials = await listAttachments(id, "FACILITY_MEETING");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 h-14 border-b border-border/20 bg-background/95 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full max-w-4xl items-center gap-x-5 px-4 sm:px-6">
          <Link
            href="/admin"
            className="type-display shrink-0 whitespace-nowrap text-h6-m leading-none"
            aria-label="Seoul Arena 백오피스"
          >
            Seoul Arena
          </Link>
          <Link
            href="/admin"
            className="whitespace-nowrap text-xs font-bold text-muted transition-colors hover:text-foreground"
          >
            ← 신청 현황
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <h1 className="type-display text-h4-m tabular-nums sm:text-h4">{quote.id}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/print/${quote.id}`} target="_blank" className={LINK_BTN}>
                인쇄 / PDF 저장
              </Link>
              <span className="text-xs tabular-nums text-muted">
                신청일시 {new Date(quote.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
          </div>

          <p className="mt-4 text-s text-muted">
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
                {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? NONE} ·{" "}
                {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                {quote.selection.expectedAudience.toLocaleString()}명
              </>
            )}
          </p>
          <p className="mt-1.5 text-s text-muted">
            신청자 <span className="font-bold text-foreground">{applicant?.name ?? NONE}</span>
            {" "}({applicant?.email ?? NONE}) · 회사{" "}
            <span className="font-bold text-foreground">{applicant?.companyName ?? NONE}</span>
          </p>
        </header>

        {quote.selection.performanceInfo && (
          <section className={`mt-6 ${PANEL}`}>
            <h2 className={SECTION_TITLE}>공연 정보</h2>
            <div className="mt-4 grid gap-x-10 lg:grid-cols-2">
              <SpecTable
                rows={[
                  ["공연(행사)명", quote.selection.performanceInfo.eventName || NONE],
                  ["아티스트", quote.selection.performanceInfo.artist || NONE],
                  ["주최·주관·기획", quote.selection.performanceInfo.organizer || NONE],
                  ["행사규모", quote.selection.performanceInfo.eventScale || NONE],
                ]}
              />
              <SpecTable
                rows={[
                  [
                    "행사유형",
                    quote.selection.performanceInfo.eventTypes.length
                      ? quote.selection.performanceInfo.eventTypes
                          .map((t) => EVENT_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "무대형태",
                    quote.selection.performanceInfo.stageTypes.length
                      ? quote.selection.performanceInfo.stageTypes
                          .map((t) => STAGE_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "객석형태",
                    quote.selection.performanceInfo.seatingTypes.length
                      ? quote.selection.performanceInfo.seatingTypes
                          .map((t) => SEATING_TYPE_LABEL[t])
                          .join(", ")
                      : NONE,
                  ],
                  [
                    "수납식 객석 사용여부",
                    quote.selection.performanceInfo.retractableSeatUse
                      ? RETRACTABLE_SEAT_USE_LABEL[quote.selection.performanceInfo.retractableSeatUse]
                      : NONE,
                  ],
                ]}
              />
            </div>
          </section>
        )}

        <section className={`mt-6 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>① 신청 예상금액 · 산출내역</p>
              <p className={TABLE_HEAD_DESC}>
                기본 포함 수량을 뺀 과금수량에만 단가가 적용됩니다.
              </p>
            </div>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={TABLE}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>항목</th>
                  <th className={TH_NUM}>신청</th>
                  <th className={TH_NUM}>기본포함</th>
                  <th className={TH_NUM}>과금수량</th>
                  <th className={TH_NUM}>단가 (₩)</th>
                  <th className={TH_NUM}>금액 (₩)</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.addonId} className={TR}>
                    <td className={TD_ID}>{item.label}</td>
                    <td className={TD_NUM}>{item.requested.toLocaleString("ko-KR")}</td>
                    <td className={TD_NUM}>{item.included || NONE}</td>
                    <td className={TD_NUM}>{item.billable.toLocaleString("ko-KR")}</td>
                    <td className={TD_NUM}>{num(item.unitPrice)}</td>
                    <td className={`${TD_NUM} font-bold`}>{num(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t border-border-soft px-4 py-3 text-s tabular-nums">
            <span className="text-muted">소계 {won(quote.subtotal)}</span>
            <span className="text-muted">VAT {won(quote.vat)}</span>
            <span className="font-bold">합계 {won(quote.total)}</span>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {quote.status === "ESTIMATE" && (
            <ReviewForm
              quoteId={quote.id}
              review={quote.review}
              conflict={weekConflict ? { companyName: weekConflict.companyName } : null}
            />
          )}

          {quote.status === "ESTIMATE" && quote.review?.decision === "REJECTED" && (
            <p className={ERROR_NOTE}>
              심사에서 거절된 신청서입니다. 계약을 진행하려면 심사 결과를 승인으로 변경하세요.
            </p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision !== "APPROVED" && quote.review?.decision !== "REJECTED" && (
            <p className={INFO_NOTE}>심사를 승인해야 계약 단계로 진행할 수 있습니다.</p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision === "APPROVED" && (
            <ContractForm quoteId={quote.id} baseTotal={quote.total} />
          )}
        </div>

        <div className="mt-6">
          {quote.contract && (
            <div className={PANEL}>
              <h3 className={SECTION_TITLE}>② 계약금액 확정됨</h3>
              <ul className="mt-4 space-y-2 text-s">
                {quote.contract.adjustments.map((a, i) => (
                  <li key={i} className="flex justify-between gap-4 text-muted">
                    <span>
                      {a.label} {a.reason && `(${a.reason})`}
                    </span>
                    <span className="tabular-nums">{won(a.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-border/15 pt-4">
                <span className="text-xs tabular-nums text-muted">
                  확정일시 {new Date(quote.contract.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="type-display text-h5-m tabular-nums sm:text-h5">
                  {won(quote.contract.contractTotal)}
                </span>
              </div>
            </div>
          )}

          {quote.contract && (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ContractSignaturePanel quoteId={quote.id} signature={signature} viewerRole="ADMIN" />
              <TaxInvoicePanel
                quoteId={quote.id}
                purpose="CONTRACT"
                title="세금계산서 (계약금)"
                invoice={contractInvoice}
                viewerRole="ADMIN"
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
                viewerRole="ADMIN"
              />
              <FacilityMeetingPanel
                quoteId={quote.id}
                ticketOpenRegistered={!!ticketOpen?.openDate}
                facilityMeeting={facilityMeeting}
                materials={facilityMeetingMaterials}
                viewerRole="ADMIN"
              />
            </div>
          )}

          {quote.status === "CONTRACTED" && quote.contract && (
            <div className="mt-6">
              <SettlementForm quoteId={quote.id} contractTotal={quote.contract.contractTotal} />
            </div>
          )}

          {quote.settlement && (
            <div className="mt-6 border-l-2 border-good bg-good-soft p-4 sm:p-5">
              <h3 className={`${SECTION_TITLE} text-good`}>③ 최종 정산 완료</h3>
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-xs tabular-nums text-good">
                  확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="type-display text-h5-m tabular-nums text-good sm:text-h5">
                  {won(quote.settlement.finalTotal)}
                </span>
              </div>
              <SettlementMutualConfirm
                quoteId={quote.id}
                settlement={quote.settlement}
                viewerRole="ADMIN"
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
                viewerRole="ADMIN"
              />
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DepositPanel quoteId={quote.id} deposit={deposit} viewerRole="ADMIN" />
          <AttachmentsPanel quoteId={quote.id} attachments={attachments} />
        </div>

        {auditLog.length > 0 && (
          <section className="mt-10 border-t border-border/20 pt-6">
            <h2 className={`${SUB_TITLE} text-muted`}>감사 로그</h2>
            <ul className="mt-3 border-t border-border-soft">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex justify-between gap-4 border-b border-border-soft px-1 py-2.5 text-xs text-muted"
                >
                  <span>{STAGE_LABEL[entry.stage] ?? entry.stage}</span>
                  <span className="tabular-nums">{new Date(entry.createdAt).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
