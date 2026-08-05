import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, EmptyState, Label } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "이미지 가이드 | 서울아레나",
};

export default async function GuideImagePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "Book It", href: "/guide" }, { label: "이미지 가이드" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <Label className="mb-6 text-muted">Book It</Label>
          <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Book It</h1>
          <p className="type-kr-heading mt-6 text-h4-m sm:text-h4">이미지 가이드</p>
          <p className="mt-8 max-w-3xl text-m text-muted">
            공연 홍보물·로고 사용 등에 필요한 서울아레나 시설 사진과 이미지 사용 가이드를
            이곳에서 확인할 수 있도록 준비 중입니다.
          </p>
        </Band>

        <Band tone="white">
          <EmptyState
            title="시설 이미지 및 사용 가이드"
            desc="자료 준비 중입니다. 홍보물에 사용할 시설 이미지는 대관 담당자를 통해 받을 수 있습니다."
            action={
              <ButtonLink href="/venue#amenities" variant="outline">
                공연장 소개 보기
                <ArrowRight />
              </ButtonLink>
            }
          />

          <div className="mt-10">
            <ButtonLink href="/guide" variant="ghost">
              대관 안내로 돌아가기
            </ButtonLink>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
