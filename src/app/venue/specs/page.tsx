import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
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
        <VenueSpecsView content={getVenueContent()} />
      </main>
      <SiteFooter />
    </div>
  );
}
