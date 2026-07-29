import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, listWeekBlocks, listWeekDemand } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default async function ApplyPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const [rateTable, weekDemand, weekBlocks] = await Promise.all([
    getCurrentRateTable(),
    Promise.resolve(listWeekDemand()),
    Promise.resolve(listWeekBlocks()),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />
      <WizardShell rateTable={rateTable} currentUser={currentUser} weekDemand={weekDemand} weekBlocks={weekBlocks} />
    </div>
  );
}
