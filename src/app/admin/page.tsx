import Link from "next/link";
import { requireProAdminPage, isProAdminOrAbove } from "@/lib/auth";
import { getRateTableByVersion, listCompanies, listQuotesPaged, listUsersByIds, normalizePage } from "@/lib/db";
import { num } from "@/lib/format";
import { contractSectionAmounts } from "@/lib/pricing/lineItemGroups";
import { findPackage } from "@/lib/pricing/rateTableUtils";
import { VENUES, type RateTable } from "@/lib/pricing/types";
import { Pagination } from "@/components/Pagination";
import { btnClass } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminQuoteTable } from "@/components/admin/AdminQuoteTable";
import { FIELD, NONE, PAGE_LEAD, PAGE_TITLE, QUIET_BTN } from "@/components/admin/adminUi";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; page?: string }>;
}) {
  const user = await requireProAdminPage();

  const { companyId, page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: quotes, total, totalPages } = await listQuotesPaged(
    companyId ? { companyId } : {},
    page,
  );
  const companies = await listCompanies();
  const applicantIds = [...new Set(quotes.map((q) => q.applicantId))];
  const applicantById = new Map((await listUsersByIds(applicantIds)).map((u) => [u.id, u]));
  // [신규 2026-09-19] "신청 목록에서 어떤 공간·패키지를 신청했는지 표기해달라" — 패키지명은
  // 요금표(rateTable)에서 찾아야 하는데, 행마다 getRateTableByVersion 을 부르면 N+1이 된다
  // (listUsersByIds 를 쓰는 것과 같은 이유). 페이지 안의 서로 다른 버전만 한 번씩 읽는다 —
  // 실제로는 대부분 같은 버전이라 쿼리 1~2개로 끝난다.
  const rateTableVersions = [...new Set(quotes.map((q) => q.rateTableVersion))];
  const rateTableByVersion = new Map<string, RateTable>(
    await Promise.all(
      rateTableVersions.map(async (v) => [v, await getRateTableByVersion(v)] as const),
    ),
  );
  // 날짜/통화 포맷은 로케일에 따라 서버·브라우저 렌더링 결과가 달라져 하이드레이션 불일치를
  // 일으킬 수 있으므로, 클라이언트 컴포넌트로 넘기기 전에 서버에서 미리 문자열로 포맷한다.
  const rows = quotes.map((q) => {
    const applicant = applicantById.get(q.applicantId);
    const s = q.selection;
    // 동시 대관은 venueId 가 "arena"로 고정돼 있어("아레나 전용" 패키지가 그 값을 쓴다)
    // venueId만으로는 구분이 안 된다 — bookingMode를 먼저 본다.
    const venueLabel =
      s.bookingMode === "SIMULTANEOUS"
        ? "동시 대관"
        : (VENUES.find((v) => v.id === s.venueId)?.name ?? NONE);
    // 중형공연장 단독 신청은 패키지 개념이 없다(시간 단가 모델) — packageId는 아레나
    // 전용이라 이때는 항상 null이다(types.ts 주석 참고).
    const packageLabel =
      s.venueId === "medium-hall" && s.bookingMode !== "SIMULTANEOUS"
        ? NONE
        : (findPackage(rateTableByVersion.get(q.rateTableVersion)!, s.packageId)?.name ?? NONE);
    // [신규 2026-09-18] 목록에서도 계약금액과 추후 정산 예정 금액을 갈라 보여준다 —
    // 신청자가 마지막에 본 화면은 둘로 나뉘어 있는데 목록은 총액 한 칸뿐이라 "추후 정산
    // 금액이 없다"는 물음이 반복됐다(nora).
    const [contractAmount, additionalAmount] = contractSectionAmounts(q).sections;
    return {
      id: q.id,
      // [개정 2026-09-18] "가로 사이즈를 확장해야 할 것 같아요 / 스크롤이 생겼군요"(niki) —
      // "2026. 9. 18. 오후 5:10:30" 이 좁은 열 안에서 세 줄로 접혀 표를 크게 벌리고 있었다.
      // 연도는 신청번호(2026-00051)가 이미 말해 주므로 월·일·시각만 남긴다.
      // 24시간제로 둔다 — "오후 05:11"은 「오후」 두 글자가 붙어 좁은 열에서 다시 접힌다.
      createdAtLabel: new Date(q.createdAt).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      applicantName: applicant?.name ?? NONE,
      companyName: applicant?.companyName ?? NONE,
      venueLabel,
      packageLabel,
      weekLabel: `${q.selection.week.year}.${q.selection.week.month} ${q.selection.week.weekOfMonth}주차`,
      audienceLabel: q.selection.expectedAudience.toLocaleString("ko-KR"),
      contractLabel: num(contractAmount.total),
      additionalLabel: num(additionalAmount.total),
      // 정산이 0이면 계약금액 = 총액이라 보조줄이 같은 숫자를 두 번 말하게 된다 —
      // 그런 행에서는 줄을 빼서 금액 열 폭을 돌려받는다(실제 목록의 대부분이 0이다).
      hasAdditional: additionalAmount.total > 0,
      totalLabel: num(q.total),
      status: q.status,
      // [신규 2026-09-02] 승인해도 목록은 "예상견적(심사 대기)" 그대로였다 —
      // 상태 열이 진행 단계(status)만 보고 심사 결과를 안 읽었기 때문이다.
      reviewDecision: q.review?.decision ?? null,
    };
  });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin" user={user} />

      {/* [개정 2026-09-18] "가로 폭을 좀 더 늘려야 하나봐요 .. 짤리네욤"(niki) — 신청 현황은
          열이 14개(공간·패키지·계약금액·추후정산·총액까지)라 다른 관리자 화면과 같은
          max-w-6xl(1152px)에 넣으면 표가 잘린다. 실측으로 표가 요구하는 폭은 약 1545px다.
          이 화면만 넓힌다 — AdminNav 는 관리자 화면 25곳이 공용으로 쓰므로 건드리지 않았다. */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/25 pb-6">
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
          <AdminQuoteTable rows={rows} total={total} canDelete={isProAdminOrAbove(user)} />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            basePath="/admin"
            params={{ companyId }}
          />
        </div>
      </main>
    </div>
  );
}
