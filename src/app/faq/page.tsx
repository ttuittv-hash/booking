import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listFaqs } from "@/lib/db";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, ButtonLink, EmptyState, Label } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "FAQ | 서울아레나",
};

export default async function FaqPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const faqs = listFaqs();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/faq" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "Know It" }, { label: "FAQ" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <Label className="mb-6 text-muted">Know It</Label>
          <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">FAQ</h1>
          <p className="mt-8 max-w-3xl text-m text-muted">
            신청부터 심의, 계약·정산, 공연 당일까지 자주 묻는 질문을 단계별로 모았습니다. 찾는 답이
            없으면 운영자에게 바로 문의하세요.
          </p>
        </Band>

        <Band tone="white" size="md">
          {faqs.length === 0 ? (
            <EmptyState
              title="등록된 FAQ가 없습니다"
              desc="자주 묻는 질문이 등록되면 진행 단계별로 이곳에 표시됩니다."
              action={
                <ButtonLink href="/guide" variant="outline">
                  대관 안내 보기
                </ButtonLink>
              }
            />
          ) : (
            <FaqAccordion faqs={faqs} />
          )}
        </Band>

        <Band tone="accent" size="sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>Ask Us</Label>
              <p className="type-kr-heading mt-3 text-h5-m sm:text-h5">
                답변이 필요한 내용이 남았나요?
              </p>
            </div>
            <ButtonLink href="/notices" variant="outline" className="self-start sm:self-auto">
              공지사항 확인
            </ButtonLink>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
