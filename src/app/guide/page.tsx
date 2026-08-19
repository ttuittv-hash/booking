import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getGuideContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { GuideContentView } from "@/components/GuideContentView";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

export default async function GuidePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const rawContent = await getGuideContent();
  const content = {
    ...rawContent,
    intro: sanitizeRichText(rawContent.intro),
    packageIntro: sanitizeRichText(rawContent.packageIntro),
    rulesIntro: sanitizeRichText(rawContent.rulesIntro),
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <GuideContentView content={content} />
      </main>

      <PublicFooter />
    </div>
  );
}
