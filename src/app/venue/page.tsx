import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { VenueOverviewView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "시설 개요 | 서울아레나",
};

/** Your Stage 는 카테고리 라벨이므로 이 페이지의 타이틀은 "시설 개요" 다. */
export default async function VenuePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const rawContent = await getVenueContent();
  const content = {
    ...rawContent,
    intro: sanitizeRichText(rawContent.intro),
    overviewIntro: sanitizeRichText(rawContent.overviewIntro),
    specsIntro: sanitizeRichText(rawContent.specsIntro),
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueOverviewView content={content} />
      </main>
      <SiteFooter />
    </div>
  );
}
