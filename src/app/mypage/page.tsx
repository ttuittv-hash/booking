import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotesPaged, normalizePage } from "@/lib/db";
import { won } from "@/lib/format";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_NEXT, QUOTE_STATUS_TONE } from "@/lib/quoteStatus";
import { isRentalOpen, OPEN_PHASE_LABEL } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  EmptyState,
  PageHeading,
  ReleaseNotice,
  Row,
  RowList,
} from "@/components/ui/kit";
import { Pagination } from "@/components/Pagination";

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  // 내 신청 내역은 9/1 대관오픈 범위다. 그 전에는 라우트를 살리고 안내 화면으로 대체한다.
  if (!isRentalOpen()) {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/mypage" currentUser={user} />
        <main className="flex flex-1 flex-col">
          <ReleaseNotice
            title="내 신청 내역"
            releaseLabel={OPEN_PHASE_LABEL}
            lead="제출하신 대관 신청의 심사 진행과 계약 이후 일정을 확인하는 화면입니다. 대관 신청 접수가 시작되는 9월 1일에 함께 열립니다."
            alternatives={
              <>
                <ButtonLink href="/apply" variant="primary">
                  대관 신청 안내
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/mypage/inquiries" variant="secondary">
                  1:1 문의
                </ButtonLink>
              </>
            }
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: quotes, total, totalPages } = await listQuotesPaged(
    user.companyId ? { companyId: user.companyId } : { applicantId: user.id },
    page,
  );

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "내 신청 내역" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title={`${user.name} 님의 신청 내역`}
            lead={`${user.companyName ? `${user.companyName} · ` : ""}${user.email}`}
            actions={
              <>
                <ButtonLink href="/mypage/inquiries" variant="secondary">
                  1:1 문의
                </ButtonLink>
                <ButtonLink href="/apply?new=1" variant="primary">
                  새 대관 신청
                </ButtonLink>
              </>
            }
          />
        </Band>

        <Band tone="white" size="sm">
          {quotes.length === 0 ? (
            <EmptyState
              title="아직 신청 내역이 없습니다"
              desc="예상 관객 규모와 일정을 입력하면 예상 대관료를 바로 확인할 수 있습니다."
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
                  lead={new Date(q.createdAt).toLocaleString("ko-KR")}
                  title={q.id}
                  sub={`${q.selection.week.year}.${q.selection.week.month} ${q.selection.week.weekOfMonth}주차`}
                  meta={
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 tabular-nums sm:block sm:text-right">
                      <div className="flex gap-2 sm:justify-end">
                        <dt>신청 예상</dt>
                        <dd className="font-bold text-foreground">{won(q.total)}</dd>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <dt>계약</dt>
                        <dd>{q.contract ? won(q.contract.contractTotal) : "—"}</dd>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <dt>정산</dt>
                        <dd>{q.settlement ? won(q.settlement.finalTotal) : "—"}</dd>
                      </div>
                    </dl>
                  }
                  action={
                    <span className="flex items-center gap-3">
                      {/* 상태 배지 아래 "다음에 하실 일" 한 줄 — 상태만 보여 주면
                          대관사가 무엇을 기다려야 하는지 알 수 없다 */}
                      <span className="flex flex-col items-end gap-1 text-right">
                        <Badge tone={QUOTE_STATUS_TONE[q.status]}>
                          {QUOTE_STATUS_LABEL[q.status]}
                        </Badge>
                        <span className="max-w-56 break-keep text-xs text-muted">
                          {QUOTE_STATUS_NEXT[q.status]}
                        </span>
                      </span>
                      <ArrowRight className="text-muted transition-transform group-hover:translate-x-1" />
                    </span>
                  }
                />
              ))}
            </RowList>
          )}
          {quotes.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} basePath="/mypage" />
          )}
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
