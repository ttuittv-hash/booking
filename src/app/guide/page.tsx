import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getGuideContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { GuideContentView } from "@/components/GuideContentView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

export default async function GuidePage() {
  // 기획서 A15 — 비로그인 차단, 로그인하면 승인 전에도 열람 가능
  await requireAccess("/guide");
  const currentUser = await getCurrentUser();

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
      <Breadcrumb items={[{ label: "Book It" }]} />
      <main className="flex flex-1 flex-col">
        <GuideContentView content={content} />
      </main>
      <SiteFooter />
    </div>
  );
}
