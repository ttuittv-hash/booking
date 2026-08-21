import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listFacilityMeetingsByQuoteIds, listQuotesPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { DataTable, type Column } from "@/components/mypage/DataTable";
import { Badge } from "@/components/ui/kit";
import type { FacilityMeeting } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "시설 회의 | 서울아레나",
};

const COLUMNS: Column[] = [
  { key: "id", label: "신청번호" },
  { key: "event", label: "공연명" },
  { key: "date", label: "회의일" },
  { key: "status", label: "상태" },
  { key: "detail", label: "상세 보기", srOnly: true, align: "right" },
];

function status(m: FacilityMeeting | undefined): { text: string; tone: "neutral" | "warn" | "good" } {
  if (!m || !m.meetingDate) return { text: "회의일 미등록", tone: "neutral" };
  if (!m.materialsUploadedAt) return { text: "자료 미업로드", tone: "warn" };
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
  const {
    items: quotes,
    total,
    totalPages,
  } = await listQuotesPaged(
    {
      ...(user.companyId ? { companyId: user.companyId } : { applicantId: user.id }),
      status: ["CONTRACTED", "SETTLED"],
    },
    page,
  );
  const meetings = await listFacilityMeetingsByQuoteIds(quotes.map((q) => q.id));
  const byQuoteId = new Map(meetings.map((m) => [m.quoteId, m]));

  return (
    <MyPageShell
      user={user}
      active="/mypage/facility-meeting"
      en="FACILITY MEETING"
      ko="시설 회의"
      lead="계약이 확정된 신청 건의 시설 회의 일정과 자료 제출 상태입니다."
    >
      <DataTable
        columns={COLUMNS}
        empty="계약이 확정된 신청 건이 없습니다."
        rows={quotes.map((q) => {
          const m = byQuoteId.get(q.id);
          const s = status(m);
          return {
            id: q.id,
            cells: {
              id: <span className="font-bold">{q.id}</span>,
              event: q.selection.performanceInfo.eventName || "—",
              date: m?.meetingDate ? new Date(m.meetingDate).toLocaleDateString("ko-KR") : "—",
              status: <Badge tone={s.tone}>{s.text}</Badge>,
              detail: (
                <Link
                  href={`/mypage/facility-meeting/${q.id}`}
                  className="whitespace-nowrap text-s font-bold underline underline-offset-4 hover:text-accent"
                >
                  상세
                </Link>
              ),
            },
          };
        })}
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/mypage/facility-meeting"
      />
    </MyPageShell>
  );
}
