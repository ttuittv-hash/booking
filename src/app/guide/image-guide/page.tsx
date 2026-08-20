import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "이미지 가이드 | 서울아레나",
};

/** Book It 은 카테고리 라벨이므로 페이지 타이틀은 "이미지 가이드", 브레드크럼 없음. */
export default async function GuideImagePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide/image-guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="이미지 가이드"
            lead="공연 홍보물·로고 사용 등에 필요한 서울아레나 시설 사진과 이미지 사용 가이드를 이곳에서 확인할 수 있도록 준비 중입니다."
          />
        </Band>

        <Band tone="white">
          <EmptyState
            title="시설 이미지 및 사용 가이드"
            desc="자료 준비 중입니다. 홍보물에 사용할 시설 이미지는 대관 담당자를 통해 받을 수 있습니다."
            action={
              <ButtonLink href="/venue/amenities" variant="secondary">
                부대시설 보기
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
