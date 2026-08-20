import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listInquiriesPaged, normalizePage } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
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
import { Pagination } from "@/components/Pagination";
import { inquiryCategoryLabel } from "@/lib/inquiryCategories";

export const metadata: Metadata = {
  title: "1:1 문의 | 서울아레나",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기",
  ANSWERED: "답변 완료",
};

/** 상태 색은 kit 의 tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<string, "warn" | "good"> = {
  OPEN: "warn",
  ANSWERED: "good",
};

export default async function MyInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: inquiries, total, totalPages } = await listInquiriesPaged({ userId: user.id }, page);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/inquiries" currentUser={user} />
      <Breadcrumb
        items={[{ label: "마이페이지", href: "/mypage/process" }, { label: "1:1 문의" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            en="INQUIRIES"
            ko="1:1 문의"
            lead="FAQ에서 답을 찾지 못하셨다면 이곳에 문의를 남겨 주세요. 담당 부서가 확인 후 답변드립니다."
            actions={
              <ButtonLink href="/mypage/inquiries/new" variant="primary">
                문의 작성
              </ButtonLink>
            }
          />
        </Band>

        <Band tone="white" size="sm">
          {inquiries.length === 0 ? (
            <EmptyState
              title="아직 등록하신 문의가 없습니다"
              desc="궁금한 점이 있으시면 문의를 남겨 주세요."
              action={
                <span className="flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/mypage/inquiries/new" variant="primary">
                    문의 작성
                    <ArrowRight />
                  </ButtonLink>
                  <ButtonLink href="/faq" variant="secondary">
                    FAQ 먼저 보기
                  </ButtonLink>
                </span>
              }
            />
          ) : (
            <RowList>
              {inquiries.map((inquiry) => (
                <Row
                  key={inquiry.id}
                  href={`/mypage/inquiries/${inquiry.id}`}
                  lead={new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                  title={inquiry.title}
                  sub={
                    <span className="flex flex-wrap gap-x-4">
                      <span>{inquiryCategoryLabel(inquiry.category)}</span>
                      <span className="tabular-nums">관련 신청번호 {inquiry.quoteId ?? "—"}</span>
                    </span>
                  }
                  action={
                    <span className="flex items-center gap-3">
                      <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>
                        {STATUS_LABEL[inquiry.status]}
                      </Badge>
                      <ArrowRight className="text-muted transition-transform group-hover:translate-x-1" />
                    </span>
                  }
                />
              ))}
            </RowList>
          )}
          {inquiries.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              basePath="/mypage/inquiries"
            />
          )}
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
