import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInquiryByToken } from "@/lib/db";
import { inquiryCategoryLabel } from "@/lib/inquiryCategories";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, ButtonLink, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "1:1 문의",
  // 링크를 아는 사람만 여는 화면이라 검색에 걸리면 안 된다.
  robots: { index: false, follow: false },
};

/**
 * 비회원 문의 조회 (2026-09-02).
 *
 * 계정이 없으니 로그인으로는 답변을 볼 수 없다. 접수할 때 만든 열쇠가 든 링크(답변
 * 안내 메일에 담긴다)로만 그 문의 하나를 연다. 열쇠가 없거나 틀리면 404 다 —
 * "그런 문의는 있는데 열쇠가 틀렸다"고 알려 주면 문의 번호를 훑을 수 있게 된다.
 */
export default async function GuestInquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const inquiry = await getInquiryByToken(id, (t ?? "").trim());
  if (!inquiry) notFound();

  const answered = inquiry.status === "ANSWERED";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/inquiry" currentUser={null} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            en="INQUIRY"
            ko={inquiry.title}
            lead={
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted">
                <Badge tone={answered ? "good" : "warn"}>
                  {answered ? "답변 완료" : "답변 대기"}
                </Badge>
                {inquiry.category && <span>{inquiryCategoryLabel(inquiry.category)}</span>}
              </span>
            }
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-2xl">
            <h2 className="type-kr-heading text-h6-m">문의 내용</h2>
            <p className="mt-3 whitespace-pre-wrap break-keep text-s leading-7">
              {inquiry.content}
            </p>

            <div className="mt-10 border-t border-border/25 pt-8">
              <h2 className="type-kr-heading text-h6-m">답변</h2>
              {answered && inquiry.answer ? (
                <p className="mt-3 whitespace-pre-wrap break-keep text-s leading-7">
                  {inquiry.answer}
                </p>
              ) : (
                <p className="mt-3 break-keep text-s leading-7 text-muted">
                  아직 답변이 등록되지 않았습니다. 답변이 등록되면 남겨 주신 이메일과 카카오
                  알림톡으로 알려 드립니다.
                </p>
              )}
            </div>

            <div className="mt-10 border-t border-border/25 pt-8">
              <ButtonLink href="/inquiry" variant="secondary">
                새 문의 남기기
              </ButtonLink>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
