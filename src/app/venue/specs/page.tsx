import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { isRentalOpen, OPEN_PHASE_LABEL } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, ButtonLink, DownloadIcon, ReleaseNotice } from "@/components/ui/kit";
import { VenueSpecsView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "시설 제원 | 서울아레나",
};

export default async function VenueSpecsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue/specs" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        {isRentalOpen() ? (
          <VenueSpecsView />
        ) : (
          <ReleaseNotice
            title="시설 제원"
            releaseLabel={OPEN_PHASE_LABEL}
            lead="아레나와 중형공연장의 수용인원, 플로어·상부 시스템, 반입·하역, 전력 제원은 9월 1일 대관 오픈과 함께 공개합니다. 그전에 치수와 장비 사양을 확인하셔야 한다면 시설소개자료를 내려받아 보십시오."
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
