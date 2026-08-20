import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listFaqs } from "@/lib/db";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "FAQ | 서울아레나",
};

export default async function FaqPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const faqs = await listFaqs();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/faq" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="FAQ"
            ko="자주 묻는 질문"
            lead="신청부터 심의, 계약·정산, 공연 당일까지 자주 묻는 질문을 단계별로 모았습니다. 찾는 내용이 없다면 1:1 문의로 남겨 주세요."
            actions={
              <ButtonLink href="/mypage/inquiries/new" variant="primary">
                문의 작성
                <ArrowRight />
              </ButtonLink>
            }
          />
        </Band>

        <Band tone="white">
          {faqs.length === 0 ? (
            <EmptyState
              title="등록된 질문이 없습니다"
              desc="자주 묻는 질문이 등록되면 이곳에 표시됩니다."
              action={
                <ButtonLink href="/guide" variant="secondary">
                  대관 안내 보기
                </ButtonLink>
              }
            />
          ) : (
            <FaqAccordion faqs={faqs} />
          )}
        </Band>

      </main>

      <SiteFooter />
    </div>
  );
}
