import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getQuoteById, getTaxInvoice } from "@/lib/db";
import { won } from "@/lib/format";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { EmptyState } from "@/components/ui/kit";
import { SettlementMutualConfirm } from "@/components/SettlementMutualConfirm";
import { TaxInvoicePanel } from "@/components/TaxInvoicePanel";

export const metadata: Metadata = {
  title: "정산",
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
    <MyPageShell
      user={user}
      active="/mypage/settlement"
      en="SETTLEMENT"
      ko={quote.id}
      lead={
        <>
          {quote.selection.performanceInfo.eventName || "공연명 미입력"} · {STAGE_LABEL[quote.status]}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/25 pb-4">
        <Link
          href="/mypage/settlement"
          className="text-s font-bold underline underline-offset-4 hover:text-accent"
        >
          ← 정산 목록
        </Link>
        <Link
          href={`/mypage/${quote.id}`}
          className="text-s text-muted underline underline-offset-4 hover:text-foreground"
        >
          전체 신청 내역 보기
        </Link>
      </div>

      {quote.settlement ? (
        <>
          {/* 확정 금액은 색면 박스가 아니라 2px 룰 + 큰 숫자로 — 표 규격과 같은 언어 */}
          <section className="mt-8">
            <h2 className="type-kr-heading text-h5-m sm:text-h5">정산 확정</h2>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
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

          <div className="mt-10">
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
        <div className="mt-8">
          <EmptyState
            title="정산 대기 중입니다"
            desc="아직 최종 정산금액이 확정되지 않았습니다. 운영자가 부대사용료·현장 추가/차감 내역을 확정하면 이 화면에서 정산 내역과 세금계산서를 확인하실 수 있습니다."
          />
        </div>
      )}
    </MyPageShell>
  );
}
