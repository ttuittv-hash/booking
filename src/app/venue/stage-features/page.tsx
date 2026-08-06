import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { VenueStageFeaturesView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "무대 특장 | 서울아레나",
};

export default async function VenueStageFeaturesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue/stage-features" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueStageFeaturesView content={getVenueContent()} />
      </main>
      <SiteFooter />
    </div>
  );
}
