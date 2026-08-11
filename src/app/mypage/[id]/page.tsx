import Link from "next/link";
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
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { checkAndFireReminders } from "@/lib/reminders";
import { DEFAULT_VENUE_ID, VENUES } from "@/lib/pricing/types";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { ContractSignaturePanel } from "@/components/ContractSignaturePanel";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { PublicHeader } from "@/components/PublicHeader";

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
  if (!await canAccessQuote(user, quote)) notFound();

  await checkAndFireReminders(quote);

  const deposit = await getDepositByQuoteId(id) ?? null;
  const attachments = await listAttachments(id, null);
  const signature = await getContractSignatureByQuoteId(id) ?? null;
  const contractInvoice = await getTaxInvoice(id, "CONTRACT") ?? null;
  const settlementInvoice = await getTaxInvoice(id, "SETTLEMENT") ?? null;
  const ticketOpen = await getTicketOpenByQuoteId(id) ?? null;
  const facilityMeeting = await getFacilityMeetingByQuoteId(id) ?? null;
  const ticketOpenMaterials = await listAttachments(id, "TICKET_OPEN");
  const facilityMeetingMaterials = await listAttachments(id, "FACILITY_MEETING");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/mypage" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 내 신청 내역
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
          {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-"} ·{" "}
          {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
          {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
          {quote.selection.expectedAudience.toLocaleString()}명
        </p>

        <section className="mt-6 rounded border border-border bg-background p-6">
          <h2 className="text-[15px] font-semibold">① 신청 예상금액 · 산출내역</h2>
          <div className="mt-4 overflow-x-auto">
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
                {quote.lineItems.map((item) => (
                  <tr key={item.addonId} className="border-b border-border/70 tabular-nums">
                    <td className="py-2 text-left font-medium">{item.label}</td>
                    <td className="py-2 text-right">{item.requested.toLocaleString()}</td>
                    <td className="py-2 text-right">{item.included || "-"}</td>
                    <td className="py-2 text-right">{item.billable.toLocaleString()}</td>
                    <td className="py-2 text-right">{won(item.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{won(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      </main>
    </div>
  );
}
