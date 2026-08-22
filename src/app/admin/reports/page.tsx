import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCompanies, listQuotes } from "@/lib/db";
import { buildReportStats } from "@/lib/reportStats";
import { num } from "@/lib/format";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  CARD,
  PAGE_LEAD,
  PAGE_TITLE,
  SECTION_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_SCROLL,
  TD,
  TD_ID,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  showTotal,
}: {
  title: string;
  rows: { key: string; label: string; count: number; total: number }[];
  showTotal?: boolean;
}) {
  return (
    <div className={TABLE_CARD}>
      <div className="border-b border-border-soft px-4 py-3.5">
        <p className="text-s font-bold">{title}</p>
      </div>
      <div className={TABLE_SCROLL}>
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>구분</th>
              <th className={TH_NUM}>건수</th>
              {showTotal && <th className={TH_NUM}>대관료 합계</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={TR}>
                <td className={TD}>{row.label}</td>
                <td className={TD_NUM}>{row.count.toLocaleString("ko-KR")}건</td>
                {showTotal && <td className={TD_NUM}>{num(row.total)}원</td>}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className={TR}>
                <td className={`${TD_MUTED} text-center`} colSpan={showTotal ? 3 : 2}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const [quotes, companies] = await Promise.all([listQuotes(), listCompanies()]);
  const stats = buildReportStats(quotes, companies, new Date());

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/reports" user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>리포트</h1>
          <p className={PAGE_LEAD}>
            신청·심사·계약 현황을 한눈에 볼 수 있는 인사이트 화면입니다. 조회 시점 기준으로 매번
            새로 집계하며, 별도로 저장되는 값은 없습니다.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="누적 신청 건수" value={`${stats.totalQuotes.toLocaleString("ko-KR")}건`} />
          <StatCard label="이번 달 신규 신청" value={`${stats.newThisMonth.toLocaleString("ko-KR")}건`} />
          <StatCard label="심사 대기" value={`${stats.pendingReview.toLocaleString("ko-KR")}건`} />
          <StatCard
            label="계약 확정"
            value={`${stats.contractedCount.toLocaleString("ko-KR")}건`}
            sub={`계약금액 합계 ${num(stats.contractedTotal)}원`}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownTable title="심사 결과 분포" rows={stats.reviewBreakdown} />
          <BreakdownTable title="공간별 신청 현황" rows={stats.venueBreakdown} showTotal />
          <BreakdownTable title="법인회원 승인 현황" rows={stats.companyBreakdown} />
          <div className={CARD}>
            <p className="text-s font-bold">정산 완료</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {stats.settledCount.toLocaleString("ko-KR")}건
            </p>
            <p className="mt-1 text-xs text-muted">
              계약 확정 {stats.contractedCount.toLocaleString("ko-KR")}건 중 정산까지 마친 건수입니다.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>월별 신청 추이 (최근 6개월)</h2>
          <div className={`mt-3 ${TABLE_CARD}`}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>월</th>
                    <th className={TH_NUM}>신청 건수</th>
                    <th className={TH_NUM}>대관료 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthly.map((m) => (
                    <tr key={m.key} className={TR}>
                      <td className={TD_ID}>{m.label}</td>
                      <td className={TD_NUM}>{m.count.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.total)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
