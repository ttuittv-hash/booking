import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listFacilityMeetingsByQuoteIds, listQuotesPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import type { FacilityMeeting } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "시설 회의 | 서울아레나",
};

function statusLabel(meeting: FacilityMeeting | undefined): { text: string; tone: "muted" | "warn" | "good" } {
  if (!meeting || !meeting.meetingDate) return { text: "회의일 미등록", tone: "muted" };
  if (!meeting.materialsUploadedAt) return { text: "회의일 등록 · 자료 미업로드", tone: "warn" };
  return { text: "자료 업로드 완료", tone: "good" };
}

export default async function MyFacilityMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: quotes, total, totalPages } = await listQuotesPaged(
    {
      ...(user.companyId ? { companyId: user.companyId } : { applicantId: user.id }),
      status: ["CONTRACTED", "SETTLED"],
    },
    page,
  );
  const meetings = await listFacilityMeetingsByQuoteIds(quotes.map((q) => q.id));
  const meetingByQuoteId = new Map(meetings.map((m) => [m.quoteId, m]));

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/facility-meeting" />

          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold">시설 회의</h1>
            <p className="mt-2 text-[13.5px] text-muted">
              계약이 확정된 신청 건의 시설 회의일과 자료 업로드 상태입니다.
            </p>

            <div className="mt-8 overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                    <th className="px-4 py-3">신청번호</th>
                    <th className="px-4 py-3">공연명</th>
                    <th className="px-4 py-3">회의일</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        계약이 확정된 신청 건이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    quotes.map((q) => {
                      const meeting = meetingByQuoteId.get(q.id);
                      const status = statusLabel(meeting);
                      return (
                        <tr key={q.id} className="border-b border-border/70">
                          <td className="px-4 py-3 font-medium">{q.id}</td>
                          <td className="px-4 py-3 text-muted">
                            {q.selection.performanceInfo.eventName || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {meeting?.meetingDate ? new Date(meeting.meetingDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-sm px-2.5 py-1 text-[11.5px] font-medium ${
                                status.tone === "good"
                                  ? "bg-good-soft text-good"
                                  : status.tone === "warn"
                                    ? "bg-warn-soft text-warn"
                                    : "bg-panel-strong text-muted"
                              }`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/mypage/facility-meeting/${q.id}`} className="font-medium text-accent hover:underline">
                              상세 →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} basePath="/mypage/facility-meeting" />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
