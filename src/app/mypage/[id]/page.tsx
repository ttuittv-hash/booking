import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { getDepositByQuoteId, getQuoteById, listAttachments } from "@/lib/db";
import { won } from "@/lib/format";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { DepositPanel } from "@/components/DepositPanel";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, ButtonLink, Label, SpecTable, btnClass } from "@/components/ui/kit";
import type { Quote } from "@/lib/pricing/types";

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
  const quote = getQuoteById(id);
  if (!quote) notFound();
  if (!canAccessQuote(user, quote)) notFound();

  const deposit = getDepositByQuoteId(id) ?? null;
  const attachments = listAttachments(id);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <Breadcrumb items={[{ label: "내 신청 내역", href: "/mypage" }, { label: quote.id }]} />

      <main className="flex flex-1 flex-col">
        {/* 신청 개요 */}
        <Band tone="light" size="sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Label className="mb-5 text-muted">Application</Label>
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="type-display text-h3-m sm:text-h3">{quote.id}</h1>
                <Badge tone={STAGE_TONE[quote.status]}>{STAGE_LABEL[quote.status]}</Badge>
              </div>
              <p className="mt-5 text-s text-muted">
                {quote.selection.week.year}년 {quote.selection.week.month}월{" "}
                {quote.selection.week.weekOfMonth}주차 · 총 {totalRentalDays(quote.selection)}일 · 관객{" "}
                {quote.selection.expectedAudience.toLocaleString()}명
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {quote.status === "ESTIMATE" && user.role !== "ADMIN" && (
                <ButtonLink href={`/apply/edit/${quote.id}`} variant="outline">
                  신청 내용 수정
                </ButtonLink>
              )}
              <a
                href={`/print/${quote.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={btnClass("ghost")}
              >
                인쇄 / PDF 저장
              </a>
            </div>
          </div>
        </Band>

        {/* ① 신청 예상금액 · 산출내역 */}
        <Band tone="white" size="sm">
          <div className="flex items-baseline gap-3">
            <span className="type-display text-xs tabular-nums text-muted">01</span>
            <h2 className="type-kr-heading text-h5-m sm:text-h5">신청 예상금액 · 산출내역</h2>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-y border-border/25 text-xs text-muted">
                  <th className="py-3 pr-4 text-left font-bold">항목</th>
                  <th className="py-3 pr-4 text-right font-bold">신청</th>
                  <th className="py-3 pr-4 text-right font-bold">기본포함</th>
                  <th className="py-3 pr-4 text-right font-bold">과금수량</th>
                  <th className="py-3 pr-4 text-right font-bold">단가</th>
                  <th className="py-3 text-right font-bold">금액</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.addonId} className="border-b border-border/15 text-s tabular-nums">
                    <td className="py-3 pr-4 text-left font-bold">{item.label}</td>
                    <td className="py-3 pr-4 text-right text-muted">{item.requested.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-muted">{item.included || "-"}</td>
                    <td className="py-3 pr-4 text-right">{item.billable.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right text-muted">{won(item.unitPrice)}</td>
                    <td className="py-3 text-right font-bold">{won(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-8 ml-auto w-full max-w-sm border-t border-border/25">
            <div className="flex items-baseline justify-between border-b border-border/15 py-3">
              <dt className="text-xs text-muted">소계 (VAT 별도)</dt>
              <dd className="text-s tabular-nums">{won(quote.subtotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-b border-border/15 py-3">
              <dt className="text-xs text-muted">VAT</dt>
              <dd className="text-s tabular-nums">{won(quote.vat)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-b-2 border-foreground py-3">
              <dt className="type-label text-xs">Total</dt>
              <dd className="type-display text-h5-m tabular-nums sm:text-h5">{won(quote.total)}</dd>
            </div>
          </dl>
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
                    <Badge tone="good">Settled</Badge>
                  </div>
                  <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
                    <span className="text-xs text-muted">
                      확정일시 {new Date(quote.settlement.decidedAt).toLocaleString("ko-KR")}
                    </span>
                    <span className="type-display text-h5-m tabular-nums sm:text-h5">
                      {won(quote.settlement.finalTotal)}
                    </span>
                  </div>
                </section>
              )}
            </div>
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
