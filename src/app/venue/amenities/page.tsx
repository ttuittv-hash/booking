import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
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
        <VenueAmenitiesView content={getVenueContent()} />
      </main>
      <SiteFooter />
    </div>
  );
}
