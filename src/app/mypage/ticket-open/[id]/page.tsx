import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getDepositByQuoteId, getQuoteById, getTicketOpenByQuoteId, listAttachments } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { TicketOpenPanel } from "@/components/TicketOpenPanel";

export const metadata: Metadata = {
  title: "티켓 오픈 정보 | 서울아레나",
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

  const [deposit, ticketOpen, materials] = await Promise.all([
    getDepositByQuoteId(id),
    getTicketOpenByQuoteId(id),
    listAttachments(id, "TICKET_OPEN"),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/ticket-open" />

          <div className="min-w-0 max-w-3xl flex-1">
            <Link href="/mypage/ticket-open" className="text-[12.5px] font-medium text-accent hover:underline">
              ← 티켓 오픈 정보 목록
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

            <section className="mt-6 rounded border border-border bg-background p-6">
              <h2 className="text-[15px] font-semibold">티켓 오픈 정보</h2>
              <p className="mt-1 text-[12px] text-muted">
                티켓 오픈일을 등록하고 관련 홍보·판매 자료를 업로드하세요.
              </p>
              <div className="mt-4">
                <TicketOpenPanel
                  quoteId={quote.id}
                  depositConfirmed={deposit?.status === "CONFIRMED"}
                  ticketOpen={ticketOpen ?? null}
                  materials={materials}
                  viewerRole="APPLICANT"
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
