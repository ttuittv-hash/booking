import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getGuideContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { GuideContentView } from "@/components/GuideContentView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

export default async function GuidePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const content = getGuideContent();

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
