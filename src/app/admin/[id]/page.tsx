import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDepositByQuoteId, getQuoteById, listAttachments, listAuditLogsForQuote } from "@/lib/db";
import { won } from "@/lib/format";
import { ContractForm } from "@/components/admin/ContractForm";
import { SettlementForm } from "@/components/admin/SettlementForm";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";

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
  const quote = getQuoteById(id);
  if (!quote) notFound();

  const auditLog = listAuditLogsForQuote(id);
  const deposit = getDepositByQuoteId(id) ?? null;
  const attachments = listAttachments(id);

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
          {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
          {quote.selection.week.weekOfMonth}주차 · {1 + quote.selection.extraWeeks}주 · 관객{" "}
          {quote.selection.expectedAudience.toLocaleString()}명
        </p>

        <section className="mt-6 rounded-md border border-border bg-background p-6">
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

        <div className="mt-6">
          {quote.status === "ESTIMATE" && <ContractForm quoteId={quote.id} baseTotal={quote.total} />}

          {quote.contract && (
            <div className="rounded-md border border-border bg-panel/60 p-6">
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

          {quote.status === "CONTRACTED" && quote.contract && (
            <div className="mt-6">
              <SettlementForm quoteId={quote.id} contractTotal={quote.contract.contractTotal} />
            </div>
          )}

          {quote.settlement && (
            <div className="mt-6 rounded-md border border-good/30 bg-good-soft p-6">
              <h3 className="text-[15px] font-semibold text-good">③ 최종 정산 완료</h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-good/80">
                  확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                </span>
                <span className="text-[20px] font-semibold tabular-nums text-good">
                  {won(quote.settlement.finalTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DepositPanel quoteId={quote.id} deposit={deposit} viewerRole="ADMIN" />
          <AttachmentsPanel
            quoteId={quote.id}
            attachments={attachments}
            currentUserId={user.id}
            isAdmin
          />
        </div>

        {auditLog.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[14px] font-semibold text-muted">감사 로그</h2>
            <ul className="mt-3 space-y-2">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex justify-between rounded-md border border-border/70 px-4 py-2.5 text-[12.5px] text-muted"
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
