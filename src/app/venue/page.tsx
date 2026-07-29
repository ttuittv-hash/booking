import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getVenueContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { VenueContentView } from "@/components/VenueContentView";

export const metadata: Metadata = {
  title: "SEOUL ARENA | 서울아레나",
};

export default async function VenuePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const content = getVenueContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueContentView content={content} />
      </main>
    </div>
  );
}
