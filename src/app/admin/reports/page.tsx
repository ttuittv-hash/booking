import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getSignupStats,
  getTrafficStats,
  listCompanies,
  listQuotes,
  sumContractAddendumsByQuote,
  todayInSeoul,
} from "@/lib/db";
import { buildReportStats, type ReportVenueTab } from "@/lib/reportStats";
import { buildRevenueStats } from "@/lib/revenueStats";
import { bucketLabel, parseGranularity, resolveRange } from "@/lib/trafficRange";
import { num } from "@/lib/format";
import { VENUES } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import { TrafficControls, trafficHref, type TrafficQuery } from "@/components/admin/TrafficControls";
import {
  CARD,
  PAGE_LEAD,
  PAGE_TITLE,
  SECTION_TITLE,
  TAB_BAR,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
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

const GRANULARITY_LABEL: Record<string, string> = { day: "일간", week: "주간", month: "월간" };

/** 공간 탭 — "전체" + 등록된 공간들. 값은 URL(?venue=)에 그대로 실린다. */
const VENUE_TABS: { key: ReportVenueTab; label: string }[] = [
  { key: "all", label: "전체" },
  ...VENUES.map((v) => ({ key: v.id as ReportVenueTab, label: v.name })),
];

function resolveVenueTab(raw: string | undefined): ReportVenueTab {
  return VENUE_TABS.some((t) => t.key === raw) ? (raw as ReportVenueTab) : "all";
}

/*
  리포트 최상위 탭 (2026-08-29).

    유입  사람이 들어오고 가입하는 흐름 — 공간과 무관하다.
    매출  신청서에 걸린 돈의 흐름 — 공간 탭(아레나/중형)이 그 안에서 다시 나뉜다.

  한 화면에 다 쌓으니 스크롤이 길어져 "지금 무엇을 보는 중인지" 가 흐려졌다.
*/
type ReportTab = "traffic" | "revenue";

const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "traffic", label: "유입" },
  { key: "revenue", label: "매출" },
];

function resolveReportTab(raw: string | undefined): ReportTab {
  return raw === "revenue" ? "revenue" : "traffic";
}

/** 탭을 옮겨도 기간·공간 같은 조건은 유지한다 — 탭이 바뀔 때마다 다시 고르게 하면 안 된다. */
function reportTabHref(tab: ReportTab, sp: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (tab !== "traffic") params.set("tab", tab);
  for (const key of ["venue", "g", "days", "from", "to"] as const) {
    if (sp[key]) params.set(key, sp[key]!);
  }
  const qs = params.toString();
  return qs ? `/admin/reports?${qs}` : "/admin/reports";
}

/** href 를 주면 카드 전체가 상세 화면으로 가는 링크가 된다. */
function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </>
  );
  if (!href) return <div className={CARD}>{body}</div>;
  return (
    <Link
      href={href}
      className={`${CARD} block transition-colors hover:border-foreground focus-visible:border-foreground`}
    >
      {body}
      <p className="mt-2 text-xs font-bold text-foreground">자세히 보기 →</p>
    </Link>
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
  searchParams: Promise<{
    tab?: string;
    venue?: string;
    g?: string;
    days?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const sp = await searchParams;
  const reportTab = resolveReportTab(sp.tab);
  const venueTab = resolveVenueTab(sp.venue);
  const granularity = parseGranularity(sp.g);
  const range = resolveRange({ from: sp.from, to: sp.to, days: sp.days, today: await todayInSeoul() });

  const [quotes, companies, traffic, signups, addendumByQuote] = await Promise.all([
    listQuotes(),
    listCompanies(),
    getTrafficStats({ from: range.from, to: range.to, granularity }),
    getSignupStats(),
    sumContractAddendumsByQuote(),
  ]);
  const stats = buildReportStats(quotes, companies, new Date(), 6, venueTab);
  const revenue = buildRevenueStats(quotes, addendumByQuote, new Date(), 6, venueTab);
  const venueLabel = VENUE_TABS.find((t) => t.key === venueTab)?.label ?? "전체";

  // 공간 탭은 유입 조작부의 링크·폼에도 그대로 실려야 탭이 풀리지 않는다.
  const query: TrafficQuery = {
    granularity,
    range,
    extra: { venue: venueTab === "all" ? undefined : venueTab },
  };
  const trafficDetailHref = trafficHref("/admin/reports/traffic", { granularity, range }, {});
  const signupDetailHref = trafficHref("/admin/reports/signups", { granularity, range }, {});

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

        <nav className={TAB_BAR} aria-label="리포트 탭">
          {REPORT_TABS.map((t) => (
            <Link key={t.key} href={reportTabHref(t.key, sp)} className={tabCls(t.key === reportTab)}>
              {t.label}
            </Link>
          ))}
        </nav>

        {/* ── 유입 탭 ─────────────────────────────────────────────────────
            유입(페이지뷰·UV·대관신청 클릭)과 가입은 특정 공간에 묶이지 않는다.
            그래서 공간 탭은 매출 탭 안에만 둔다. */}
        {reportTab === "traffic" ? (
        <>
        <section className="mt-2">
          <h2 className={SECTION_TITLE}>유입</h2>
          <TrafficControls basePath="/admin/reports" query={query} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="페이지뷰"
              value={`${traffic.pageViews.toLocaleString("ko-KR")}회`}
              sub="화면 전환마다 1회"
              href={trafficDetailHref}
            />
            <StatCard
              label="순방문자(UV)"
              value={`${traffic.uniqueVisitors.toLocaleString("ko-KR")}명`}
              sub="브라우저 기준 · 기간 전체 중복 제거"
              href={trafficDetailHref}
            />
            <StatCard
              label="대관신청 버튼 클릭"
              value={`${traffic.applyClicks.toLocaleString("ko-KR")}회`}
              sub="/apply 로 가는 모든 버튼"
              href={trafficDetailHref}
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
              href={signupDetailHref}
            />
            <StatCard
              label="이번 달 신규 가입자"
              value={`${signups.newUsersThisMonth.toLocaleString("ko-KR")}명`}
              href={signupDetailHref}
            />
            <StatCard
              label="가입 회사 수"
              value={`${signups.totalCompanies.toLocaleString("ko-KR")}곳`}
              sub="승인 여부 무관"
              href={signupDetailHref}
            />
            <StatCard
              label="이번 달 신규 회사"
              value={`${signups.newCompaniesThisMonth.toLocaleString("ko-KR")}곳`}
              href={signupDetailHref}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>
            {GRANULARITY_LABEL[granularity]} 유입 추이
          </h2>
          <div className={`mt-3 ${TABLE_CARD}`}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>구간</th>
                    <th className={TH_NUM}>페이지뷰</th>
                    <th className={TH_NUM}>순방문자</th>
                    <th className={TH_NUM}>대관신청 클릭</th>
                  </tr>
                </thead>
                <tbody>
                  {traffic.buckets.map((b) => (
                    <tr key={b.bucket} className={TR}>
                      <td className={TD_ID}>{bucketLabel(b.bucket, granularity)}</td>
                      <td className={TD_NUM}>{b.pageViews.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{b.uniqueVisitors.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{b.applyClicks.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                  {traffic.buckets.length === 0 && (
                    <tr className={TR}>
                      <td className={`${TD_MUTED} text-center`} colSpan={4}>
                        이 기간에 수집된 방문 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* 구간별 UV 를 세로로 더해도 위 카드의 순방문자와 맞지 않는다 — 같은 사람이
              여러 구간에 오면 각 구간에서 1로 세기 때문이다. 미리 적어 둔다. */}
          <p className="mt-2 text-xs text-muted">
            구간별 순방문자를 더한 값은 위 순방문자 합계와 다릅니다 — 같은 방문자가 여러 구간에
            나타나면 각 구간에서 한 번씩 세기 때문입니다.
          </p>
        </section>

        </>
        ) : (
        <>
        {/* ── 매출 탭 ─────────────────────────────────────────────────────
            아래 지표는 전부 신청서에 걸려 있어 공간(아레나/중형)으로 나뉜다.
            공간 탭 상태는 URL(?venue=)에 남긴다 — 다른 운영 화면의 탭 규칙과 같다. */}
        <section className="mt-2">
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
                href={reportTabHref(reportTab, { ...sp, venue: t.key === "all" ? undefined : t.key })}
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

        {/* ── 매출 ───────────────────────────────────────────────────────
            금액은 접수 → 계약 → 확정 세 단계를 지난다. 한 숫자로 뭉치면
            "얼마를 벌었나"에 답할 수 없다. 공간 탭이 그대로 적용된다. */}
        <section className="mt-10 border-t border-border/20 pt-6">
          <h2 className={SECTION_TITLE}>매출 · {venueLabel}</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            <b>접수</b>는 신청 시점의 견적, <b>계약</b>은 계약금액(부속합의 반영),{" "}
            <b>확정 매출</b>은 정산까지 끝난 최종 금액입니다. 계약만 되고 정산 전인 건은 금액이 더
            움직일 수 있어 확정 매출에 넣지 않고 따로 셉니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="접수 건수"
              value={`${revenue.submittedCount.toLocaleString("ko-KR")}건`}
              sub={`견적 합계 ${num(revenue.submittedTotal)}원`}
            />
            <StatCard
              label="계약 건수"
              value={`${revenue.contractedCount.toLocaleString("ko-KR")}건`}
              sub={`계약금액 ${num(revenue.contractedTotal)}원`}
            />
            <StatCard
              label="총 확정 매출"
              value={`${num(revenue.settledTotal)}원`}
              sub={`정산 완료 ${revenue.settledCount.toLocaleString("ko-KR")}건`}
            />
            <StatCard
              label="정산 예정"
              value={`${num(revenue.pendingSettlementTotal)}원`}
              sub={`계약 후 정산 전 ${revenue.pendingSettlementCount.toLocaleString("ko-KR")}건`}
            />
          </div>
          {revenue.addendumTotal !== 0 && (
            <p className="mt-3 text-xs text-muted">
              계약금액에는 부속합의 {num(revenue.addendumTotal)}원이 반영되어 있습니다.
            </p>
          )}

          <div className={`mt-4 ${TABLE_CARD}`}>
            <div className={TABLE_HEAD}>
              <div>
                <p className={TABLE_HEAD_TITLE}>월별 매출 추이 (최근 6개월)</p>
                <p className={TABLE_HEAD_DESC}>
                  단계마다 잡히는 날짜가 다릅니다 — 접수는 신청일, 계약은 계약금액 확정일, 확정
                  매출은 정산 확정일 기준입니다. 그래서 한 건이 서로 다른 달에 나타날 수 있습니다.
                </p>
              </div>
            </div>
            <div className={TABLE_SCROLL}>
              <table className={`${TABLE} min-w-[640px]`}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>월</th>
                    <th className={TH_NUM}>접수</th>
                    <th className={TH_NUM}>견적 금액</th>
                    <th className={TH_NUM}>계약</th>
                    <th className={TH_NUM}>계약금액</th>
                    <th className={TH_NUM}>확정 매출</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.monthly.map((m) => (
                    <tr key={m.key} className={TR}>
                      <td className={TD_ID}>{m.label}</td>
                      <td className={TD_NUM}>{m.submittedCount.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.submittedTotal)}원</td>
                      <td className={TD_NUM}>{m.contractedCount.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.contractedTotal)}원</td>
                      <td className={TD_NUM}>{num(m.settledTotal)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        </>
        )}
      </main>
    </div>
  );
}
