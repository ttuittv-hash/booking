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
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { checkAndFireReminders } from "@/lib/reminders";
import {
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
} from "@/lib/pricing/types";
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

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
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

  await checkAndFireReminders(quote);

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
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/admin" className="whitespace-nowrap text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </Link>
          <Link href="/admin" className="whitespace-nowrap text-[13px] text-muted hover:text-foreground">
            ← 신청 현황
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold">{quote.id}</h1>
          <div className="flex items-center gap-3">
            <Link
              href={`/print/${quote.id}`}
              target="_blank"
              className="text-[12.5px] font-medium text-accent hover:underline"
            >
              인쇄 / PDF 저장
            </Link>
            <span className="text-[12.5px] text-muted">
              신청일시 {new Date(quote.createdAt).toLocaleString("ko-KR")}
            </span>
          </div>
        </div>

        <p className="mt-1.5 text-[13.5px] text-muted">
          {VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-"} ·{" "}
          {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
          {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
          {quote.selection.expectedAudience.toLocaleString()}명
        </p>
        <p className="mt-1 text-[13.5px] text-muted">
          신청자 <span className="font-medium text-foreground">{applicant?.name ?? "-"}</span>
          {" "}({applicant?.email ?? "-"}) · 회사{" "}
          <span className="font-medium text-foreground">{applicant?.companyName ?? "-"}</span>
        </p>

        {quote.selection.performanceInfo && (
          <section className="mt-6 rounded border border-border bg-background p-6">
            <h2 className="text-[15px] font-semibold">공연 정보</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">공연(행사)명</dt>
                <dd className="font-medium">{quote.selection.performanceInfo.eventName || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">아티스트</dt>
                <dd className="font-medium">{quote.selection.performanceInfo.artist || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">주최·주관·기획</dt>
                <dd className="font-medium">{quote.selection.performanceInfo.organizer || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">행사규모</dt>
                <dd className="font-medium">{quote.selection.performanceInfo.eventScale || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">행사유형</dt>
                <dd className="font-medium">
                  {quote.selection.performanceInfo.eventTypes.length
                    ? quote.selection.performanceInfo.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ")
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">무대형태</dt>
                <dd className="font-medium">
                  {quote.selection.performanceInfo.stageTypes.length
                    ? quote.selection.performanceInfo.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ")
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">객석형태</dt>
                <dd className="font-medium">
                  {quote.selection.performanceInfo.seatingTypes.length
                    ? quote.selection.performanceInfo.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ")
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted">수납식 객석 사용여부</dt>
                <dd className="font-medium">
                  {quote.selection.performanceInfo.retractableSeatUse
                    ? RETRACTABLE_SEAT_USE_LABEL[quote.selection.performanceInfo.retractableSeatUse]
                    : "-"}
                </dd>
              </div>
            </dl>
          </section>
        )}

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

        <div className="mt-6 space-y-6">
          {quote.status === "ESTIMATE" && (
            <ReviewForm
              quoteId={quote.id}
              review={quote.review}
              conflict={weekConflict ? { companyName: weekConflict.companyName } : null}
            />
          )}

          {quote.status === "ESTIMATE" && quote.review?.decision === "REJECTED" && (
            <p className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              심사에서 거절된 신청서입니다. 계약을 진행하려면 심사 결과를 승인으로 변경하세요.
            </p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision !== "APPROVED" && quote.review?.decision !== "REJECTED" && (
            <p className="rounded-sm border border-border bg-panel/60 px-4 py-3 text-[13px] text-muted">
              심사를 승인해야 계약 단계로 진행할 수 있습니다.
            </p>
          )}
          {quote.status === "ESTIMATE" && quote.review?.decision === "APPROVED" && (
            <ContractForm quoteId={quote.id} baseTotal={quote.total} />
          )}
        </div>

        <div className="mt-6">
          {quote.contract && (
            <div className="rounded border border-border bg-panel/60 p-6">
              <h3 className="text-[15px] font-semibold">② 계약금액 확정됨</h3>
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
            <div className="mt-6 rounded border border-good/30 bg-good-soft p-6">
              <h3 className="text-[15px] font-semibold text-good">③ 최종 정산 완료</h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-good/80">
                  확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="text-[20px] font-semibold tabular-nums text-good">
                  {won(quote.settlement.finalTotal)}
                </span>
              </div>
              <SettlementMutualConfirm quoteId={quote.id} settlement={quote.settlement} viewerRole="ADMIN" />
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
          <section className="mt-8">
            <h2 className="text-[14px] font-semibold text-muted">감사 로그</h2>
            <ul className="mt-3 space-y-2">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex justify-between rounded border border-border/70 px-4 py-2.5 text-[12.5px] text-muted"
                >
                  <span>{STAGE_LABEL[entry.stage] ?? entry.stage}</span>
                  <span>{new Date(entry.createdAt).toLocaleString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
