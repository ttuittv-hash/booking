import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { Quote } from "@/lib/pricing/types";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  EmptyState,
  Label,
  Row,
  RowList,
} from "@/components/ui/kit";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

/** 상태 색은 kit 의 tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<Quote["status"], "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  const quotes = user.companyId ? listQuotes({ companyId: user.companyId }) : listQuotes({ applicantId: user.id });

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <Breadcrumb items={[{ label: "내 신청 내역" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Label className="mb-5 text-muted">My Applications</Label>
              <h1 className="type-kr-heading text-h3-m sm:text-h3">
                {user.name} 님의 신청 내역
              </h1>
              <p className="mt-5 text-s text-muted">
                {user.companyName ? `${user.companyName} · ` : ""}
                {user.email}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <ButtonLink href="/mypage/inquiries" variant="outline">
                1:1 문의
              </ButtonLink>
              <ButtonLink href="/apply?new=1" variant="primary">
                새 대관 신청
              </ButtonLink>
            </div>
          </div>
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
                        <dd>{q.contract ? won(q.contract.contractTotal) : "-"}</dd>
                      </div>
                      <div className="flex gap-2 sm:justify-end">
                        <dt>정산</dt>
                        <dd>{q.settlement ? won(q.settlement.finalTotal) : "-"}</dd>
                      </div>
                    </dl>
                  }
                  action={
                    <span className="flex items-center gap-3">
                      <Badge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                      <ArrowRight className="text-muted transition-transform group-hover:translate-x-1" />
                    </span>
                  }
                />
              ))}
            </RowList>
          )}
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
