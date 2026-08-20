import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAccessedUser } from "@/lib/auth";
import { listQuotesPaged, normalizePage } from "@/lib/db";
import { won } from "@/lib/format";
import { QUOTE_STATUS_DESC, QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/quoteStatus";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Pagination } from "@/components/Pagination";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  EmptyState,
  PageHead,
  Row,
  RowList,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 신청 현황 | 서울아레나",
};

/** HOST IT › 대관 신청 현황 — 제출한 신청의 심사 진행을 확인하는 목록 */
export default async function ApplicationProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  const user = await requireAccessedUser("/mypage/process");
  if (user.role !== "APPLICANT") redirect("/admin");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: quotes, total, totalPages } = await listQuotesPaged(
    user.companyId ? { companyId: user.companyId } : { applicantId: user.id },
    page,
  );

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/process" currentUser={user} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="APPLICATION STATUS"
            ko="대관 신청 현황"
            lead="제출하신 대관 신청의 심사 진행과 계약 이후 일정을 확인하실 수 있습니다."
            actions={
              <ButtonLink href="/apply?new=1" variant="primary">
                새 대관 신청
                <ArrowRight />
              </ButtonLink>
            }
          />
        </Band>

        <Band tone="white">
          {quotes.length === 0 ? (
            <EmptyState
              title="아직 제출하신 대관 신청이 없습니다"
              desc="대관 신청 화면에서 공간을 선택해 신청서를 작성해 주세요."
              action={
                <ButtonLink href="/apply" variant="primary">
                  대관 신청하기
                  <ArrowRight />
                </ButtonLink>
              }
            />
          ) : (
            <RowList>
              {quotes.map((q) => (
                <Row
                  key={q.id}
                  href={`/mypage/${q.id}`}
                  lead={new Date(q.createdAt).toLocaleDateString("ko-KR")}
                  title={q.id}
                  sub={`${q.selection.week.year}.${q.selection.week.month} ${q.selection.week.weekOfMonth}주차 · 예상 ${won(q.total)}`}
                  action={
                    <span className="flex items-center gap-3">
                      <span className="flex flex-col items-start gap-1 sm:items-end sm:text-right">
                        <Badge tone={QUOTE_STATUS_TONE[q.status]}>
                          {QUOTE_STATUS_LABEL[q.status]}
                        </Badge>
                        <span className="max-w-64 break-keep text-xs text-muted">
                          {QUOTE_STATUS_DESC[q.status]}
                        </span>
                      </span>
                      <ArrowRight className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                    </span>
                  }
                />
              ))}
            </RowList>
          )}
          {quotes.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              basePath="/mypage/process"
            />
          )}
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
