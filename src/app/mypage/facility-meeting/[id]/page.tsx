import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessQuote, getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getFacilityMeetingByQuoteId, getQuoteById, getTicketOpenByQuoteId, listAttachments } from "@/lib/db";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { Note } from "@/components/ui/kit";
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
    <MyPageShell
      user={user}
      active="/mypage/facility-meeting"
      en="FACILITY MEETING"
      ko={quote.id}
      lead={
        <>
          {quote.selection.performanceInfo.eventName || "공연명 미입력"} · {STAGE_LABEL[quote.status]}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/25 pb-4">
        <Link
          href="/mypage/facility-meeting"
          className="text-s font-bold underline underline-offset-4 hover:text-accent"
        >
          ← 시설 회의 목록
        </Link>
        <Link
          href={`/mypage/${quote.id}`}
          className="text-s text-muted underline underline-offset-4 hover:text-foreground"
        >
          전체 신청 내역 보기
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="type-kr-heading text-h5-m sm:text-h5">시설 회의</h2>
        <Note className="mt-3">
          시설 회의 일정을 확인하고 공연 준비 자료를 제출하세요.
        </Note>
        <div className="mt-6">
          <FacilityMeetingPanel
                  quoteId={quote.id}
                  ticketOpenRegistered={!!ticketOpen?.openDate}
                  facilityMeeting={meeting ?? null}
                  materials={materials}
                  viewerRole="APPLICANT"
                />
        </div>
      </section>
    </MyPageShell>
  );
}
