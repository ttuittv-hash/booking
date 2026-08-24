import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getScreenTextContent, listFaqs } from "@/lib/db";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState, PageHead, Prose } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "FAQ | 서울아레나",
};

export default async function FaqPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/faq");
  const currentUser = await getCurrentUser();

  const [faqs, screenText] = await Promise.all([listFaqs(), getScreenTextContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/faq" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="FAQ"
            ko="자주 묻는 질문"
            lead={<Prose text={screenText.faqLead} />}
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
                  대관 절차 보기
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
