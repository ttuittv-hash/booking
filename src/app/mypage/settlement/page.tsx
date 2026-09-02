import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotesPaged, normalizePage } from "@/lib/db";
import { won } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { DataTable, type Column } from "@/components/mypage/DataTable";
import { Badge } from "@/components/ui/kit";
import type { Quote } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "정산",
};

const COLUMNS: Column[] = [
  { key: "id", label: "신청번호" },
  { key: "event", label: "공연명" },
  { key: "amount", label: "정산금액", align: "right" },
  { key: "status", label: "상태" },
  { key: "detail", label: "상세 보기", srOnly: true, align: "right" },
];

function status(q: Quote): { text: string; tone: "neutral" | "warn" | "good" } {
  if (!q.settlement) return { text: "정산 대기", tone: "neutral" };
  if (!q.settlement.mutualConfirmedAt) return { text: "상호확인 대기", tone: "warn" };
  return { text: "상호확인 완료", tone: "good" };
}

export default async function MySettlementPage({
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

  return (
    <MyPageShell
      user={user}
      active="/mypage/settlement"
      en="SETTLEMENT"
      ko="정산"
      lead="공연이 끝난 신청 건의 최종 정산 금액과 상호 확인 상태입니다."
    >
      <DataTable
        columns={COLUMNS}
        empty="정산 대상 신청 건이 없습니다."
        rows={quotes.map((q) => {
          const s = status(q);
          return {
            id: q.id,
            cells: {
              id: <span className="font-bold">{q.id}</span>,
              event: q.selection.performanceInfo.eventName || "—",
              amount: q.settlement ? won(q.settlement.finalTotal) : "—",
              status: <Badge tone={s.tone}>{s.text}</Badge>,
              detail: (
                <Link
                  href={`/mypage/settlement/${q.id}`}
                  className="whitespace-nowrap text-s font-bold underline underline-offset-4 hover:text-accent"
                >
                  상세
                </Link>
              ),
            },
          };
        })}
      />
      <Pagination page={page} totalPages={totalPages} total={total} basePath="/mypage/settlement" />
    </MyPageShell>
  );
}
