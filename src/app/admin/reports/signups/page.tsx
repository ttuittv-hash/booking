import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSignupStats, getSignupTrend, listCompanies, listUsers, todayInSeoul } from "@/lib/db";
import { bucketLabel, parseGranularity, resolveRange } from "@/lib/trafficRange";
import { AdminNav } from "@/components/admin/AdminNav";
import { TrafficControls, type TrafficQuery } from "@/components/admin/TrafficControls";
import {
  CARD,
  PAGE_LEAD,
  PAGE_TITLE,
  QUIET_BTN,
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

const GRANULARITY_LABEL: Record<string, string> = { day: "일간", week: "주간", month: "월간" };
const APPROVAL_LABEL: Record<string, string> = {
  APPROVED: "승인 완료",
  PENDING: "승인 대기",
  REJECTED: "미승인",
};
const COMPANY_STATUS_LABEL: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "미승인",
  SUSPENDED: "정지",
};

const RECENT_LIMIT = 20;

// 가입 상세 (2026-08-28) — 요약 화면의 가입 카드를 누르면 여기로 온다.
export default async function SignupDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; days?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const sp = await searchParams;
  const granularity = parseGranularity(sp.g);
  const range = resolveRange({ from: sp.from, to: sp.to, days: sp.days, today: await todayInSeoul() });
  const query: TrafficQuery = { granularity, range };

  const [stats, trend, applicants, companies] = await Promise.all([
    getSignupStats(),
    getSignupTrend({ from: range.from, to: range.to, granularity }),
    listUsers({ role: "APPLICANT" }),
    listCompanies(),
  ]);

  // 목록은 최근 가입 순으로 조금만 보여준다 — 전체 관리는 회원 관리 화면의 몫이다.
  const recentUsers = [...applicants].reverse().slice(0, RECENT_LIMIT);
  const recentCompanies = [...companies]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_LIMIT);

  const rangeUsers = trend.reduce((sum, b) => sum + b.users, 0);
  const rangeCompanies = trend.reduce((sum, b) => sum + b.companies, 0);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/reports" user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:py-10">
        <header className="pb-5">
          <Link href="/admin/reports" className={QUIET_BTN}>
            ← 리포트로
          </Link>
          <h1 className={`${PAGE_TITLE} mt-2`}>가입 상세</h1>
          <p className={PAGE_LEAD}>
            신규 가입자와 신규 회사가 언제 얼마나 늘었는지 봅니다. 계정 승인·정지 같은 관리는{" "}
            <Link href="/admin/applicants" className="font-bold text-foreground underline underline-offset-4">
              회원 관리
            </Link>
            에서 합니다.
          </p>
        </header>

        <TrafficControls basePath="/admin/reports/signups" query={query} />

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={CARD}>
            <p className="text-xs text-muted">기간 내 신규 가입자</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {rangeUsers.toLocaleString("ko-KR")}명
            </p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-muted">기간 내 신규 회사</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {rangeCompanies.toLocaleString("ko-KR")}곳
            </p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-muted">누적 가입자</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {stats.totalUsers.toLocaleString("ko-KR")}명
            </p>
            <p className="mt-1 text-xs text-muted">탈퇴 계정 제외 · 기간과 무관</p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-muted">누적 회사</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {stats.totalCompanies.toLocaleString("ko-KR")}곳
            </p>
            <p className="mt-1 text-xs text-muted">승인 여부 무관 · 기간과 무관</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>{GRANULARITY_LABEL[granularity]} 가입 추이</h2>
          <div className={`mt-3 ${TABLE_CARD}`}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>구간</th>
                    <th className={TH_NUM}>신규 가입자</th>
                    <th className={TH_NUM}>신규 회사</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((b) => (
                    <tr key={b.bucket} className={TR}>
                      <td className={TD_ID}>{bucketLabel(b.bucket, granularity)}</td>
                      <td className={TD_NUM}>{b.users.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{b.companies.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                  {trend.length === 0 && (
                    <tr className={TR}>
                      <td className={`${TD_MUTED} text-center`} colSpan={3}>
                        이 기간에 새로 가입한 계정·회사가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={TABLE_CARD}>
            <div className="border-b border-border-soft px-4 py-3.5">
              <p className="text-s font-bold">최근 가입자 {RECENT_LIMIT}명</p>
            </div>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>이름</th>
                    <th className={TH}>회사</th>
                    <th className={TH}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id} className={TR}>
                      <td className={TD_ID}>{u.name}</td>
                      <td className={TD}>{u.companyName ?? "—"}</td>
                      <td className={TD}>{APPROVAL_LABEL[u.approvalStatus] ?? u.approvalStatus}</td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr className={TR}>
                      <td className={`${TD_MUTED} text-center`} colSpan={3}>
                        가입한 계정이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={TABLE_CARD}>
            <div className="border-b border-border-soft px-4 py-3.5">
              <p className="text-s font-bold">최근 등록 회사 {RECENT_LIMIT}곳</p>
            </div>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>회사명</th>
                    <th className={TH}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompanies.map((c) => (
                    <tr key={c.id} className={TR}>
                      <td className={TD_ID}>{c.name}</td>
                      <td className={TD}>{COMPANY_STATUS_LABEL[c.status] ?? c.status}</td>
                    </tr>
                  ))}
                  {recentCompanies.length === 0 && (
                    <tr className={TR}>
                      <td className={`${TD_MUTED} text-center`} colSpan={2}>
                        등록된 회사가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="mt-4 text-xs text-muted">
          최근 목록은 기간 설정과 무관하게 항상 가장 최근 {RECENT_LIMIT}건을 보여줍니다.
        </p>
      </main>
    </div>
  );
}
