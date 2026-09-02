import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getScreenTextContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead, Prose, SpecTable } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "오시는길",
};

/**
 * 오시는길 — 아직 확정 내용이 없는 자리다. 메뉴에는 올리지 않고,
 * 주소·교통·주차가 확정되면 채운다.
 */
export default async function LocationPage() {
  const [currentUser, screenText] = await Promise.all([getCurrentUser(), getScreenTextContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/location" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="LOCATION"
            ko="오시는길"
            lead={<Prose text={screenText.locationLead} />}
          />
        </Band>

        <Band tone="light">
          <SpecTable
            rows={screenText.locationRows.map((r) => [r.label, r.value] as [string, string])}
          />
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
