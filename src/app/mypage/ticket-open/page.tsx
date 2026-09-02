import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotesPaged, listTicketOpensByQuoteIds, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { DataTable, type Column } from "@/components/mypage/DataTable";
import { Badge } from "@/components/ui/kit";
import type { TicketOpen } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "티켓 오픈 정보",
};

const COLUMNS: Column[] = [
  { key: "id", label: "신청번호" },
  { key: "event", label: "공연명" },
  { key: "date", label: "오픈일" },
  { key: "status", label: "상태" },
  { key: "detail", label: "상세 보기", srOnly: true, align: "right" },
];

function status(t: TicketOpen | undefined): { text: string; tone: "neutral" | "warn" | "good" } {
  if (!t || !t.openDate) return { text: "오픈일 미등록", tone: "neutral" };
  if (!t.materialsUploadedAt) return { text: "자료 미업로드", tone: "warn" };
  return { text: "자료 업로드 완료", tone: "good" };
}

export default async function MyTicketOpenPage({
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
  const ticketOpens = await listTicketOpensByQuoteIds(quotes.map((q) => q.id));
  const byQuoteId = new Map(ticketOpens.map((t) => [t.quoteId, t]));

  return (
    <MyPageShell
      user={user}
      active="/mypage/ticket-open"
      en="TICKET OPEN"
      ko="티켓 오픈 정보"
      lead="계약이 확정된 신청 건의 티켓 오픈일과 자료 업로드 상태입니다."
    >
      <DataTable
        columns={COLUMNS}
        empty="계약이 확정된 신청 건이 없습니다."
        rows={quotes.map((q) => {
          const t = byQuoteId.get(q.id);
          const s = status(t);
          return {
            id: q.id,
            cells: {
              id: <span className="font-bold">{q.id}</span>,
              event: q.selection.performanceInfo.eventName || "—",
              date: t?.openDate ? new Date(t.openDate).toLocaleDateString("ko-KR") : "—",
              status: <Badge tone={s.tone}>{s.text}</Badge>,
              detail: (
                <Link
                  href={`/mypage/ticket-open/${q.id}`}
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
        basePath="/mypage/ticket-open"
      />
    </MyPageShell>
  );
}
