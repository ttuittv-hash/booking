import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { VenueOverviewView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "시설 개요 | 서울아레나",
};

/**
 * Your Stage 는 카테고리 라벨이므로 이 페이지의 타이틀은 "시설 개요" 다.
 * 이 페이지에만 두 공간을 나란히 놓는 비교표가 있고, 상세 수치는 각 내용 카테고리
 * 페이지의 공간 탭이 소유한다. 여기서 공간을 고르면 해당 탭으로 바로 이동한다.
 */
export default async function VenuePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueOverviewView />
      </main>
      <SiteFooter />
    </div>
  );
}
