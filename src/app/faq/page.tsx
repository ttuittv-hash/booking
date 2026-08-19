import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { listFaqs } from "@/lib/db";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, CTABand, EmptyState } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "FAQ | 서울아레나",
};

export default async function FaqPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/faq");
  const currentUser = await getCurrentUser();

  const faqs = await listFaqs();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/faq" currentUser={currentUser} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "자주 묻는 질문" }]} />

      <main className="flex flex-1 flex-col">
        {/* Figma FAQ / 1 — 좌: 제목 + 문의 버튼 / 우: 아코디언 */}
        <Band tone="light" size="lg">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h1 className="type-kr-heading text-h2-m sm:text-h2">자주 묻는 질문</h1>
              <p className="mt-6 text-m text-muted">
                신청부터 심의, 계약·정산, 공연 당일까지 자주 묻는 질문을 단계별로 모았습니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/mypage/inquiries" variant="primary">
                  1:1 문의
                  <ArrowRight />
                </ButtonLink>
              </div>
            </div>

            <div>
              {faqs.length === 0 ? (
                <EmptyState
                  title="등록된 FAQ가 없습니다"
                  desc="자주 묻는 질문이 등록되면 진행 단계별로 이곳에 표시됩니다."
                  action={
                    <ButtonLink href="/guide" variant="secondary">
                      대관 안내 보기
                    </ButtonLink>
                  }
                />
              ) : (
                <FaqAccordion faqs={faqs} />
              )}
            </div>
          </div>
        </Band>

        <CTABand
          title="답변이 필요한 내용이 남았나요?"
          lead="운영자에게 직접 문의하거나, 최신 공지에서 진행 중인 대관 공고를 확인하세요."
          actions={
            <>
              <ButtonLink href="/mypage/inquiries" variant="primary">
                1:1 문의하기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/notices" variant="secondary">
                공지사항 확인
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
