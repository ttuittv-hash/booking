import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getQuoteById, getTaxInvoice } from "@/lib/db";
import { won } from "@/lib/format";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";

export const metadata: Metadata = {
  title: "정산 | 서울아레나",
};

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수 (예상 견적)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
};

export default async function MySettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (!(await canAccessQuote(user, quote))) notFound();

  const settlementInvoice = quote.settlement ? ((await getTaxInvoice(id, "SETTLEMENT")) ?? null) : null;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/settlement" />

          <div className="min-w-0 max-w-3xl flex-1">
            <Link href="/mypage/settlement" className="text-[12.5px] font-medium text-accent hover:underline">
              ← 정산 목록
            </Link>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[22px] font-semibold">{quote.id}</h1>
              <div className="flex items-center gap-3">
                <Link href={`/mypage/${quote.id}`} className="text-[12.5px] font-medium text-accent hover:underline">
                  전체 신청 내역 보기 →
                </Link>
                <span className="text-[12.5px] text-muted">{STAGE_LABEL[quote.status]}</span>
              </div>
            </div>
            <p className="mt-1.5 text-[13.5px] text-muted">
              {quote.selection.performanceInfo.eventName || "공연명 미입력"}
            </p>

            {quote.settlement ? (
              <>
                <section className="mt-6 rounded border border-good/30 bg-good-soft p-6">
                  <h2 className="text-[15px] font-semibold text-good">정산 확정</h2>
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

                <div className="mt-6">
                  <TaxInvoicePanel
                    quoteId={quote.id}
                    purpose="SETTLEMENT"
                    title="세금계산서 (정산금)"
                    invoice={settlementInvoice}
                    viewerRole="APPLICANT"
                  />
                </div>
              </>
            ) : (
              <section className="mt-6 rounded border border-border bg-background p-6">
                <h2 className="text-[15px] font-semibold">정산 대기 중</h2>
                <p className="mt-2 text-[13px] text-muted">
                  아직 최종 정산금액이 확정되지 않았습니다. 운영자가 부대사용료·현장 추가/차감 내역을
                  확정하면 이 화면에서 정산 내역과 세금계산서를 확인할 수 있습니다.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
