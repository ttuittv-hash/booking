import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrafficByPath, getTrafficStats, todayInSeoul } from "@/lib/db";
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

// 유입 상세 (2026-08-28) — 요약 화면의 유입 카드를 누르면 여기로 온다.
// 기간·단위는 요약 화면에서 보던 그대로 넘어온다(URL 파라미터를 그대로 물고 온다).
export default async function TrafficDetailPage({
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

  const [traffic, paths] = await Promise.all([
    getTrafficStats({ from: range.from, to: range.to, granularity }),
    getTrafficByPath({ from: range.from, to: range.to }),
  ]);

  const topPathViews = paths[0]?.pageViews ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/reports" user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:py-10">
        <header className="pb-5">
          <Link href="/admin/reports" className={QUIET_BTN}>
            ← 리포트로
          </Link>
          <h1 className={`${PAGE_TITLE} mt-2`}>유입 상세</h1>
          <p className={PAGE_LEAD}>
            페이지뷰·순방문자(UV)·대관신청 버튼 클릭을 기간과 단위를 바꿔 가며 봅니다. 어떤
            화면이 많이 열렸는지도 함께 확인할 수 있습니다.
          </p>
        </header>

        <TrafficControls basePath="/admin/reports/traffic" query={query} />

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className={CARD}>
            <p className="text-xs text-muted">페이지뷰</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {traffic.pageViews.toLocaleString("ko-KR")}회
            </p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-muted">순방문자(UV)</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {traffic.uniqueVisitors.toLocaleString("ko-KR")}명
            </p>
          </div>
          <div className={CARD}>
            <p className="text-xs text-muted">대관신청 버튼 클릭</p>
            <p className="mt-1.5 type-kr-heading text-h5-m tabular-nums">
              {traffic.applyClicks.toLocaleString("ko-KR")}회
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>{GRANULARITY_LABEL[granularity]} 추이</h2>
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
        </section>

        <section className="mt-8">
          <h2 className={SECTION_TITLE}>화면별 조회 (상위 50)</h2>
          <div className={`mt-3 ${TABLE_CARD}`}>
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>경로</th>
                    <th className={TH_NUM}>페이지뷰</th>
                    <th className={TH_NUM}>순방문자</th>
                    <th className={TH}>비중</th>
                  </tr>
                </thead>
                <tbody>
                  {paths.map((p) => (
                    <tr key={p.path} className={TR}>
                      <td className={`${TD_ID} font-mono text-xs`}>{p.path}</td>
                      <td className={TD_NUM}>{p.pageViews.toLocaleString("ko-KR")}</td>
                      <td className={TD_NUM}>{p.uniqueVisitors.toLocaleString("ko-KR")}</td>
                      <td className={TD}>
                        {/* 1위 대비 막대 — 눈금 없이 상대 크기만 보여준다. */}
                        <span className="block h-1.5 w-full bg-border/25" aria-hidden>
                          <span
                            className="block h-full bg-accent"
                            style={{
                              width: topPathViews > 0 ? `${(p.pageViews / topPathViews) * 100}%` : "0%",
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paths.length === 0 && (
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
          <p className="mt-2 text-xs text-muted">
            경로에서 쿼리스트링은 지우고 저장합니다 — 검색어·토큰이 그대로 남지 않도록 하기
            위함이라, 같은 화면은 조건과 무관하게 한 줄로 합쳐집니다.
          </p>
        </section>
      </main>
    </div>
  );
}
