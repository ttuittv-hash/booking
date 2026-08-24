import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotesPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { won } from "@/lib/format";
import type { Quote } from "@/lib/pricing/types";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/quoteStatus";
import { MyPageIdentity, MyPageShell } from "@/components/mypage/MyPageShell";
import { DataTable, type Column } from "@/components/mypage/DataTable";
import { ArrowRight, Badge, ButtonLink } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 진행 내역 | 서울아레나",
};

const COLUMNS: Column[] = [
  { key: "id", label: "신청번호" },
  { key: "event", label: "공연명" },
  { key: "week", label: "주차" },
  { key: "estimate", label: "예상금액", align: "right" },
  { key: "contract", label: "계약금액", align: "right" },
  { key: "settlement", label: "정산금액", align: "right" },
  { key: "status", label: "상태" },
  { key: "detail", label: "상세 보기", srOnly: true, align: "right" },
];

/** 주차 표기 — 동시 대관은 아레나 주차와 중형 일수를 함께 적는다 */
function weekLabel(q: Quote) {
  const { selection: s } = q;
  const arena = `${s.week.year}.${s.week.month} ${s.week.weekOfMonth}주차`;
  const midDays = Object.keys(s.midHallDays).length;
  if (s.bookingMode === "SIMULTANEOUS") {
    return (
      <>
        아레나 {arena}
        <br />
        <span className="text-muted">중형 {midDays}일</span>
      </>
    );
  }
  if (s.venueId === "medium-hall") return `중형 ${midDays}일`;
  return arena;
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const {
    items: quotes,
    total,
    totalPages,
  } = await listQuotesPaged(
    user.companyId ? { companyId: user.companyId } : { applicantId: user.id },
    page,
  );

  return (
    <MyPageShell
      user={user}
      active="/mypage"
      en="BOOKING STATUS"
      ko="대관 진행 내역"
      lead={<MyPageIdentity user={user} />}
      actions={
        <ButtonLink href="/apply" variant="primary">
          새 대관 신청
          <ArrowRight />
        </ButtonLink>
      }
    >
      <DataTable
        columns={COLUMNS}
        minWidth="52rem"
        empty={
          <>
            아직 신청 내역이 없습니다.{" "}
            <Link href="/apply" className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4 sm:min-h-0">
              대관 신청하기
            </Link>
          </>
        }
        rows={quotes.map((q) => ({
          id: q.id,
          cells: {
            id: <span className="font-bold">{q.id}</span>,
            event: q.selection.performanceInfo.eventName || "—",
            week: weekLabel(q),
            estimate: won(q.total),
            contract: q.contract ? won(q.contract.contractTotal) : "—",
            settlement: q.settlement ? won(q.settlement.finalTotal) : "—",
            status: <Badge tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge>,
            detail: (
              <span className="whitespace-nowrap text-s font-bold">
                <Link href={`/mypage/${q.id}`} className="underline underline-offset-4 hover:text-accent">
                  상세
                </Link>
                {/* 심사가 시작되면(review 기록 생김) 신청자가 직접 수정할 수 없다 — 상세
                    화면과 같은 조건("신청 내용 수정" 링크, 2026-08-22)을 목록에서도 바로
                    눌러 들어갈 수 있게 한다. */}
                {q.status === "ESTIMATE" && !q.review && (
                  <>
                    {" · "}
                    <Link href={`/apply/edit/${q.id}`} className="underline underline-offset-4 hover:text-accent">
                      수정
                    </Link>
                  </>
                )}
              </span>
            ),
          },
        }))}
      />
      <Pagination page={page} totalPages={totalPages} total={total} basePath="/mypage" />
    </MyPageShell>
  );
}
