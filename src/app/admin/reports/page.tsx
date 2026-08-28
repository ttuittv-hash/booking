import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSignupStats, getTrafficStats, listCompanies, listQuotes } from "@/lib/db";
import { buildReportStats, type ReportVenueTab } from "@/lib/reportStats";
import { num } from "@/lib/format";
import { VENUES } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  CARD,
  PAGE_LEAD,
  PAGE_TITLE,
  SECTION_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_SCROLL,
  tabCls,
  TD,
  TD_ID,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

const TRAFFIC_RANGE_DAYS = 30;

/** 공간 탭 — "전체" + 등록된 공간들. 값은 URL(?venue=)에 그대로 실린다. */
const VENUE_TABS: { key: ReportVenueTab; label: string }[] = [
  { key: "all", label: "전체" },
  ...VENUES.map((v) => ({ key: v.id as ReportVenueTab, label: v.name })),
];

function resolveVenueTab(raw: string | undefined): ReportVenueTab {
  return VENUE_TABS.some((t) => t.key === raw) ? (raw as ReportVenueTab) : "all";
}

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

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const venueTab = resolveVenueTab((await searchParams).venue);
  const [quotes, companies, traffic, signups] = await Promise.all([
    listQuotes(),
    listCompanies(),
    getTrafficStats(TRAFFIC_RANGE_DAYS),
    getSignupStats(),
  ]);
  const stats = buildReportStats(quotes, companies, new Date(), 6, venueTab);
  const venueLabel = VENUE_TABS.find((t) => t.key === venueTab)?.label ?? "전체";

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/reports" user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <header className="pb-5">
          <h1 className={PAGE_TITLE}>리포트</h1>
          <p className={PAGE_LEAD}>
            유입·가입·신청·심사·계약 현황을 한눈에 볼 수 있는 인사이트 화면입니다. 조회 시점
            기준으로 매번 새로 집계합니다.
          </p>
        </header>

        {/* ── 공간과 무관한 지표 ───────────────────────────────────────────
            유입(페이지뷰·UV·대관신청 클릭)과 가입은 특정 공간에 묶이지 않는다.
            그래서 아래 공간 탭 **바깥**에 둔다 — 탭을 바꿔도 이 숫자는 그대로다. */}
        <section className="mt-2">
          <h2 className={SECTION_TITLE}>유입 (최근 {TRAFFIC_RANGE_DAYS}일)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="페이지뷰"
              value={`${traffic.pageViews.toLocaleString("ko-KR")}회`}
              sub="화면 전환마다 1회"
            />
            <StatCard
              label="순방문자(UV)"
              value={`${traffic.uniqueVisitors.toLocaleString("ko-KR")}명`}
              sub="브라우저 기준 · 기간 전체 중복 제거"
            />
            <StatCard
              label="대관신청 버튼 클릭"
              value={`${traffic.applyClicks.toLocaleString("ko-KR")}회`}
              sub="/apply 로 가는 모든 버튼"
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>가입</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="가입자 수"
              value={`${signups.totalUsers.toLocaleString("ko-KR")}명`}
              sub="탈퇴 계정 제외"
            />
            <StatCard
              label="이번 달 신규 가입자"
              value={`${signups.newUsersThisMonth.toLocaleString("ko-KR")}명`}
            />
            <StatCard
              label="가입 회사 수"
              value={`${signups.totalCompanies.toLocaleString("ko-KR")}곳`}
              sub="승인 여부 무관"
            />
            <StatCard
              label="이번 달 신규 회사"
              value={`${signups.newCompaniesThisMonth.toLocaleString("ko-KR")}곳`}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>일별 유입 추이</h2>
          <div className={`mt-3 ${TABLE_CARD}`}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>날짜</th>
                    <th className={TH_NUM}>페이지뷰</th>
                    <th className={TH_NUM}>순방문자</th>
                    <th className={TH_NUM}>대관신청 클릭</th>
                  </tr>
                </thead>
                <tbody>
                  {traffic.daily.map((d) => (
                    <tr key={d.day} className={TR}>
                      <td className={TD_ID}>{d.day}</td>
                      <td className={TD_NUM}>{d.pageViews.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{d.uniqueVisitors.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{d.applyClicks.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                  {traffic.daily.length === 0 && (
                    <tr className={TR}>
                      <td className={`${TD_MUTED} text-center`} colSpan={4}>
                        아직 수집된 방문 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 공간별 지표 ─────────────────────────────────────────────────
            아래 지표는 전부 신청서에 걸려 있어 공간(아레나/중형)으로 나뉜다.
            탭 상태는 URL(?venue=)에 남긴다 — 다른 운영 화면의 탭 규칙과 같다. */}
        <section className="mt-10 border-t border-border/20 pt-6">
          <h2 className={SECTION_TITLE}>공간별 신청 현황</h2>
          {/* 페이지 상단 탭(TAB_BAR)이 아니라 섹션 안의 하위 탭이다 — sticky·full-bleed
              없이 탭 모양(tabCls)만 같이 쓴다. */}
          <nav
            className="mt-2 flex h-12 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border/20 [contain:paint]"
            aria-label="공간 탭"
          >
            {VENUE_TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/admin/reports" : `/admin/reports?venue=${t.key}`}
                className={tabCls(t.key === venueTab)}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 text-xs text-muted">
            {venueTab === "all"
              ? "모든 공간의 신청서를 함께 집계합니다."
              : `${venueLabel}에 걸린 신청서만 집계합니다. 동시 대관(아레나+중형) 건은 두 공간 탭에 모두 잡히므로, 탭별 건수의 합은 전체보다 클 수 있습니다.`}
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
