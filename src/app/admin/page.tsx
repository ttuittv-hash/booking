import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, listCompanies, listQuotes } from "@/lib/db";
import { num } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminQuoteTable } from "@/components/admin/AdminQuoteTable";
import { FIELD, NONE, PAGE_LEAD, PAGE_TITLE, QUIET_BTN } from "@/components/admin/adminUi";

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
  // 날짜/통화 포맷은 로케일에 따라 서버·브라우저 렌더링 결과가 달라져 하이드레이션 불일치를
  // 일으킬 수 있으므로, 클라이언트 컴포넌트로 넘기기 전에 서버에서 미리 문자열로 포맷한다.
  const rows = quotes.map((q) => {
    const applicant = findUserById(q.applicantId);
    return {
      id: q.id,
      createdAtLabel: new Date(q.createdAt).toLocaleString("ko-KR"),
      applicantName: applicant?.name ?? NONE,
      companyName: applicant?.companyName ?? NONE,
      weekLabel: `${q.selection.week.year}.${q.selection.week.month} ${q.selection.week.weekOfMonth}주차`,
      audienceLabel: q.selection.expectedAudience.toLocaleString("ko-KR"),
      totalLabel: num(q.total),
      status: q.status,
    };
  });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>신청 현황</h1>
          <p className={PAGE_LEAD}>
            신청서를 열어 심사 후 계약금액을 확정하고, 계약 확정 건에 대해서는
            행사 종료 후 정산을 진행하세요.
          </p>
        </header>

        <form method="GET" className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-muted" htmlFor="companyId">
            회사별 보기
          </label>
          <select
            id="companyId"
            name="companyId"
            defaultValue={companyId ?? ""}
            className={`w-56 ${FIELD} py-1.5`}
          >
            <option value="">전체 회사</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={btnClass("secondary", "sm")}>
            적용
          </button>
          {companyId && (
            <Link href="/admin" className={QUIET_BTN}>
              필터 해제
            </Link>
          )}
        </form>

        <div className="mt-6">
          <AdminQuoteTable rows={rows} />
        </div>
      </main>
    </div>
  );
}
