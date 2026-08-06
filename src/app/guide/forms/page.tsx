import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 양식함 | 서울아레나",
};

export default async function GuideFormsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "Book It", href: "/guide" }, { label: "대관 양식함" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Book It</h1>
          <p className="type-kr-heading mt-6 text-h4-m sm:text-h4">대관 양식함</p>
          <p className="mt-8 max-w-3xl text-m text-muted">
            대관 신청·계약·공연 준비 과정에서 필요한 각종 서식(계획서, 안전관리계획서, 반입반출
            신청서 등)을 이곳에서 내려받을 수 있도록 준비 중입니다.
          </p>
        </Band>

        <Band tone="white">
          <EmptyState
            title="대관 관련 서식 자료"
            desc="자료 준비 중입니다. 필요한 서식은 대관 담당자를 통해 받을 수 있습니다."
            action={
              <ButtonLink href="/guide#process" variant="secondary">
                대관 절차 확인
                <ArrowRight />
              </ButtonLink>
            }
          />

          <div className="mt-10">
            <ButtonLink href="/guide" variant="tertiary">
              대관 안내로 돌아가기
            </ButtonLink>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
