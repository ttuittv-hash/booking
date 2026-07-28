import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { Quote } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

const STATUS_STYLE: Record<Quote["status"], string> = {
  ESTIMATE: "bg-warn-soft text-warn",
  CONTRACTED: "bg-accent-soft text-accent",
  SETTLED: "bg-good-soft text-good",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const quotes = listQuotes();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">신청 현황</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          신청서를 열어 심사 후 계약금액을 확정하고, 계약 확정 건에 대해서는
          행사 종료 후 정산을 진행하세요.
        </p>

        <div className="mt-8 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">신청번호</th>
                <th className="px-4 py-3">신청일시</th>
                <th className="px-4 py-3">주차</th>
                <th className="px-4 py-3">관객</th>
                <th className="px-4 py-3 text-right">신청 예상금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    아직 접수된 신청서가 없습니다.
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
                    <td className="px-4 py-3">{q.selection.expectedAudience.toLocaleString()}명</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {won(q.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium ${STATUS_STYLE[q.status]}`}
                      >
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/${q.id}`} className="font-medium text-accent hover:underline">
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
