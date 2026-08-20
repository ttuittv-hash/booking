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
  PageHeading,
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
        items={[{ label: "내 신청 내역", href: "/mypage" }, { label: "1:1 문의" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="1:1 문의"
            lead="FAQ에서 답을 찾지 못하셨다면 이곳에 문의를 남겨 주세요. 문의 유형을 선택해 주시면 담당 부서가 확인해 답변드립니다. 답변은 이 페이지에서 확인하실 수 있고, 등록하신 이메일로도 알려 드립니다."
            actions={
              <ButtonLink href="/mypage/inquiries/new" variant="primary">
                문의하기
              </ButtonLink>
            }
          />
        </Band>

        <Band tone="white" size="sm">
          {inquiries.length === 0 ? (
            <EmptyState
              title="아직 등록하신 문의가 없습니다"
              desc="궁금한 점이 있으시면 문의를 남겨 주세요. 접수 일정이나 요금처럼 여러 대관사에 공통으로 해당하는 내용은 공지사항과 FAQ에 먼저 반영합니다."
              action={
                <span className="flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/mypage/inquiries/new" variant="primary">
                    문의 작성하기
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
                      <span className="tabular-nums">
                        관련 신청번호 {inquiry.quoteId ?? "—"}
                      </span>
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
