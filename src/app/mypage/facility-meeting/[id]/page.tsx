import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getFacilityMeetingByQuoteId, getQuoteById, getTicketOpenByQuoteId, listAttachments } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { FacilityMeetingPanel } from "@/components/FacilityMeetingPanel";

export const metadata: Metadata = {
  title: "시설 회의 | 서울아레나",
};

const STAGE_LABEL: Record<string, string> = {
  ESTIMATE: "신청 접수 (예상 견적)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 확정",
};

export default async function MyFacilityMeetingDetailPage({
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

  const [ticketOpen, meeting, materials] = await Promise.all([
    getTicketOpenByQuoteId(id),
    getFacilityMeetingByQuoteId(id),
    listAttachments(id, "FACILITY_MEETING"),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/facility-meeting" />

          <div className="min-w-0 max-w-3xl flex-1">
            <Link href="/mypage/facility-meeting" className="text-[12.5px] font-medium text-accent hover:underline">
              ← 시설 회의 목록
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
              <h2 className="text-[15px] font-semibold">시설 회의</h2>
              <p className="mt-1 text-[12px] text-muted">
                시설 회의일을 등록하고 관련 자료를 업로드하세요.
              </p>
              <div className="mt-4">
                <FacilityMeetingPanel
                  quoteId={quote.id}
                  ticketOpenRegistered={!!ticketOpen?.openDate}
                  facilityMeeting={meeting ?? null}
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
