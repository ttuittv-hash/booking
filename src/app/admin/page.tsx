import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, listCompanies, listQuotes } from "@/lib/db";
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { companyId } = await searchParams;
  const quotes = companyId ? listQuotes({ companyId }) : listQuotes();
  const companies = listCompanies();
  const rows = quotes.map((q) => ({ quote: q, applicant: findUserById(q.applicantId) }));

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">신청 현황</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          신청서를 열어 심사 후 계약금액을 확정하고, 계약 확정 건에 대해서는
          행사 종료 후 정산을 진행하세요.
        </p>

        <form method="GET" className="mt-6 flex items-center gap-2">
          <label className="text-[12.5px] font-medium text-muted" htmlFor="companyId">
            회사별 보기
          </label>
          <select
            id="companyId"
            name="companyId"
            defaultValue={companyId ?? ""}
            className="rounded-sm border border-border bg-panel px-3 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            <option value="">전체 회사</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-sm border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            적용
          </button>
          {companyId && (
            <Link href="/admin" className="text-[12.5px] text-muted hover:text-foreground">
              필터 해제
            </Link>
          )}
        </form>

        <div className="mt-6 overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">신청번호</th>
                <th className="px-4 py-3">신청일시</th>
                <th className="px-4 py-3">신청자</th>
                <th className="px-4 py-3">회사</th>
                <th className="px-4 py-3">주차</th>
                <th className="px-4 py-3">관객</th>
                <th className="px-4 py-3 text-right">신청 예상금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    아직 접수된 신청서가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map(({ quote: q, applicant }) => (
                  <tr key={q.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{q.id}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(q.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">{applicant?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-muted">{applicant?.companyName ?? "-"}</td>
                    <td className="px-4 py-3">
                      {q.selection.week.year}.{q.selection.week.month} {q.selection.week.weekOfMonth}주차
                    </td>
                    <td className="px-4 py-3">{q.selection.expectedAudience.toLocaleString()}명</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {won(q.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-sm px-2.5 py-1 text-[11.5px] font-medium ${STATUS_STYLE[q.status]}`}
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
