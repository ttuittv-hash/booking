import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { Quote } from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const quotes = user.companyId ? listQuotes({ companyId: user.companyId }) : listQuotes({ applicantId: user.id });

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold">{user.name} 님의 신청 내역</h1>
          <Link
            href="/mypage/inquiries"
            className="rounded-sm border border-border px-4 py-2 text-[12.5px] font-medium transition-colors hover:bg-panel"
          >
            1:1 문의
          </Link>
        </div>
        <p className="mt-2 text-[13.5px] text-muted">
          {user.companyName ? `${user.companyName} · ` : ""}
          {user.email}
        </p>

        <div className="mt-8 overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">신청번호</th>
                <th className="px-4 py-3">신청일시</th>
                <th className="px-4 py-3">주차</th>
                <th className="px-4 py-3 text-right">신청 예상금액</th>
                <th className="px-4 py-3 text-right">계약금액</th>
                <th className="px-4 py-3 text-right">정산금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    아직 신청 내역이 없습니다.{" "}
                    <Link href="/apply" className="text-accent hover:underline">
                      대관 신청하기
                    </Link>
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{q.id}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(q.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {q.selection.week.year}.{q.selection.week.month} {q.selection.week.weekOfMonth}주차
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{won(q.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {q.contract ? won(q.contract.contractTotal) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {q.settlement ? won(q.settlement.finalTotal) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-sm bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/mypage/${q.id}`} className="font-medium text-accent hover:underline">
                        상세 →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
