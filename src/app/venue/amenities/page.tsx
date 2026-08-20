import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { isRentalOpen, OPEN_PHASE_LABEL } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, ButtonLink, DownloadIcon, ReleaseNotice } from "@/components/ui/kit";
import { VenueAmenitiesView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "부대시설 | 서울아레나",
};

export default async function VenueAmenitiesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue/amenities" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        {isRentalOpen() ? (
          <VenueAmenitiesView />
        ) : (
          <ReleaseNotice
            title="부대시설"
            releaseLabel={OPEN_PHASE_LABEL}
            lead="대기실·연습실 등 부속 공간의 실별 면적과 대관료 포함 범위는 9월 1일 대관 오픈과 함께 공개합니다. 부속실 실별 면적표는 시설소개자료 PDF에 먼저 실려 있습니다."
            alternatives={
              <>
                <ButtonLink href="/library" variant="primary">
                  시설소개자료 내려받기
                  <DownloadIcon />
                </ButtonLink>
                <ButtonLink href="/venue/features" variant="secondary">
                  무대 특장 보기
                  <ArrowRight />
                </ButtonLink>
              </>
            }
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
