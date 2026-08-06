import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInquiryById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, EmptyState, Label } from "@/components/ui/kit";

export default async function MyInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (user.role === "ADMIN") redirect(`/admin/inquiries/${id}`);

  const inquiry = getInquiryById(id);
  if (!inquiry) notFound();
  if (inquiry.userId !== user.id) notFound();

  const answered = inquiry.status === "ANSWERED";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <Breadcrumb
        items={[
          { label: "내 신청 내역", href: "/mypage" },
          { label: "1:1 문의", href: "/mypage/inquiries" },
          { label: inquiry.title },
        ]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <Label className="mb-5 text-muted">Support</Label>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="type-kr-heading text-h4-m sm:text-h4">{inquiry.title}</h1>
            <Badge tone={answered ? "good" : "warn"}>
              {answered ? "답변 완료" : "답변 대기"}
            </Badge>
          </div>
          <p className="mt-5 text-xs tabular-nums text-muted">
            {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
          </p>
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-3xl border-t border-border/25 pt-6">
            <Label className="mb-4 text-muted">문의 내용</Label>
            <p className="whitespace-pre-wrap text-s leading-7">{inquiry.content}</p>
          </div>
        </Band>

        {inquiry.answer ? (
          <Band tone="accent" size="sm">
            <div className="max-w-3xl border-t border-on-accent/25 pt-6">
              <Label className="mb-4">운영자 답변</Label>
              <p className="whitespace-pre-wrap text-s leading-7">{inquiry.answer}</p>
              {inquiry.answeredAt && (
                <p className="mt-5 text-xs tabular-nums">
                  {new Date(inquiry.answeredAt).toLocaleString("ko-KR")}
                </p>
              )}
            </div>
          </Band>
        ) : (
          <Band tone="light" size="sm">
            <EmptyState
              title="아직 답변이 등록되지 않았습니다"
              desc="운영자가 확인한 뒤 이 화면에 답변을 등록합니다."
            />
          </Band>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
