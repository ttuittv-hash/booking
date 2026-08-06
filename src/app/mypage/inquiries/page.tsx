import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listInquiries } from "@/lib/db";
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

export default async function MyInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  const inquiries = listInquiries({ userId: user.id });

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <Breadcrumb
        items={[{ label: "내 신청 내역", href: "/mypage" }, { label: "1:1 문의" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Label className="mb-5 text-muted">Support</Label>
              <h1 className="type-kr-heading text-h3-m sm:text-h3">1:1 문의</h1>
              <p className="mt-5 text-s text-muted">
                대관 절차·요금·시설에 대해 문의하세요. 운영자가 확인 후 답변을 등록합니다.
              </p>
            </div>
            <div className="shrink-0">
              <ButtonLink href="/mypage/inquiries/new" variant="primary">
                문의하기
              </ButtonLink>
            </div>
          </div>
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
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
