import { ReportBars } from "@/components/admin/ReportBars";
import { ReportTimeTabs } from "@/components/admin/ReportTimeTabs";
import { reportPeriod, completeBuckets } from "@/lib/reportPeriod";
import { ReportTrendChart } from "@/components/admin/ReportTrendChart";
import Link from "next/link";
import { requireProAdminPage } from "@/lib/auth";
import {
  getSignupStats,
  getSignupTrend,
  getTrafficByPath,
  getMessageTrend,
  listUsers,
  getTrafficStats,
  listCompanies,
  listQuotes,
  getFunnelStats,
  getOpsStats,
  listStalledCompanies,
  sumContractAddendumsByQuote,
  todayInSeoul,
} from "@/lib/db";
import { buildReportStats, type ReportVenueTab } from "@/lib/reportStats";
import { buildRevenueStats } from "@/lib/revenueStats";
import { bucketLabel } from "@/lib/trafficRange";
import { num } from "@/lib/format";
import { VENUES } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAwsMonitoring } from "@/lib/monitoringAws";
import { type TrafficQuery } from "@/components/admin/TrafficControls";
import {
  CARD,
  PAGE_LEAD,
  PAGE_TITLE,
  SECTION_TITLE,
  TAB_BAR,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  tabCls,
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
type ReportTab = "traffic" | "funnel" | "revenue" | "ops";

const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "traffic", label: "유입" },
  // [신규 2026-09-10] 퍼널 — "어느 단계에서 멈췄나". B2B라 익명 집계보다 이게 중요하다.
  { key: "funnel", label: "퍼널" },
  { key: "revenue", label: "매출" },
  // [신규 2026-09-10] 모니터링 — 앞 셋이 사업 지표라면 이쪽은 시스템 지표(처리 대기·발송 실패·차단·서버).
  { key: "ops", label: "모니터링" },
];

function resolveReportTab(raw: string | undefined): ReportTab {
  if (raw === "revenue") return "revenue";
  if (raw === "funnel") return "funnel";
  if (raw === "ops") return "ops";
  return "traffic";
}

/** 탭을 옮겨도 기간·공간 같은 조건은 유지한다 — 탭이 바뀔 때마다 다시 고르게 하면 안 된다. */
function reportTabHref(tab: ReportTab, sp: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (tab !== "traffic") params.set("tab", tab);
  for (const key of ["venue", "g", "days", "from", "to", "period"] as const) {
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
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="admin-stat-value mt-1.5 type-kr-heading text-h5-m tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </>
  );
  return <div className={`${CARD} admin-stat-card`}>{body}</div>;
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
  return <section className={TABLE_CARD}><h2 className={SECTION_TITLE}>{title}</h2><ReportBars rows={rows.map(r=>({label:r.label,value:r.count,detail:showTotal?`대관료 합계 ${num(r.total)}원`:undefined}))}/></section>;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    tab?: string;
    venue?: string;
    g?: string;
    days?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await requireProAdminPage();

  const sp = await searchParams;
  const reportTab = resolveReportTab(sp.tab);
  const venueTab = resolveVenueTab(sp.venue);
  const {mode,granularity,range} = reportPeriod({...sp,period:sp.period==="hour"&&reportTab!=="ops"?"day":sp.period}, await todayInSeoul());

  const [quotes, companies, traffic, signups, addendumByQuote, funnel, stalled, ops, aws, signupTrend, paths, messageTrend, applicants] = await Promise.all([
    listQuotes(),
    listCompanies(),
    getTrafficStats({ from: range.from, to: range.to, granularity }),
    getSignupStats(),
    sumContractAddendumsByQuote(),
    getFunnelStats({ from: range.from, to: range.to }),
    listStalledCompanies(50),
    getOpsStats({ from: range.from, to: range.to, hourly: mode === "hour" }),
    getAwsMonitoring({ from: range.from, to: range.to, hourly: mode === "hour" }),
    getSignupTrend({from:range.from,to:range.to,granularity}),
    getTrafficByPath(range),
    getMessageTrend({...range,granularity,hourly:mode === "hour"}),
    listUsers({role:"APPLICANT"}),
  ]);
  const stats = buildReportStats(quotes, companies, new Date(), 6, venueTab);
  const revenue = buildRevenueStats(quotes, addendumByQuote, new Date(), 6, venueTab);
  const venueLabel = VENUE_TABS.find((t) => t.key === venueTab)?.label ?? "전체";

  // 공간 탭은 유입 조작부의 링크·폼에도 그대로 실려야 탭이 풀리지 않는다.
  // [버그 수정 2026-09-11] 리포트 탭(tab)도 같이 실어야 한다 — 퍼널·모니터링 탭에서
  // 「최근 30일/90일」이나 기간 적용을 누르면 tab 이 빠져 유입 탭으로 되돌아갔다.
  const query: TrafficQuery = {
    granularity,
    range,
    extra: {
      venue: venueTab === "all" ? undefined : venueTab,
      tab: reportTab === "traffic" ? undefined : reportTab,
    },
  };


  return (
    <div className="admin-page admin-reports flex flex-1 flex-col">
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
        <ReportTimeTabs from={range.from} to={range.to} mode={mode} extra={query.extra} />
        <section className="admin-report-section mt-2">
          <h2 className={SECTION_TITLE}>유입</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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



        <section className="admin-report-section mt-8">
          <h2 className={SECTION_TITLE}>
            {GRANULARITY_LABEL[granularity]} 유입 추이
          </h2>
          <ReportTrendChart points={completeBuckets(traffic.buckets,range.from,range.to,granularity,bucket=>({bucket,pageViews:0,uniqueVisitors:0,applyClicks:0})).map(b => ({label:bucketLabel(b.bucket,granularity),values:[b.pageViews,b.uniqueVisitors,b.applyClicks]}))} series={[{label:"페이지뷰",unit:"회",color:"#222222"},{label:"순방문자",unit:"명",color:"#337a9a"},{label:"대관신청 클릭",unit:"회",color:"#b78317"}]}/>
          {/* 구간별 UV 를 세로로 더해도 위 카드의 순방문자와 맞지 않는다 — 같은 사람이
              여러 구간에 오면 각 구간에서 1로 세기 때문이다. 미리 적어 둔다. */}
          <p className="mt-2 text-xs text-muted">
            구간별 순방문자를 더한 값은 위 순방문자 합계와 다릅니다 — 같은 방문자가 여러 구간에
            나타나면 각 구간에서 한 번씩 세기 때문입니다.
          </p>
        </section>

        <section className="admin-report-section mt-8">
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

        <section className="admin-report-section"><h2 className={SECTION_TITLE}>가입 추이</h2><p className="text-xs text-muted">선택 기간 내 가입자·회사. 그래프에서 구간별 수치를 확인할 수 있습니다.</p><ReportTrendChart points={completeBuckets(signupTrend,range.from,range.to,granularity,bucket=>({bucket,users:0,companies:0})).map(b=>({label:bucketLabel(b.bucket,granularity),values:[b.users,b.companies]}))} series={[{label:"신규 가입자",unit:"명",color:"#337a9a"},{label:"신규 회사",unit:"곳",color:"#222222"}]}/><details className="mt-4"><summary>최근 가입자·회사 각 20건 (기간과 무관)</summary><div className="grid gap-4 sm:grid-cols-2 mt-4"><ul>{[...applicants].reverse().slice(0,20).map(u=><li key={u.id} className="text-xs py-2">{u.name} · {u.companyName??'—'} · {{APPROVED:'승인 완료',PENDING:'승인 대기',REJECTED:'미승인',HOLD:'보류'}[u.approvalStatus]??u.approvalStatus}</li>)}</ul><ul>{[...companies].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20).map(c=><li className="text-xs py-2" key={c.id}>{c.name} · {{PENDING:'승인 대기',APPROVED:'승인 완료',REJECTED:'미승인',SUSPENDED:'정지'}[c.status]??c.status}</li>)}</ul></div></details></section>
        <section className="admin-report-section"><h2 className={SECTION_TITLE}>화면별 조회 (상위 50)</h2><ReportBars rows={paths.map(p=>({label:p.path,value:p.pageViews,unit:"회",detail:`순방문자 ${p.uniqueVisitors}명`}))}/></section>
        </>
        ) : reportTab === "funnel" ? (
        <>
        {/* ── 퍼널 탭 ─────────────────────────────────────────────────────
            [신규 2026-09-10] "어느 단계에서 몇이 멈췄나". 이 시스템은 B2B(대관사)라
            익명 방문 집계보다 단계별 이탈과 **멈춘 회사 목록**이 실제 운영에 쓰인다.
            숫자는 별도 추적 코드 없이 지금 있는 데이터(analytics_events · users ·
            companies · quotes)만으로 낸다. */}
        <ReportTimeTabs from={range.from} to={range.to} mode={mode} extra={query.extra} />
        <section className="admin-report-section mt-2">
          <h2 className={SECTION_TITLE}>신청 퍼널</h2>
          <ReportBars rows={funnel.map(step=>({label:step.label,value:step.count,unit:step.unit,detail:`직전 대비 ${step.rate===null?'—':`${step.rate}%`} · ${step.hint}`}))}/>
          <p className="mt-2.5 text-xs leading-5 text-muted">
            방문·가입 화면·대관신청 클릭·위저드 진입은 위 기간 안의 접속 기록 기준이고,
            가입 완료·회사 승인·신청서 제출은 그 기간에 실제로 만들어진 건수입니다.
            단계마다 세는 단위(명·곳·건)가 달라 통과율은 흐름을 보는 용도로만 읽어 주세요.
          </p>
        </section>

        <section className="admin-report-section mt-8">
          <h2 className={SECTION_TITLE}>승인 후 아직 신청서를 내지 않은 회사</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            운영자 승인을 받았지만 신청서가 없는 회사입니다. 오래 멈춘 순으로 정렬했습니다 —
            연락이 필요한 곳을 여기서 고르시면 됩니다.
          </p>
          <ReportBars rows={stalled.map(c=>({label:c.companyName,value:c.idleDays,unit:"일",detail:`담당자 ${c.memberCount}명 · ${c.reached} · 마지막 접속 ${c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}):'없음'}`}))}/>
        </section>
        </>
        ) : reportTab === "ops" ? (
        <>
        {/* ── 모니터링 탭 ───────────────────────────────────────────────────
            [신규 2026-09-10] 시스템이 잘 돌고 있나. 위쪽(처리 대기·발송)은 DB 에서,
            아래쪽(서버·차단)은 CloudWatch 에서 읽는다. AWS 조회가 실패해도 위쪽은 그대로
            나오도록 분리해 두었다 — 지표 하나 때문에 화면 전체가 막히면 안 된다. */}
        <ReportTimeTabs from={range.from} to={range.to} mode={mode} extra={query.extra} hourly />
        <section className="admin-report-section mt-2">
          <h2 className={SECTION_TITLE}>지금 처리해야 할 것</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            운영진 손이 필요한 대기 항목입니다. 기간과 무관하게 현재 상태를 보여줍니다.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="심사 대기 신청서"
              value={`${ops.pendingReviews.toLocaleString("ko-KR")}건`}
              sub="접수됐지만 승인·보류·거절 미결정"
            />
            <StatCard
              label="가입 승인 대기"
              value={`${ops.pendingCompanies.toLocaleString("ko-KR")}곳`}
              sub="회사 심사 대기"
            />
            <StatCard
              label="미답변 문의"
              value={`${ops.openInquiries.toLocaleString("ko-KR")}건`}
              sub={ops.oldestInquiryDays === null ? "없음" : `가장 오래된 건 ${ops.oldestInquiryDays}일 경과`}
            />
            <StatCard
              label="휴대폰 없는 운영자"
              value={`${ops.adminsWithoutPhone.toLocaleString("ko-KR")}명`}
              sub="알림톡이 발송되지 않는 계정"
            />
          </div>
        </section>

        <section className="admin-report-section mt-8">
          <h2 className={SECTION_TITLE}>알림톡·문자 발송</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="성공" value={`${ops.messagesSent.toLocaleString("ko-KR")}건`} sub="기간 내 발송 성공" />
            <StatCard label="실패" value={`${ops.messagesFailed.toLocaleString("ko-KR")}건`} sub="카카오·통신사가 거절" />
            <StatCard
              label="성공률"
              value={
                ops.messagesSent + ops.messagesFailed === 0
                  ? "—"
                  : `${Math.round((ops.messagesSent / (ops.messagesSent + ops.messagesFailed)) * 1000) / 10}%`
              }
            />
          </div>
          <ReportTrendChart points={messageTrend.map(m=>({label:m.bucket,values:[m.sent,m.failed]}))} series={[{label:"성공",unit:"건",color:"#337a9a"},{label:"실패",unit:"건",color:"#bf4e49"}]}/>
          <h3 className="mt-6 font-bold text-s">실패 사유</h3><ReportBars rows={ops.messageFailureTop.map(r=>({label:r.templateCode,value:r.count,detail:r.reason}))}/>
        </section>

        <section className="admin-report-section mt-8">
          <h2 className={SECTION_TITLE}>서버 · 차단</h2>
          {aws.available ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="가동 중인 서버"
                  value={aws.runningTasks === null ? "—" : `${aws.runningTasks}대`}
                  sub="자동 확장 3~12대"
                />
                <StatCard
                  label="CPU"
                  value={aws.cpuAvg === null ? "—" : `${aws.cpuAvg}%`}
                  sub={aws.cpuMax === null ? undefined : `최고 ${aws.cpuMax}%`}
                />
                <StatCard
                  label="평균 응답시간"
                  value={aws.responseTime === null ? "—" : `${Math.round(aws.responseTime * 1000)}ms`}
                />
                <StatCard
                  label="서버 오류(5xx)"
                  value={aws.serverErrors === null ? "—" : `${aws.serverErrors.toLocaleString("ko-KR")}건`}
                  sub={aws.clientErrors === null ? undefined : `요청 오류(4xx) ${aws.clientErrors.toLocaleString("ko-KR")}건`}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="방화벽 차단"
                  value={aws.blockedRequests === null ? "—" : `${aws.blockedRequests.toLocaleString("ko-KR")}건`}
                  sub="공격·과다 요청을 막은 횟수"
                />
                <StatCard
                  label="정상 통과"
                  value={aws.allowedRequests === null ? "—" : `${aws.allowedRequests.toLocaleString("ko-KR")}건`}
                />
                <StatCard
                  label="DB CPU"
                  value={aws.dbCpu === null ? "—" : `${aws.dbCpu}%`}
                />
                <StatCard
                  label="DB 접속"
                  value={aws.dbConnections === null ? "—" : `${aws.dbConnections}개`}
                  sub="최대 420개"
                />
              </div>
              <ReportBars rows={[{label:"서버 CPU",value:aws.cpuAvg,unit:"%"},{label:"DB CPU",value:aws.dbCpu,unit:"%"},{label:"메모리",value:aws.memoryAvg,unit:"%"}].filter((r):r is {label:string;value:number;unit:string}=>r.value!==null)}/>
              <ReportBars rows={[{label:"방화벽 차단",value:aws.blockedRequests},{label:"정상 통과",value:aws.allowedRequests},{label:"서버 오류(5xx)",value:aws.serverErrors},{label:"요청 오류(4xx)",value:aws.clientErrors}].filter((r):r is {label:string;value:number}=>r.value!==null)}/>
              <p className="mt-2.5 text-xs leading-5 text-muted">
                위 기간의 AWS 지표입니다. 차단 건수가 갑자기 늘면 공격일 수 있고, 서버 오류(5xx)가
                0이 아니면 확인이 필요합니다. 경보는 슬랙으로도 갑니다.
              </p>
            </>
          ) : (
            <div className={`mt-3 ${TABLE_CARD} p-5 text-s text-muted`}>{aws.reason}</div>
          )}
        </section>
        </>
        ) : (
        <>
        {/* ── 매출 탭 ─────────────────────────────────────────────────────
            아래 지표는 전부 신청서에 걸려 있어 공간(아레나/중형)으로 나뉜다.
            공간 탭 상태는 URL(?venue=)에 남긴다 — 다른 운영 화면의 탭 규칙과 같다. */}
                  {/* 페이지 상단 탭(TAB_BAR)이 아니라 섹션 안의 하위 탭이다 — sticky·full-bleed
              없이 탭 모양(tabCls)만 같이 쓴다. */}
          <nav
            className="admin-segmented mt-6"
            aria-label="공간 탭"
          >
            {VENUE_TABS.map((t) => (
              <Link
                key={t.key}
                href={reportTabHref(reportTab, { ...sp, venue: t.key === "all" ? undefined : t.key })}
                aria-current={t.key === venueTab ? "true" : undefined}
                className={tabCls(t.key === venueTab)}
              >
                {t.label}
              </Link>
            ))}
          </nav>

        <section className="admin-report-section mt-2">
          <h2 className={SECTION_TITLE}>공간별 신청 현황</h2>
          <p className="mt-3 text-xs text-muted">
            {venueTab === "all"
              ? "모든 공간의 신청서를 함께 집계합니다."
              : `${venueLabel}에 걸린 신청서만 집계합니다. 동시 대관(아레나+중형) 건은 두 공간 탭에 모두 잡히므로, 탭별 건수의 합은 전체보다 클 수 있습니다.`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="누적 신청 건수" value={`${stats.totalQuotes.toLocaleString("ko-KR")}건`} />
          <StatCard label="이번 달 신규 신청" value={`${stats.newThisMonth.toLocaleString("ko-KR")}건`} />
          <StatCard label="심사 대기" value={`${stats.pendingReview.toLocaleString("ko-KR")}건`} />
          <StatCard
            label="계약 확정"
            value={`${stats.contractedCount.toLocaleString("ko-KR")}건`}
            sub={`계약금액 합계 ${num(stats.contractedTotal)}원`}
          />
          </div>
        </section>

        <section className="admin-report-breakdowns mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownTable title="심사 결과 분포" rows={stats.reviewBreakdown} />
          <BreakdownTable title="공간별 신청 현황" rows={stats.venueBreakdown} showTotal />
          <BreakdownTable title="법인회원 승인 현황" rows={stats.companyBreakdown} />
          <div className={CARD}>
            <h2 className={SECTION_TITLE}>정산 완료</h2>
            <p className="admin-stat-value mt-1.5 type-kr-heading text-h5-m tabular-nums">
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
        <section className="admin-report-section mt-10">
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

        </section>
        <section className="admin-report-section">
          <div className={`mt-4 ${TABLE_CARD}`}>
            <div className={TABLE_HEAD}>
              <div>
                <h2 className={SECTION_TITLE}>월별 매출 추이 (최근 6개월)</h2>
                <p className={TABLE_HEAD_DESC}>
                  단계마다 잡히는 날짜가 다릅니다 — 접수는 신청일, 계약은 계약금액 확정일, 확정
                  매출은 정산 확정일 기준입니다. 그래서 한 건이 서로 다른 달에 나타날 수 있습니다.
                </p>
              </div>
            </div>
            <ReportTrendChart points={revenue.monthly.map(m=>({label:m.label,values:[m.submittedTotal,m.contractedTotal,m.settledTotal],detail:`접수 ${m.submittedCount}건 · 계약 ${m.contractedCount}건`}))} series={[{label:"견적 금액",unit:"원",color:"#999999"},{label:"계약금액",unit:"원",color:"#337a9a"},{label:"확정 매출",unit:"원",color:"#222222"}]}/>
          </div>
        </section>

        <section className="admin-report-section mt-8">
          <h2 className={SECTION_TITLE}>월별 신청 추이 (최근 6개월)</h2>
          <ReportTrendChart points={stats.monthly.map(m=>({label:m.label,values:[m.count],detail:`대관료 합계 ${num(m.total)}원`}))} series={[{label:"신청 건수",unit:"건",color:"#337a9a"}]}/>
        </section>
        </>
        )}
      </main>
    </div>
  );
}
