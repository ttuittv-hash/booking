import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { VenueSpecsView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "시설 제원 | 서울아레나",
};

export default async function VenueSpecsPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/venue/specs");
  const currentUser = await getCurrentUser();

  // 관리자 리치텍스트는 화면에 넣기 전에 정화한다 (XSS)
  const rawContent = await getVenueContent();
  const content = {
    ...rawContent,
    intro: sanitizeRichText(rawContent.intro),
    overviewIntro: sanitizeRichText(rawContent.overviewIntro),
    specsIntro: sanitizeRichText(rawContent.specsIntro),
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue/specs" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueSpecsView content={content} />
      </main>
      <SiteFooter />
    </div>
  );
}
