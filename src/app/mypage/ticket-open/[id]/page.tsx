import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getDepositByQuoteId, getQuoteById, getTaxInvoice, getTicketOpenByQuoteId, listAttachments } from "@/lib/db";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { Note } from "@/components/ui/kit";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";

export const metadata: Metadata = {
  title: "티켓 오픈 정보",
};

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수 (예상 견적)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
};

export default async function MyTicketOpenDetailPage({
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

  const [deposit, balanceInvoice, ticketOpen, materials] = await Promise.all([
    getDepositByQuoteId(id),
    getTaxInvoice(id, "CONTRACT_BALANCE"),
    getTicketOpenByQuoteId(id),
    listAttachments(id, "TICKET_OPEN"),
  ]);

  return (
    <MyPageShell
      user={user}
      active="/mypage/ticket-open"
      en="TICKET OPEN"
      ko={quote.id}
      lead={
        <>
          {quote.selection.performanceInfo.eventName || "공연명 미입력"} · {STAGE_LABEL[quote.status]}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/25 pb-4">
        <Link
          href="/mypage/ticket-open"
          className="text-s font-bold underline underline-offset-4 hover:text-accent"
        >
          ← 티켓 오픈 정보 목록
        </Link>
        <Link
          href={`/mypage/${quote.id}`}
          className="text-s text-muted underline underline-offset-4 hover:text-foreground"
        >
          전체 신청 내역 보기
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="type-kr-heading text-h5-m sm:text-h5">티켓 오픈 정보</h2>
        <Note className="mt-3">티켓 오픈일을 등록하고 관련 홍보·판매 자료를 업로드하세요.</Note>
        <div className="mt-6">
          <TicketOpenPanel
            quoteId={quote.id}
            depositConfirmed={deposit?.status === "CONFIRMED"}
            balanceInvoicePaid={balanceInvoice ? balanceInvoice.status === "PAID" : null}
            ticketOpen={ticketOpen ?? null}
            materials={materials}
            viewerRole="APPLICANT"
          />
        </div>
      </section>
    </MyPageShell>
  );
}
