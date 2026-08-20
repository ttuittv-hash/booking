import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInquiryById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, ButtonLink, EmptyState, PageHeading } from "@/components/ui/kit";
import { inquiryCategoryLabel } from "@/lib/inquiryCategories";

export default async function MyInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (user.role === "ADMIN") redirect(`/admin/inquiries/${id}`);

  const inquiry = await getInquiryById(id);
  if (!inquiry) notFound();
  if (inquiry.userId !== user.id) notFound();

  const answered = inquiry.status === "ANSWERED";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/inquiries" currentUser={user} />
      {/* 3뎁스 — 부모(1:1 문의)를 포함해 2개 */}
      <Breadcrumb items={[{ label: "1:1 문의", href: "/mypage/inquiries" }, { label: "상세" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title={inquiry.title}
            lead={
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <Badge>{inquiryCategoryLabel(inquiry.category)}</Badge>
                <span className="tabular-nums">
                  {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                </span>
                {inquiry.quoteId && (
                  <span className="tabular-nums">관련 신청번호 {inquiry.quoteId}</span>
                )}
              </span>
            }
            actions={
              <Badge tone={answered ? "good" : "warn"}>
                {answered ? "답변 완료" : "답변 대기"}
              </Badge>
            }
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-3xl border-t border-border/25 pt-6">
            <h2 className="type-kr-heading mb-4 text-h6-m sm:text-h6">문의 내용</h2>
            <p className="whitespace-pre-wrap text-s leading-7">{inquiry.content}</p>
          </div>
        </Band>

        {inquiry.answer ? (
          <Band tone="accent" size="sm">
            <div className="max-w-3xl border-t border-border/25 pt-6">
              <h2 className="type-kr-heading mb-4 text-h6-m sm:text-h6">운영자 답변</h2>
              <p className="whitespace-pre-wrap text-s leading-7">{inquiry.answer}</p>
              {inquiry.answeredAt && (
                <p className="mt-5 text-xs tabular-nums">
                  {new Date(inquiry.answeredAt).toLocaleString("ko-KR")}
                </p>
              )}
              <p className="mt-6 border-t border-border/25 pt-3 text-xs leading-5">
                답변 내용에 더 확인이 필요하시면 이 문의를 이어서 추가 문의로 남겨 주세요.
              </p>
            </div>
          </Band>
        ) : (
          <Band tone="light" size="sm">
            {/* 이유 없이 비활성만 두면 같은 문의가 중복 등록된다 — 왜 수정할 수 없는지 함께 적는다 */}
            <EmptyState
              title="담당 부서가 확인하고 있습니다"
              desc="답변이 등록되면 이메일로 알려 드립니다. 등록 후에는 문의 내용을 수정하실 수 없으므로, 덧붙일 내용이 있으시면 새 문의로 남겨 주세요."
              action={
                <ButtonLink href="/mypage/inquiries/new" variant="secondary">
                  새 문의 작성
                </ButtonLink>
              }
            />
          </Band>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
