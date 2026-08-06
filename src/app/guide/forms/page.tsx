import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 양식함 | 서울아레나",
};

/**
 * Book It 은 카테고리 라벨일 뿐 페이지가 아니다.
 * 따라서 이 페이지의 타이틀은 "대관 양식함" 이고, 브레드크럼도 두지 않는다
 * (2뎁스이며, 링크할 상위 페이지가 존재하지 않는다).
 */
export default async function GuideFormsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide/forms" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="대관 양식함"
            lead="대관 신청·계약·공연 준비 과정에서 필요한 각종 서식(계획서, 안전관리계획서, 반입반출 신청서 등)을 이곳에서 내려받을 수 있도록 준비 중입니다."
          />
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
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
