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
            lead="대관 절차·요금·시설에 대해 문의하세요. 운영자가 확인 후 답변을 등록합니다."
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
              title="등록된 문의가 없습니다"
              desc="궁금한 점을 남기면 운영자가 확인 후 답변합니다."
              action={
                <ButtonLink href="/mypage/inquiries/new" variant="primary">
                  문의하기
                  <ArrowRight />
                </ButtonLink>
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
